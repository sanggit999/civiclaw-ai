import { removeVietnameseDiacritics } from '../search/gap-queue.js';

/**
 * Bộ nhận diện & duy trì xưng hô tiếng Việt tự nhiên (Persona & Pronoun Mirroring)
 * Phục vụ phong cách hội thoại gần gũi như người tư vấn thực thụ, nhưng vẫn giữ chuẩn mực pháp lý.
 */

export interface ConversationPersona {
  assistantPronoun: string;
  userPronoun: string;
  detectedFromInput: boolean;
}

export const DEFAULT_CONVERSATION_PERSONA: ConversationPersona = {
  assistantPronoun: 'Mình',
  userPronoun: 'Bạn',
  detectedFromInput: false,
};

const MAX_CONTEXT_TURNS_FOR_STYLE = 4;
const MAX_SNIPPET_CHARS = 180;
const MAX_PRONOUN_LENGTH = 20;

export function sanitizePronoun(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.replace(/[\r\n\t\x00-\x1f\x7f]+/g, ' ').trim();
  if (!cleaned || cleaned.length > MAX_PRONOUN_LENGTH) return undefined;
  return cleaned;
}

function hasToken(text: string, tokenPattern: string): boolean {
  const regex = new RegExp(`(?:^|[\\s,!.?~"'])(?:${tokenPattern})(?=$|[\\s,!.?~"'])`, 'i');
  return regex.test(text);
}

function firstTokenIndex(text: string, tokenPattern: string): number {
  const regex = new RegExp(`(?:^|[\\s,!.?~"'])(?:${tokenPattern})(?=$|[\\s,!.?~"'])`, 'i');
  const match = regex.exec(text);
  return match ? match.index : -1;
}

/**
 * Tự động bắt cặp đại từ xưng hô tiếng Việt từ câu nói của người dùng.
 * Ví dụ: "Em chào anh..." -> { assistantPronoun: 'Anh', userPronoun: 'em' }
 *        "Em ơi cho anh hỏi..." -> { assistantPronoun: 'Em', userPronoun: 'anh' }
 */
