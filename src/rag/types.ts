import { LegalChunk } from '../ingestion/types.js';

/**
 * Trích dẫn pháp lý được định danh và kiểm chứng
 */
export interface GroundedCitation {
  fullReference: string;  // Ví dụ: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP'
  article: string;        // 'Điều 6'
  clause?: string;        // 'Khoản 3'
  point?: string;         // 'Điểm đ'
  docNumber: string;      // '168/2024/NĐ-CP'
  isVerified: boolean;    // Đã được đối soát chéo khớp với Context Chunks
}

/**
 * Kết quả kiểm chứng trích dẫn của câu trả lời
 */
export interface CitationVerificationResult {
  isValid: boolean;                         // true nếu không có trích dẫn ma nào
  verifiedCitations: GroundedCitation[];    // Danh sách trích dẫn hợp lệ có trong ngữ cảnh
  unverifiedCitations: string[];           // Danh sách trích dẫn nghi ngờ ảo giác
}

/**
 * Tùy chọn cấu hình khi gọi mô hình ngôn ngữ lớn (LLM)
 */
export interface LlmGenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

/**
 * Kết quả trả về từ LLM Provider
 */
export interface LlmGenerateResult {
  text: string;
  tokensUsed?: number;
}

/**
 * Giao diện trừu tượng cho nhà cung cấp mô hình ngôn ngữ (Gemini / Mock)
 */
export interface ILlmProvider {
  generate(prompt: string, options?: LlmGenerateOptions): Promise<LlmGenerateResult>;
}

/**
 * Giao diện kiểm chứng trích dẫn chéo
 */
export interface ICitationVerifier {
  verify(answerText: string, contextChunks: LegalChunk[]): CitationVerificationResult;
}

/**
 * Yêu cầu hỏi đáp RAG từ người dùng
 */
export interface RagQueryRequest {
  query: string;
  domain?: string;
  topK?: number;
  confidenceThreshold?: number;
}

/**
 * Phản hồi hoàn chỉnh từ RAG Pipeline
 */
export interface RagQueryResponse {
  answer: string;
  isGrounded: boolean;
  confidenceScore: number;
  citations: GroundedCitation[];
  verifiedSources: LegalChunk[];
  fallbackTriggered: boolean;
  unverifiedCitations?: string[];
  degradedMode?: boolean; // true nếu LLM gặp sự cố và hệ thống fallback sang trích xuất trực tiếp DB
}

/**
 * Giao diện thực thi Pipeline RAG Pháp lý
 */
export interface IRagPipeline {
  query(request: RagQueryRequest): Promise<RagQueryResponse>;
}

/**
 * Giao diện truy xuất căn cứ pháp lý (Retriever)
 */
export interface ILegalRetriever {
  search(
    queryText: string,
    options?: { domain?: string; limit?: number }
  ): Promise<{
    topScore: number;
    results: { chunk: LegalChunk; score: number }[];
  }>;
}

/**
 * Giao diện ghi nhận khoảng trống tri thức (Knowledge Gap Recorder)
 */
export interface IGapRecorder {
  recordQuery(queryText: string, domainGuess?: string): Promise<unknown>;
}

/**
 * Cấu hình tham số cho RAG Pipeline (chống hardcode)
 */
export interface RagPipelineConfig {
  defaultTopK: number;                  // Mặc định: 5
  defaultConfidenceThreshold: number;   // Mặc định: 0.65
  maxContextLengthChars: number;        // Mặc định: 8000
  systemPrompt: string;
  fallbackMessage: string;
  extractiveFallbackNotice: string;     // Thông báo khi kích hoạt chế độ trích xuất trực tiếp DB
}
