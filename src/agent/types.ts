import { GroundedCitation, RagQueryResponse } from '../rag/types.js';
import { LegalChunk } from '../ingestion/types.js';
import { ConversationPersona } from '../session/persona.js';

/**
 * 5 Lĩnh vực pháp luật cốt lõi trong cơ sở dữ liệu của CivicLaw AI
 */
export type LegalDomain = 'TRAFFIC' | 'LABOR' | 'INSURANCE' | 'HOUSING' | 'CIVIL';

/**
 * Danh sách công cụ khả dụng trong vòng lặp ReAct của Agent
 */
export type AgentToolName =
  | 'domain_landscape'
  | 'search_legal_code'
  | 'honest_fallback'
  | 'direct_clarification';

/**
 * Định nghĩa Công cụ Agent (AgentTool Interface)
 */
export interface AgentTool<TInput = any, TOutput = any> {
  name: AgentToolName | string;
  description: string;
  execute(input: TInput): Promise<TOutput> | TOutput;
}

/**
 * Quyết định và Suy luận của Agent (ReAct Decision)
 */
export interface AgentDecision {
  thought: string;                 // Chuỗi suy luận ReAct (Reasoning trace)
  action: AgentToolName | string;  // Tên công cụ được kích hoạt
  actionInput: Record<string, any>; // Tham số đầu vào truyền cho công cụ
  confidence: number;              // Điểm tin cậy (0.0 - 1.0)
  domain?: LegalDomain;            // Lĩnh vực pháp luật nhận diện
  isExploratory?: boolean;         // Có phải câu hỏi tổng quan / định hướng hay không
}

/**
 * Gợi ý chủ đề tra cứu có định hướng (Pro-active Guided Topic)
 */
export interface GuidedTopic {
  id: string;                      // Định danh duy nhất của chủ đề
  title: string;                   // Tiêu đề ngắn gọn hiển thị
  sampleQuery: string;             // Câu hỏi mẫu để người dùng nhấp hoặc hỏi
  description?: string;            // Mô tả tóm tắt nội dung quy định
}

/**
 * Siêu dữ liệu văn bản pháp quy trong cơ sở dữ liệu
 */
export interface LegalDocumentMetadata {
  docNumber: string;               // Số hiệu văn bản (vd: 168/2024/NĐ-CP, 36/2024/QH15)
  title: string;                   // Tên đầy đủ của văn bản luật
  officialRef: string;             // Trích dẫn chính thức
  effectiveDate: string;           // Ngày có hiệu lực thi hành
  domain: LegalDomain;             // Lĩnh vực thuộc về
  keyTopics: string[];             // Các chuyên đề trọng điểm
  scopeDescription: string;        // Phạm vi điều chỉnh
}

/**
 * Cấu trúc Toàn cảnh Lĩnh vực Pháp luật (Domain Landscape Info)
 */
export interface DomainLandscapeInfo {
  domain: LegalDomain;             // Khóa định danh lĩnh vực
  domainNameVi: string;            // Tên tiếng Việt hiển thị
  icon: string;                    // Biểu tượng cảm xúc trực quan
  summary: string;                 // Tổng quan bản đồ lộ trình pháp lý
  documents: LegalDocumentMetadata[]; // Các văn bản luật chính thức trong DB
  keyPillars: { title: string; detail: string }[]; // Các trụ cột quy định trọng tâm
  guidedTopics: GuidedTopic[];     // Danh sách gợi ý chủ đề tương tác
  citationScope: string[];         // Phạm vi trích dẫn văn bản luật
}

/**
 * Tùy chọn cấu hình cho CivicLawAgent (Anti-Hardcode)
 */
export interface CivicLawAgentOptions {
  maxIterations?: number;          // Giới hạn vòng lặp ReAct tối đa (Bounded reasoning)
  confidenceThreshold?: number;    // Ngưỡng điểm tin cậy tối thiểu
  enableExploratoryLandscape?: boolean; // Bật chế độ tổng quan lĩnh vực khi câu hỏi broad
  defaultDomain?: LegalDomain;     // Lĩnh vực mặc định nếu không xác định
  enableQueryRewriteRetry?: boolean; // Bật thử lại vòng 2 bằng LLM Query Rewriting kiểu Hermes
  queryRewritePromptTemplate?: string; // Mẫu prompt viết lại từ khóa pháp luật
}

/**
 * Cấu hình mặc định cho CivicLawAgent
 */
export const DEFAULT_CIVIC_LAW_AGENT_OPTIONS: Required<CivicLawAgentOptions> = {
  maxIterations: 3,
  confidenceThreshold: 0.65,
  enableExploratoryLandscape: true,
  defaultDomain: 'TRAFFIC',
  enableQueryRewriteRetry: true,
  queryRewritePromptTemplate: `Bạn là trợ lý chuyển ngữ truy vấn pháp luật Việt Nam (Query Rewriter).
Nhiệm vụ: Chuyển câu nói tự nhiên hoặc câu truy vấn chưa tìm trúng điều khoản bên dưới thành MỘT cụm từ khóa CÔ ĐỌNG bằng THUẬT NGỮ PHÁP LUẬT VIỆT NAM chính thức để tìm kiếm chính xác trong 5 văn bản luật (Giao thông đường bộ NĐ 168/2024 & Luật 36/2024, Lao động 2019, BHXH 2024, Nhà ở 2023, Dân sự 2015).

YÊU CẦU:
- Bỏ toàn bộ từ xưng hô (anh, em, tôi, nhờ...) và từ đệm hỏi dư thừa ("tối đa", "là bao lâu", "bao nhiêu tiền", "theo quy định", "như thế nào") để giữ lại cụm danh từ/hành vi pháp lý cô đọng nhất.
- Chuyển từ địa phương/văn nói sang đúng thuật ngữ văn bản luật (vd: "vượt đèn đỏ" -> "không chấp hành hiệu lệnh của đèn tín hiệu giao thông"; "quên đội nón" -> "xe mô tô không đội mũ bảo hiểm"; "bị thổi" -> "xử phạt vi phạm giao thông"; "xe máy" -> "xe mô tô").
- CHỈ TRẢ VỀ DUY NHẤT CỤM TỪ KHÓA / CÂU TRUY VẤN (không giải thích).`,
};

/**
 * Yêu cầu đầu vào cho CivicLawAgent
 */
export interface CivicLawAgentRequest {
  query: string;
  domain?: string;
  sessionId?: string;
  confidenceThreshold?: number;
  persona?: ConversationPersona;
  rawUserQuery?: string;
  history?: Array<{ role: string; content: string }>;
}

/**
 * Kết quả xử lý trả về từ CivicLawAgent (hoàn toàn tương thích với RagQueryResponse)
 */
export interface CivicLawAgentResponse extends RagQueryResponse {
  domain?: LegalDomain;
  guidedTopics?: GuidedTopic[];
  decision?: AgentDecision;
  thoughtTrace?: string[];
}
