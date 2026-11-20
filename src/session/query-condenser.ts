import { ILlmProvider } from '../rag/types.js';
import { ChatMessage, IQueryCondenser, SessionConfig, DEFAULT_SESSION_CONFIG } from './types.js';

/**
 * Các mẫu câu tiếng Việt biểu thị câu hỏi tiếp nối / phụ thuộc ngữ cảnh trước
 * Lưu ý: Tránh dùng \b sau các ký tự tiếng Việt có dấu vì \b trong JS chỉ hỗ trợ ASCII \w
 */
export const DEPENDENT_PATTERNS = [
  /^(thế còn|còn|vậy còn|thế thì|vậy thì)(?:\s+|$)/i,
  /^(lỗi đó|hành vi đó|trường hợp đó|trường hợp này|vi phạm này|vụ việc này)(?:\s+|$)/i,
  /^(có bị|sẽ bị|bị phạt|mức phạt|bị trừ điểm|bị tịch thu)(?:\s+|$)/i,
  /(?:thì sao)\?*$/i,
];

/**
 * Trích xuất danh từ/cụm từ hành vi chính từ một câu hỏi tiếng Việt
 */
function extractActionTopic(text: string): string {
  const clean = text.replace(/[?.,!]/g, '').trim();
  // Loại bỏ các từ để hỏi cuối câu
  return clean
    .replace(/\b(bị phạt bao nhiêu tiền|phạt bao nhiêu|thì sao|như thế nào|ra sao|có bị phạt không)\b/gi, '')
    .trim();
}

/**
 * Bộ tái tạo câu hỏi theo ngữ cảnh kết hợp Heuristic Rules và LLM (RuleAndLlmQueryCondenser)
 * Hoạt động theo chiến lược 2 tầng:
 * - Tầng 1: Rule-based Heuristics (Tốc độ < 1ms, phát hiện chuyển chủ đề hoặc tái tạo offline).
 * - Tầng 2: LLM Condensation (Khi có LLM Provider và câu hỏi phức tạp).
 */
export class RuleAndLlmQueryCondenser implements IQueryCondenser {
  private config: SessionConfig;

  constructor(
    private llmProvider?: ILlmProvider,
    customConfig?: Partial<SessionConfig>
  ) {
    this.config = {
      ...DEFAULT_SESSION_CONFIG,
      ...customConfig,
    };
  }

  /**
   * Kiểm tra xem câu hỏi có phải là câu hỏi phụ thuộc ngữ cảnh không
   */
  isDependentQuery(query: string, history: ChatMessage[]): boolean {
    if (!history || history.length === 0) return false;

    const trimmed = query.trim();
    const words = trimmed.split(/\s+/);

    // 1. Nếu câu hỏi rất ngắn (dưới 6 từ) và trong phiên đã có hội thoại
    if (words.length <= 5) {
      return true;
    }

    // 2. Khớp với các mẫu câu nối hoặc đại từ chỉ định
    for (const pattern of DEPENDENT_PATTERNS) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Tái tạo câu hỏi phụ thuộc thành câu hỏi độc lập (Standalone Query)
   */
  async condenseQuery(
    currentQuery: string,
    history: ChatMessage[]
  ): Promise<{ standaloneQuery: string; isCondensed: boolean }> {
    const trimmed = currentQuery.trim();

    // 1. Nếu không có lịch sử hoặc câu hỏi đã độc lập hoàn toàn
    if (!this.isDependentQuery(trimmed, history)) {
      return {
        standaloneQuery: trimmed,
        isCondensed: false,
      };
    }

    // Lấy các tin nhắn gần nhất theo cấu hình cửa sổ trượt
    const recentHistory = history.slice(-this.config.maxHistoryTurns);

    // =========================================================================
    // TẦNG 2A: Nếu có LLM Provider, sử dụng LLM để tái tạo ngữ cảnh tinh tế
    // =========================================================================
    if (this.llmProvider) {
      try {
        const historyText = recentHistory
          .map((m) => `${m.role === 'user' ? 'Công dân' : 'Trợ lý'}: ${m.content}`)
          .join('\n');

        const prompt = `${this.config.condensationPromptTemplate}

LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ:
${historyText}

CÂU HỎI TIẾP NỐI MỚI NHẤT CỦA CÔNG DÂN:
"${trimmed}"

HÃY TRẢ VỀ DUY NHẤT CÂU TRUY VẤN TÁI TẠO ĐỘC LẬP:`;

        const result = await this.llmProvider.generate(prompt, {
          temperature: 0.1, // Nhiệt độ thấp để đảm bảo tính tất định
          maxOutputTokens: 150,
        });

        const condensed = (result.text || '')
          .replace(/^["'\s]+|["'\s]+$/g, '')
          .replace(/^(Câu truy vấn độc lập|Câu hỏi tái tạo|Truy vấn):\s*/i, '')
          .trim();

        if (condensed.length >= 5) {
          return {
            standaloneQuery: condensed,
            isCondensed: true,
          };
        }
      } catch (err) {
        console.warn('[QueryCondenser] LLM Condensation thất bại, chuyển sang Heuristic Fallback:', err);
      }
    }

    // =========================================================================
    // TẦNG 2B: Heuristic Rule-Based Fallback (Chạy offline, không phụ thuộc LLM)
    // =========================================================================
    // Tìm câu hỏi gần nhất của User
    const lastUserMsg = [...recentHistory].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) {
      return { standaloneQuery: trimmed, isCondensed: false };
    }

    const previousTopic = extractActionTopic(
      lastUserMsg.standaloneQuery || lastUserMsg.content
    );

    let heuristicQuery = trimmed;

    // Mẫu 1: "Thế còn ô tô thì sao?", "Còn xe tải?"
    if (/^(thế còn|còn|vậy còn)\s+(.*)/i.test(trimmed)) {
      const match = trimmed.match(/^(thế còn|còn|vậy còn)\s+(.*?)(?:\s+thì sao|\s+thế nào|\?|$)/i);
      const newSubject = match ? match[2].trim() : '';
      if (newSubject) {
        // Tách hành vi cũ ra khỏi chủ thể cũ (tránh bẫy Unicode \b với nguyên âm tiếng Việt)
        const SUBJECT_PATTERN = /(?:^|\s+)(xe máy|mô tô|ô tô|xe tải|người đi bộ)(?:\s+|$)/gi;
        const coreAction = previousTopic
          .replace(SUBJECT_PATTERN, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        heuristicQuery = `Quy định xử phạt hành vi ${coreAction} đối với ${newSubject}?`;
      }
    }
    // Mẫu 2: "Lỗi đó có bị trừ điểm bằng lái không?", "Trường hợp này phạt bao nhiêu?"
    else if (/^(lỗi đó|hành vi đó|trường hợp này|trường hợp đó)\s+(.*)/i.test(trimmed)) {
      const restOfQuestion = trimmed.replace(/^(lỗi đó|hành vi đó|trường hợp này|trường hợp đó)\s+/i, '');
      heuristicQuery = `Hành vi ${previousTopic} ${restOfQuestion}`;
    }
    // Mẫu 3: Câu hỏi ngắn khuyết chủ ngữ ("Có bị giữ xe không?", "Bị phạt bao nhiêu?")
    else if (/^(có bị|mức phạt|bị phạt)\s+/i.test(trimmed)) {
      heuristicQuery = `${previousTopic} ${trimmed}`;
    }

    return {
      standaloneQuery: heuristicQuery,
      isCondensed: true,
    };
  }
}