export function detectVietnamesePersona(
  text: string,
  fallback?: Partial<ConversationPersona>
): ConversationPersona {
  const trimmed = (text || '').trim();
  const baseAssistant = fallback?.assistantPronoun || DEFAULT_CONVERSATION_PERSONA.assistantPronoun;
  const baseUser = fallback?.userPronoun || DEFAULT_CONVERSATION_PERSONA.userPronoun;

  if (!trimmed) {
    return {
      assistantPronoun: baseAssistant,
      userPronoun: baseUser,
      detectedFromInput: false,
    };
  }

  const folded = removeVietnameseDiacritics(trimmed);
  const hasDiacritics = folded !== trimmed;
  const idxEm = firstTokenIndex(folded, 'em');
  const idxAnh = firstTokenIndex(folded, 'anh');
  const idxChiAccented = firstTokenIndex(trimmed, 'chị');
  const idxChiFolded = firstTokenIndex(folded, 'chi');
  const saysEm = idxEm !== -1;

  const explicitVocativeBotEm =
    /(?:^|\s)(?:em\s+(?:oi|a|nhe|nha)|(?:chao|cam\s+on)\s+em|em\s+la\s+ai|nho\s+em|cho\s+(?:anh|chi)\s+hoi|em\s+(?:tu\s+van|giup|tra)\s+(?:cho\s+)?(?:anh|chi))(?=$|[\s,!.?~])/i.test(
      folded
    );
  const explicitVocativeBotAnh =
    /(?:^|\s)(?:anh\s+(?:oi|a|cho\s+em|giup\s+em)|(?:chao|cam\s+on|em\s+hoi)\s+anh|anh\s+la\s+ai)(?=$|[\s,!.?~])/i.test(
      folded
    ) ||
    /(?:^|\s)(?:vay|khong|duoc\s+khong)\s+anh(?=$|[?!.,~]|\s+(?:a|nhi|nhe)(?=$|[?!.,~]))/i.test(
      folded
    );

  // Chỉ nhận "chị" không dấu ở vị trí hô gọi rõ ràng (tránh nhầm chữ "không chỉ ..."); với câu có dấu kiểm tra đúng chữ "chị"
  const chiSource = hasDiacritics ? trimmed : folded;
  const chiToken = hasDiacritics ? 'chị' : 'chi';
  const explicitVocativeBotChi =
    new RegExp(
      `(?:^|\\s)(?:${chiToken}\\s+(?:oi|ơi|a|ạ|cho\\s+em|giup\\s+em|giúp\\s+em)|(?:chao|chào|cam\\s+on|cảm\\s+ơn|cám\\s+ơn|em\\s+hoi|em\\s+hỏi)\\s+${chiToken}|${chiToken}\\s+(?:la|là)\\s+ai)(?=$|[\\s,!.?~])`,
      'i'
    ).test(chiSource) ||
    new RegExp(
      `(?:^|\\s)(?:vay|vậy|khong|không|duoc\\s+khong|được\\s+không)\\s+${chiToken}(?=$|[?!.,~]|\\s+(?:a|ạ|nhi|nhỉ|nhe|nhé)(?=$|[?!.,~]))`,
      'i'
    ).test(chiSource);

  // 1. Xưng hô gọi trực tiếp bot rõ ràng bằng từ hô gọi (hỗ trợ cả có dấu & không dấu an toàn)
  if (explicitVocativeBotEm && !explicitVocativeBotAnh && !explicitVocativeBotChi) {
    if ((idxChiAccented !== -1 || (!hasDiacritics && idxChiFolded !== -1)) && idxAnh === -1) {
      return { assistantPronoun: 'Em', userPronoun: 'chị', detectedFromInput: true };
    }
    if (idxAnh !== -1) {
      return { assistantPronoun: 'Em', userPronoun: 'anh', detectedFromInput: true };
    }
    return { assistantPronoun: 'Em', userPronoun: 'anh/chị', detectedFromInput: true };
  }
  if (explicitVocativeBotAnh && !explicitVocativeBotChi) {
    return { assistantPronoun: 'Anh', userPronoun: 'em', detectedFromInput: true };
  }
  if (explicitVocativeBotChi && !explicitVocativeBotAnh) {
    return { assistantPronoun: 'Chị', userPronoun: 'em', detectedFromInput: true };
  }

  // 2. Khi câu có cả "em" và "anh"/"chị": đại từ xuất hiện trước là chủ ngữ (người nói), xuất hiện sau là người nghe
  if (saysEm && idxAnh !== -1 && idxChiAccented === -1) {
    return idxEm < idxAnh
      ? { assistantPronoun: 'Anh', userPronoun: 'em', detectedFromInput: true }
      : { assistantPronoun: 'Em', userPronoun: 'anh', detectedFromInput: true };
  }
  const effectiveIdxChi = idxChiAccented !== -1 ? idxChiAccented : idxChiFolded;
  if (saysEm && idxChiAccented !== -1 && idxAnh === -1) {
    return idxEm < effectiveIdxChi
      ? { assistantPronoun: 'Chị', userPronoun: 'em', detectedFromInput: true }
      : { assistantPronoun: 'Em', userPronoun: 'chị', detectedFromInput: true };
  }

  // 3. User xưng "cháu" với "chú/cô/bác" (chỉ fallback không dấu khi input hoàn toàn không dấu và không phải "có bị/có phải/có thể")
  if (hasToken(folded, 'chau')) {
    const elderAccented = trimmed.match(/(?:^|\s)(chú|cô|bác)(?=$|[\s,!.?~])/i);
    if (elderAccented) {
      const elder = elderAccented[1].charAt(0).toUpperCase() + elderAccented[1].slice(1).toLowerCase();
      return { assistantPronoun: elder, userPronoun: 'cháu', detectedFromInput: true };
    }
    if (!hasDiacritics) {
      const elderFolded = folded.match(
        /(?:^|\s)(chu|co|bac)(?=(?:\s+(?:oi|a|chau|cho)|$|[?!.,~]))/i
      );
      if (elderFolded && !/(?:^|\s)co\s+(?:bi|phai|duoc|the|sao|nen)(?=$|\s)/i.test(folded)) {
        const mapElder: Record<string, string> = { chu: 'Chú', co: 'Cô', bac: 'Bác' };
        return { assistantPronoun: mapElder[elderFolded[1].toLowerCase()], userPronoun: 'cháu', detectedFromInput: true };
      }
    }
  }

  // 4. User chỉ xưng "em" một mình ("em hoi ve luong thu viec")
  if (saysEm && idxAnh === -1 && idxChiAccented === -1) {
    return { assistantPronoun: 'Anh/Chị', userPronoun: 'em', detectedFromInput: true };
  }

  return {
    assistantPronoun: baseAssistant,
    userPronoun: baseUser,
    detectedFromInput: false,
  };
}

