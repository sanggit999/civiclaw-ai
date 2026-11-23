import { GroundedCitation, RagQueryResponse } from '../rag/types.js';
import { AgentDecision, GuidedTopic, LegalDomain } from '../agent/types.js';

export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Cấu trúc một tin nhắn trong phiên hội thoại
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  standaloneQuery?: string;
  citations?: GroundedCitation[];
  isGrounded?: boolean;
  createdAt: string;
}

/**
 * Cấu trúc thông tin một phiên tư vấn pháp lý
 */
export interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Giao diện lưu trữ phiên hội thoại (In-memory & Supabase)
 */
export interface ISessionStore {
  createSession(title?: string, userId?: string): Promise<ChatSession>;
  getSession(sessionId: string): Promise<ChatSession | null>;
  getRecentMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  appendMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage>;
  deleteSession(sessionId: string): Promise<boolean>;
}

/**
 * Giao diện bộ tái tạo câu hỏi theo ngữ cảnh (Query Condenser)
 */
export interface IQueryCondenser {
  condenseQuery(
    currentQuery: string,
    history: ChatMessage[]
  ): Promise<{ standaloneQuery: string; isCondensed: boolean }>;
}

/**
 * Yêu cầu hỏi đáp RAG có ngữ cảnh nhiều lượt
 */
export interface ContextualRagRequest {
  sessionId: string;
  query: string;
  domain?: string;
  confidenceThreshold?: number;
}

/**
 * Phản hồi RAG đa lượt kèm thông tin phiên, câu hỏi độc lập và định tuyến suy luận Agent
 */
export interface ContextualRagResponse extends RagQueryResponse {
  sessionId: string;
  standaloneQuery: string;
  isCondensed: boolean;
  domain?: LegalDomain;
  guidedTopics?: GuidedTopic[];
  decision?: AgentDecision;
  thoughtTrace?: string[];
}

/**
 * Cấu hình quản lý phiên và bộ nhớ hội thoại (Anti-Hardcode)
 */
export interface SessionConfig {
  maxHistoryTurns: number;             // Số lượng tin nhắn gần nhất đưa vào context (mặc định: 6 = 3 cặp hỏi-đáp)
  defaultSessionTitle: string;         // 'Phiên tư vấn pháp luật'
  condensationPromptTemplate: string;  // Mẫu chỉ dẫn tái tạo câu hỏi cho LLM
}

/**
 * Cấu hình mặc định cho phiên hội thoại (Anti-Hardcode)
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxHistoryTurns: 6,
  defaultSessionTitle: 'Phiên tư vấn pháp luật',
  condensationPromptTemplate: `Bạn là trợ lý tiền xử lý ngôn ngữ pháp luật của CivicLaw AI.
Dưới đây là lịch sử cuộc trò chuyện giữa Công dân (User) và Trợ lý AI (Assistant), cùng câu hỏi mới nhất của Công dân.

NHIỆM VỤ:
1. Nếu câu hỏi mới nhất là câu hỏi tiếp nối (phụ thuộc ngữ cảnh trước đó, thiếu chủ ngữ hoặc dùng đại từ thay thế như "thế còn...", "lỗi đó...", "trường hợp này..."):
   Hãy tái tạo lại thành MỘT CÂU HỎI ĐỘC LẬP, RÕ RÀNG VỀ HÀNH VI VÀ CHỦ THỂ PHÁP LUẬT để phục vụ việc tra cứu vào cơ sở dữ liệu luật.
2. Nếu câu hỏi mới nhất là một chủ đề hoàn toàn mới, hoặc bản thân nó đã độc lập và đầy đủ ý nghĩa:
   Hãy GIỮ NGUYÊN câu hỏi đó, TUYỆT ĐỐI KHÔNG ghép thêm từ khóa của chủ đề cũ.
3. CHỈ TRẢ VỀ DUY NHẤT CÂU TRUY VẤN TÁI TẠO, không thêm bất kỳ lời chào hỏi hay giải thích nào.`,
};
