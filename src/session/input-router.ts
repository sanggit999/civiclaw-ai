import { ILlmProvider } from '../rag/types.js';
import { removeVietnameseDiacritics } from '../search/gap-queue.js';
import {
  classifyIntent,
  formatPersonalizedGreeting,
  formatPersonalizedIdentity,
  formatPersonalizedThanks,
} from './intent-router.js';
import {
  ConversationPersona,
  DEFAULT_CONVERSATION_PERSONA,
  resolveSessionPersona,
  sanitizePronoun,
} from './persona.js';
import { ChatMessage, IQueryCondenser } from './types.js';

export type InputRouteIntent =
  | 'GREETING'
  | 'THANKS'
  | 'BOT_IDENTITY'
  | 'TOPIC_SWITCH_OPEN'
  | 'OUT_OF_SCOPE'
  | 'LEGAL_QUERY';

export interface InputRouteAnalysis {
  intent: InputRouteIntent;
  persona: ConversationPersona;
  isTopicShift: boolean;
  isFollowUp: boolean;
  standaloneQuery: string;
  directReply?: string;
  outOfScopeTopic?: string;
  usedLlm: boolean;
}

export interface LlmInputRouterOptions {
  promptTemplate?: string;
  maxHistoryTurns?: number;
}

export interface IInputRouter {
  route(
    query: string,
    history: ChatMessage[],
    defaultPersona?: Partial<ConversationPersona>,
    condenser?: IQueryCondenser
  ): Promise<InputRouteAnalysis>;
}

const VALID_INTENTS: Set<InputRouteIntent> = new Set([
  'GREETING',
  'THANKS',
  'BOT_IDENTITY',
  'TOPIC_SWITCH_OPEN',
  'OUT_OF_SCOPE',
  'LEGAL_QUERY',
]);

/**
 * Các câu xã giao cực ngắn, hiển nhiên (đã bỏ dấu) để đi fast-path < 1ms, tiết kiệm free quota API
 */
const TRIVIAL_SOCIAL_FOLDED_PATTERN =
  /^(?:hi|hello|alo|ok|thanks|thank\s+you|xin\s+chao|chao\s+ban|cam\s+on|tam\s+biet|bye)[\s!.,?~]*$/i;

const DEFAULT_ROUTER_HISTORY_TURNS = 4;

export const DEFAULT_INPUT_ROUTER_PROMPT = `Bạn là bộ định tuyến đầu vào (Single-Pass Input Router) của Trợ lý Pháp lý CivicLaw AI (5 lĩnh vực: Giao thông đường bộ NĐ 168/2024 & Luật 36/2024, Lao động 2019, BHXH 2024, Nhà ở 2023, Dân sự 2015).

NHIỆM VỤ: Phân tích tin nhắn mới nhất của người dùng (kể cả tiếng Việt không dấu, viết tắt teencode như "ko", "bhxh", "bn", tiếng lóng như "đội nón", "bị thổi") cùng lịch sử chat gần đây, rồi trả về DUY NHẤT MỘT JSON OBJECT hợp lệ theo đúng schema sau:
{
  "intent": "GREETING" | "THANKS" | "BOT_IDENTITY" | "TOPIC_SWITCH_OPEN" | "OUT_OF_SCOPE" | "LEGAL_QUERY",
  "assistantPronoun": "Anh" | "Chị" | "Em" | "Mình" | ...,
  "userPronoun": "em" | "anh" | "chị" | "Bạn" | ...,
  "isTopicShift": boolean,
  "isFollowUp": boolean,
  "standaloneQuery": "string",
  "outOfScopeTopic": "string hoặc null",
  "directReply": "string hoặc null"
}

QUY TẮC BẮT BUỘC:
1. XƯNG HÔ: assistantPronoun là cách Bot tự xưng, userPronoun là cách Bot gọi người dùng.
   - Nếu user tự xưng "em" và gọi bot "anh/chị" -> assistantPronoun: "Anh" (hoặc "Chị"), userPronoun: "em".
   - Nếu user tự xưng "em" nhưng không gọi vai cụ thể (vd: "cho em hỏi...") -> assistantPronoun: "Mình" (hoặc "Anh"), userPronoun: "em" (tuyệt đối KHÔNG đảo thành assistantPronoun="Em", userPronoun="anh").
   - Nếu user không xưng hô rõ -> dùng cặp mặc định được cung cấp.
2. "GREETING" | "THANKS" | "BOT_IDENTITY": Chỉ dùng cho câu chào hỏi, cảm ơn, hỏi bot là ai. Khi đó đặt "directReply" ngắn gọn, tự nhiên theo đúng cặp "assistantPronoun" - "userPronoun".
3. "TOPIC_SWITCH_OPEN": Khi người dùng chỉ nói muốn đổi ý / tìm chủ đề khác mà CHƯA nêu lĩnh vực hay câu hỏi cụ thể.
4. "OUT_OF_SCOPE": Khi hỏi ngoài 5 lĩnh vực (vd: Hình sự, Thuế, Đất đai chuyên sâu, Hôn nhân gia đình), ghi tên lĩnh vực vào "outOfScopeTopic".
5. "LEGAL_QUERY":
   - BẮT BUỘC đặt "directReply": null (tuyệt đối KHÔNG tự trả lời kiến thức pháp luật ở đây).
   - "standaloneQuery": Khôi phục ĐẦY ĐỦ DẤU TIẾNG VIỆT; nếu "isFollowUp": true thì ghép chủ ngữ/hành vi từ lịch sử; nếu "isTopicShift": true thì tách sạch chủ đề cũ; LƯỢC BỎ từ xưng hô và từ đệm hỏi dư thừa ("tối đa", "là bao lâu", "bao nhiêu tiền", "như thế nào", "theo quy định pháp luật") để tạo cụm từ khóa THUẬT NGỮ VĂN BẢN LUẬT CÔ ĐỌNG:
     * "vượt đèn đỏ" / "vượt đèn vàng" -> "không chấp hành hiệu lệnh của đèn tín hiệu giao thông"
     * "quên đội nón" -> "không đội mũ bảo hiểm"
     * "xe máy" -> "xe mô tô"
     * "thử việc bao lâu" / "lương thử việc tối đa bao lâu" -> "thời gian thử việc" (nếu hỏi thời gian) hoặc "tiền lương thử việc" (nếu hỏi mức lương)
     * Ví dụ: "vuot den do xe may phat bn" -> "xe mô tô không chấp hành hiệu lệnh của đèn tín hiệu giao thông phạt tiền".
6. CHỈ TRẢ VỀ JSON HỢP LỆ, không giải thích thêm.`;

