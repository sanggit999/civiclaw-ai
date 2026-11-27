import { ILlmProvider } from '../rag/types.js';
import { ChatMessage, IQueryCondenser, SessionConfig, DEFAULT_SESSION_CONFIG } from './types.js';

/**
 * Bộ tái tạo câu hỏi theo ngữ cảnh thuần LLM (Pure LLM-only Query Condenser)
 * - Không hardcode bất kỳ tập Regex Heuristic nào (tất cả logic nối câu / Topic Shift do LLM đảm nhận).
 * - Khi không có lịch sử, không có LLM, hoặc gặp lỗi/hết quota (429): giữ nguyên câu hỏi gốc an toàn, không ghép bừa ngữ cảnh cũ.
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
   * Tái tạo câu hỏi theo ngữ cảnh bằng LLM; nếu là Topic Shift hoặc offline/429 thì giữ nguyên truy vấn gốc
   */
  async condenseQuery(
    currentQuery: string,
    history: ChatMessage[]
  ): Promise<{ standaloneQuery: string; isCondensed: boolean }> {
    const trimmed = (currentQuery || '').trim();

    if (!trimmed || !history || history.length === 0 || !this.llmProvider) {
      return {
        standaloneQuery: trimmed,
        isCondensed: false,
      };
    }

    const recentHistory = history.slice(-this.config.maxHistoryTurns);

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
        temperature: 0.1,
        maxOutputTokens: 150,
      });

      const condensed = (result.text || '')
        .replace(/^["'\s]+|["'\s]+$/g, '')
        .replace(/^(Câu truy vấn độc lập|Câu hỏi tái tạo|Truy vấn):\s*/i, '')
        .trim();

      if (!condensed || condensed.toLowerCase() === trimmed.toLowerCase()) {
        return {
          standaloneQuery: trimmed,
          isCondensed: false,
        };
      }

      return {
        standaloneQuery: condensed,
        isCondensed: true,
      };
    } catch (err) {
      console.warn('[QueryCondenser] LLM Condensation lỗi/hết quota, giữ nguyên truy vấn gốc:', err);
      return {
        standaloneQuery: trimmed,
        isCondensed: false,
      };
    }
  }
}
