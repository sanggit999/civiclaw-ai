import { removeVietnameseDiacritics } from '../search/gap-queue.js';
import { ConversationPersona, detectVietnamesePersona } from './persona.js';

/**
 * Bộ phân luồng Ý định Người dùng (User Intent Router)
 *
 * Nhiệm vụ:
 * 1. Nhận diện các ý định Chào hỏi / Xã giao (Greeting / Chitchat): "Xin chào", "Em chào anh"...
 * 2. Phản hồi tức thì, tự nhiên theo đúng cặp xưng hô người dùng (< 1ms), KHÔNG tra cứu luật và KHÔNG ghi rác vào Triage Hub.
 * 3. Hướng dẫn công dân đặt câu hỏi đúng phạm vi 5 bộ luật chính thống.
 */

export type UserIntent = 'GREETING' | 'THANKS' | 'BOT_IDENTITY' | 'LEGAL_QUERY';

export interface IntentRouteResult {
  intent: UserIntent;
  directAnswer?: string;
  persona?: ConversationPersona;
}

export const GREETING_RESPONSE = `👋 **Xin chào Bạn!** Tôi là **CivicLaw AI** - Trợ lý pháp lý thông minh và minh bạch của Việt Nam.

Tôi sẵn sàng hỗ trợ Bạn giải đáp các thắc mắc về quy định pháp luật trong 5 lĩnh vực cốt lõi:
- 🚦 **Giao thông đường bộ:** Mức xử phạt vi phạm, trừ điểm GPLX theo Nghị định 168/2024/NĐ-CP & Luật TTATGTĐB 2024.
- 👷 **Lao động & Việc làm:** Hợp đồng lao động, thử việc, tiền lương, chế độ sa thải theo Bộ luật Lao động 2019.
- 🏥 **Bảo hiểm xã hội:** Điều kiện rút BHXH 1 lần, chế độ thai sản, ốm đau, hưu trí theo Luật BHXH.
- 🏠 **Nhà ở & Chung cư:** Quy chế quản lý chung cư, quyền sở hữu, hợp đồng thuê nhà theo Luật Nhà ở 2023.
- ⚖️ **Hợp đồng & Dân sự:** Đặt cọc, quyền và nghĩa vụ hợp đồng theo Bộ luật Dân sự 2015.

Bạn đang có câu hỏi hoặc tình huống pháp lý nào cần hỗ trợ tra cứu?`;

export const THANKS_RESPONSE = `Rất vui được hỗ trợ Bạn! Nếu Bạn có thêm bất kỳ câu hỏi nào về các quy định pháp luật, đừng ngần ngại gửi tin nhắn cho tôi nhé. Chúc Bạn một ngày an lành và vạn sự như ý!`;

export const BOT_IDENTITY_RESPONSE = `Tôi là **CivicLaw AI** - Trợ lý pháp lý số phát triển nhằm hỗ trợ công dân và cơ quan quản lý tra cứu pháp luật một cách minh bạch, chính xác tuyệt đối và 100% trích dẫn căn cứ chính thống từ các văn bản quy phạm pháp luật Việt Nam.`;

const GREETING_PATTERNS = [
  /^(?:(?:da\s+)?(?:em|minh|toi|chau|anh|chi)\s+)?(?:xin\s+chao|chao|hello|hi|alo|he\s+lo|kinh\s+chao)(?:\s+(?:ban|ad|bot|em|anh|chi|chu|co|bac|moi\s+nguoi|buoi\s+(?:sang|trua|chieu|toi)|nhe|nha|a))*[\s!.,?~]*$/i,
  /^(?:anh|chi|em|chu|co|bac)\s+oi[\s!.,?~]*$/i,
];

const THANKS_PATTERNS = [
  /^(?:(?:da\s+)?(?:em|minh|toi|chau|anh|chi)\s+)?(?:cam\s+on|thank\s+you|thanks|tam\s+biet|bye|goodbye)(?:\s+(?:ban|ad|bot|em|anh|chi|chu|co|bac|nhieu|nhe|nha|a))*[\s!.,?~]*$/i,
];

