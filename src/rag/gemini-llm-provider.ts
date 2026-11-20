import { ILlmProvider, LlmGenerateOptions, LlmGenerateResult } from './types.js';

export interface GeminiConfig {
  apiKey?: string;
  modelName?: string;
  apiEndpoint?: string;
  fetchFn?: typeof fetch;
}

export const DEFAULT_GEMINI_CONFIG = {
  modelName: 'gemini-3.8-flash',
  apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
};

/**
 * Nhà cung cấp mô hình ngôn ngữ Google Gemini sử dụng Native Fetch
 * Tuân thủ Thang 7 bậc Ponytail (Rung 3 & 4: Tận dụng Web API native, không thêm dependency)
 */
export class GeminiLlmProvider implements ILlmProvider {
  private apiKey: string;
  private modelName: string;
  private apiEndpoint: string;
  private fetchFn: typeof fetch;

  constructor(config?: GeminiConfig) {
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY || '';
    this.modelName = config?.modelName || DEFAULT_GEMINI_CONFIG.modelName;
    this.apiEndpoint = config?.apiEndpoint || DEFAULT_GEMINI_CONFIG.apiEndpoint;
    this.fetchFn = config?.fetchFn || globalThis.fetch;
  }

  /**
   * Sinh câu trả lời từ prompt qua Gemini REST API
   */
  async generate(prompt: string, options?: LlmGenerateOptions): Promise<LlmGenerateResult> {
    if (!this.apiKey) {
      throw new Error(
        'GEMINI_API_KEY chưa được cấu hình. Vui lòng cung cấp qua tham số hoặc biến môi trường.'
      );
    }

    const url = `${this.apiEndpoint}/${this.modelName}:generateContent?key=${this.apiKey}`;

    const requestBody: Record<string, any> = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.2, // Nhiệt độ thấp để tăng tính tất định, giảm ảo giác
        maxOutputTokens: options?.maxOutputTokens ?? 2048,
      },
    };

    if (options?.systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemInstruction }],
      };
    }

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey, // Header xác thực chuẩn Enterprise Google API
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    const tokensUsed = data?.usageMetadata?.totalTokenCount;

    return {
      text,
      tokensUsed,
    };
  }
}