/**
 * Giữ xưng hô nhất quán trong cả phiên hội thoại:
 * ưu tiên lượt hiện tại, nếu lượt hiện tại trung tính thì kế thừa từ lượt user gần nhất.
 */
export function resolveSessionPersona(
  currentQuery: string,
  history: Array<{ role: string; content: string }> = [],
  fallback?: Partial<ConversationPersona>
): ConversationPersona {
  const current = detectVietnamesePersona(currentQuery, fallback);
  if (current.detectedFromInput) {
    return current;
  }

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') {
      const fromHistory = detectVietnamesePersona(history[i].content, fallback);
      if (fromHistory.detectedFromInput) {
        return fromHistory;
      }
    }
  }

  return current;
}

/**
 * Tạo đoạn hướng dẫn phong cách hội thoại tự nhiên gắn vào System Prompt
 */
export function buildPersonaStyleInstruction(
  persona: ConversationPersona,
  history: Array<{ role: string; content: string }> = []
): string {
  const lines: string[] = [
    `\nPHONG CÁCH GIAO TIẾP & XƯNG HÔ:`,
    `- Hãy xưng là "${persona.assistantPronoun}" và gọi người dùng là "${persona.userPronoun}" thật tự nhiên, thân thiện như đang trò chuyện tư vấn trực tiếp.`,
    `- Không cần rập khuôn chia 3 đề mục cố định kiểu văn bản hành chính; hãy đi thẳng vào giải đáp rõ ràng, giải thích ngắn gọn điều kiện/mức phạt, giữ nguyên các trích dẫn đích danh [Điểm... Khoản... Điều... Số hiệu văn bản] đúng theo NGỮ CẢNH PHÁP LUẬT.`,
    `- Ở cuối câu trả lời, thêm 1 câu ngắn gợi mở giúp ${persona.userPronoun} dễ hỏi sâu hơn hoặc chuyển sang tìm hiểu ý/vấn đề pháp lý khác.`,
  ];

  if (history.length > 0) {
    const recent = history
      .slice(-MAX_CONTEXT_TURNS_FOR_STYLE)
      .map((m) => {
        const speaker = m.role === 'user' ? persona.userPronoun : persona.assistantPronoun;
        const snippet = (m.content || '').replace(/\s+/g, ' ').trim().slice(0, MAX_SNIPPET_CHARS);
        return `  - ${speaker}: ${snippet}`;
      })
      .join('\n');
    lines.push(`\nMẠCH HỘI THOẠI GẦN ĐÂY (chỉ tham khảo ngữ điệu, nếu ${persona.userPronoun} đã đổi chủ đề thì trả lời đúng chủ đề mới):\n${recent}`);
  }

  return lines.join('\n');
}
