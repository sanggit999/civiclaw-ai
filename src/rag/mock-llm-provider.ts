import { ILlmProvider, LlmGenerateOptions, LlmGenerateResult } from './types.js';

/**
 * Giả lập LLM Provider cho môi trường kiểm thử offline và CI/CD
 * Không tốn token, không cần mạng, phản hồi trong 1ms
 */
export class MockLlmProvider implements ILlmProvider {
  private cannedResponses: Map<string, string> = new Map();
  public callHistory: { prompt: string; options?: LlmGenerateOptions }[] = [];
  private defaultResponse = `📌 KẾT LUẬN NHANH:
Hành vi vi phạm bị xử phạt theo đúng quy định của pháp luật hiện hành.

⚖️ PHÂN TÍCH CHI TIẾT:
Hành vi này được quy định chi tiết trong văn bản pháp luật áp dụng đối với chủ thể tham gia.

📚 CĂN CỨ PHÁP LÝ:
1. Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP`;

  /**
   * Đăng ký câu trả lời đóng gói sẵn theo từ khóa trong prompt
   */
  setCannedResponse(keyword: string, response: string): void {
    this.cannedResponses.set(keyword.toLowerCase(), response);
  }

  /**
   * Đặt câu trả lời mặc định khi không khớp từ khóa nào
   */
  setDefaultResponse(response: string): void {
    this.defaultResponse = response;
  }

  /**
   * Sinh câu trả lời giả lập
   */
  async generate(prompt: string, options?: LlmGenerateOptions): Promise<LlmGenerateResult> {
    const safePrompt = prompt || '';
    this.callHistory.push({ prompt: safePrompt, options });

    const lower = safePrompt.toLowerCase();
    for (const [keyword, canned] of this.cannedResponses.entries()) {
      if (lower.includes(keyword)) {
        return {
          text: canned,
          tokensUsed: 150,
        };
      }
    }

    return {
      text: this.defaultResponse,
      tokensUsed: 100,
    };
  }

  /**
   * Lấy lịch sử các lần gọi hàm (phục vụ assertions trong test)
   */
  getCallHistory(): { prompt: string; options?: LlmGenerateOptions }[] {
    return [...this.callHistory];
  }

  /**
   * Xóa lịch sử gọi
   */
  clearHistory(): void {
    this.callHistory = [];
  }
}