const IDENTITY_PATTERNS = [
  /^(?:ban|anh|chi|em)\s+la\s+ai[\s!.,?~]*$/i,
  /^(?:ban\s+ten\s+gi|gioi\s+thieu\s+(?:ve\s+)?(?:ban|minh)|civiclaw(?:\s+ai)?\s+la\s+gi)[\s!.,?~]*$/i,
];

export function formatPersonalizedGreeting(persona: ConversationPersona): string {
  const { assistantPronoun, userPronoun } = persona;
  return (
    `👋 Chào ${userPronoun}! **${assistantPronoun} là CivicLaw AI**, trợ lý tra cứu pháp luật luôn sẵn sàng trò chuyện và hỗ trợ ${userPronoun}.\n\n` +
    `${assistantPronoun} có thể giúp ${userPronoun} tra cứu nhanh kèm trích dẫn chính xác trong 5 nhóm quy định:\n` +
    `- 🚦 Giao thông đường bộ (Nghị định 168/2024/NĐ-CP & Luật TTATGTĐB 2024)\n` +
    `- 👷 Lao động & Việc làm (Bộ luật Lao động 2019)\n` +
    `- 🏥 Bảo hiểm xã hội (Luật BHXH 2024)\n` +
    `- 🏠 Nhà ở & Chung cư (Luật Nhà ở 2023)\n` +
    `- ⚖️ Hợp đồng & Dân sự (Bộ luật Dân sự 2015)\n\n` +
    `Hôm nay ${userPronoun} đang muốn tìm hiểu tình huống hay điều luật nào cứ kể ${assistantPronoun} nghe nhé!`
  );
}

export function formatPersonalizedThanks(persona: ConversationPersona): string {
  const { assistantPronoun, userPronoun } = persona;
  return `Không có chi đâu ${userPronoun}! Nếu ${userPronoun} còn thắc mắc nào khác hoặc muốn tìm hiểu sang vấn đề pháp lý khác, cứ nhắn cho ${assistantPronoun} bất cứ lúc nào nhé.`;
}

export function formatPersonalizedIdentity(persona: ConversationPersona): string {
  const { assistantPronoun, userPronoun } = persona;
  return `${assistantPronoun} là **CivicLaw AI** — trợ lý pháp lý giúp ${userPronoun} giải đáp thắc mắc dựa trên 100% căn cứ trích dẫn từ 5 bộ luật cốt lõi của Việt Nam, trả lời tự nhiên và dễ hiểu nhất cho ${userPronoun}.`;
}

/**
 * Phân loại ý định của người dùng và trả về câu trả lời trực tiếp nếu là xã giao
 */
export function classifyIntent(
  queryText: string,
  defaultPersona?: Partial<ConversationPersona>
): IntentRouteResult {
  const trimmed = (queryText || '').trim();
  const folded = removeVietnameseDiacritics(trimmed);
  const persona = detectVietnamesePersona(trimmed, defaultPersona);
  const hasCustomDefault = Boolean(defaultPersona?.assistantPronoun || defaultPersona?.userPronoun);
  const usePersonalized = persona.detectedFromInput || hasCustomDefault;

  // 1. Kiểm tra Chào hỏi (hỗ trợ cả có dấu & không dấu qua folded)
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(folded)) {
      return {
        intent: 'GREETING',
        persona,
        directAnswer: usePersonalized ? formatPersonalizedGreeting(persona) : GREETING_RESPONSE,
      };
    }
  }

  // 2. Kiểm tra Cảm ơn / Tạm biệt
  for (const pattern of THANKS_PATTERNS) {
    if (pattern.test(folded)) {
      return {
        intent: 'THANKS',
        persona,
        directAnswer: usePersonalized ? formatPersonalizedThanks(persona) : THANKS_RESPONSE,
      };
    }
  }

  // 3. Kiểm tra Giới thiệu bản thân
  for (const pattern of IDENTITY_PATTERNS) {
    if (pattern.test(folded)) {
      return {
        intent: 'BOT_IDENTITY',
        persona,
        directAnswer: usePersonalized ? formatPersonalizedIdentity(persona) : BOT_IDENTITY_RESPONSE,
      };
    }
  }

  // 4. Mặc định: Câu hỏi pháp lý cần truy xuất văn bản luật
  return {
    intent: 'LEGAL_QUERY',
    persona,
  };
}