function extractJsonObject(rawText: string): Record<string, unknown> | null {
  const cleaned = (rawText || '').replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Bộ định tuyến đầu vào 1 lượt bằng LLM (Single-Pass LLM Input Router)
 * - Hiểu tiếng Việt không dấu, viết tắt, tiếng lóng, xưng hô và Topic Shift trong 1 lần gọi LLM.
 * - Tự động fallback an toàn về Fast Rule không dấu khi hết free quota (429), offline hoặc JSON lỗi.
 */
export class SinglePassLlmInputRouter implements IInputRouter {
  private promptTemplate: string;
  private maxHistoryTurns: number;

  constructor(
    private llmProvider?: ILlmProvider,
    options?: LlmInputRouterOptions
  ) {
    this.promptTemplate = options?.promptTemplate || DEFAULT_INPUT_ROUTER_PROMPT;
    this.maxHistoryTurns = options?.maxHistoryTurns ?? DEFAULT_ROUTER_HISTORY_TURNS;
  }

  private async fallbackLocalRoute(
    query: string,
    history: ChatMessage[],
    defaultPersona?: Partial<ConversationPersona>,
    condenser?: IQueryCondenser
  ): Promise<InputRouteAnalysis> {
    const sessionPersona = resolveSessionPersona(query, history, defaultPersona);
    const intentResult = classifyIntent(query, defaultPersona);

    if (intentResult.directAnswer) {
      let directReply = intentResult.directAnswer;
      if (!intentResult.persona?.detectedFromInput && sessionPersona.detectedFromInput) {
        if (intentResult.intent === 'GREETING') directReply = formatPersonalizedGreeting(sessionPersona);
        else if (intentResult.intent === 'THANKS') directReply = formatPersonalizedThanks(sessionPersona);
        else if (intentResult.intent === 'BOT_IDENTITY') directReply = formatPersonalizedIdentity(sessionPersona);
      }
      return {
        intent: intentResult.intent,
        persona: sessionPersona,
        isTopicShift: false,
        isFollowUp: false,
        standaloneQuery: query,
        directReply,
        usedLlm: false,
      };
    }

    let standaloneQuery = query;
    let isFollowUp = false;
    if (condenser) {
      const condensed = await condenser.condenseQuery(query, history);
      standaloneQuery = condensed.standaloneQuery;
      isFollowUp = condensed.isCondensed;
    }

    return {
      intent: 'LEGAL_QUERY',
      persona: sessionPersona,
      isTopicShift: history.length > 0 && !isFollowUp,
      isFollowUp,
      standaloneQuery,
      usedLlm: false,
    };
  }

  async route(
    query: string,
    history: ChatMessage[] = [],
    defaultPersona?: Partial<ConversationPersona>,
    condenser?: IQueryCondenser
  ): Promise<InputRouteAnalysis> {
    const trimmed = (query || '').trim();
    const folded = removeVietnameseDiacritics(trimmed);

    // 1. Ultra-fast path cho câu chào/cảm ơn hiển nhiên <= 3 từ (tiết kiệm Free Quota LLM)
    if (trimmed.split(/\s+/).length <= 3 && TRIVIAL_SOCIAL_FOLDED_PATTERN.test(folded)) {
      return this.fallbackLocalRoute(trimmed, history, defaultPersona, condenser);
    }

    if (!this.llmProvider) {
      return this.fallbackLocalRoute(trimmed, history, defaultPersona, condenser);
    }

    try {
      const recentHistory = history
        .slice(-this.maxHistoryTurns)
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const defaultAssistant =
        defaultPersona?.assistantPronoun || DEFAULT_CONVERSATION_PERSONA.assistantPronoun;
      const defaultUser = defaultPersona?.userPronoun || DEFAULT_CONVERSATION_PERSONA.userPronoun;

      const prompt = `${this.promptTemplate}

MẶC ĐỊNH XƯNG HÔ NẾU USER KHÔNG NÊU RÕ: ${defaultAssistant} - ${defaultUser}
LỊCH SỬ GẦN ĐÂY:
${recentHistory || '(Chưa có lịch sử)'}

TIN NHẮN MỚI NHẤT CỦA USER:
"${trimmed}"`;

      const llmRes = await this.llmProvider.generate(prompt, {
        temperature: 0.1,
        maxOutputTokens: 350,
      });

      const parsed = extractJsonObject(llmRes.text);
      if (!parsed) {
        return this.fallbackLocalRoute(trimmed, history, defaultPersona, condenser);
      }

      const rawIntent = typeof parsed.intent === 'string' ? parsed.intent.trim() : '';
      if (!VALID_INTENTS.has(rawIntent as InputRouteIntent)) {
        return this.fallbackLocalRoute(trimmed, history, defaultPersona, condenser);
      }
      const intent = rawIntent as InputRouteIntent;

      const fallbackPersona = resolveSessionPersona(trimmed, history, defaultPersona);
      const assistantPronoun =
        sanitizePronoun(parsed.assistantPronoun) || fallbackPersona.assistantPronoun;
      const userPronoun = sanitizePronoun(parsed.userPronoun) || fallbackPersona.userPronoun;
      const persona: ConversationPersona = {
        assistantPronoun,
        userPronoun,
        detectedFromInput:
          assistantPronoun !== DEFAULT_CONVERSATION_PERSONA.assistantPronoun ||
          fallbackPersona.detectedFromInput,
      };

      const standaloneQuery =
        typeof parsed.standaloneQuery === 'string' && parsed.standaloneQuery.trim().length >= 2
          ? parsed.standaloneQuery.trim()
          : trimmed;

      const directReply =
        intent === 'GREETING' || intent === 'THANKS' || intent === 'BOT_IDENTITY'
          ? typeof parsed.directReply === 'string' && parsed.directReply.trim()
            ? parsed.directReply.trim()
            : intent === 'GREETING'
              ? formatPersonalizedGreeting(persona)
              : intent === 'THANKS'
                ? formatPersonalizedThanks(persona)
                : formatPersonalizedIdentity(persona)
          : undefined;

      const outOfScopeTopic =
        typeof parsed.outOfScopeTopic === 'string' && parsed.outOfScopeTopic.trim()
          ? parsed.outOfScopeTopic.trim()
          : undefined;

      return {
        intent,
        persona,
        isTopicShift: Boolean(parsed.isTopicShift),
        isFollowUp: Boolean(parsed.isFollowUp),
        standaloneQuery,
        directReply,
        outOfScopeTopic,
        usedLlm: true,
      };
    } catch {
      // Hết Free Quota (429), timeout, hoặc mất kết nối LLM -> Fallback về Rule nhanh không dấu
      return this.fallbackLocalRoute(trimmed, history, defaultPersona, condenser);
    }
  }
}
