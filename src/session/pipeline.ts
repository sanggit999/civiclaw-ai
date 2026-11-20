import { IRagPipeline } from '../rag/types.js';
import {
  ISessionStore,
  IQueryCondenser,
  ContextualRagRequest,
  ContextualRagResponse,
  SessionConfig,
  DEFAULT_SESSION_CONFIG,
} from './types.js';

export interface IContextualRagPipeline {
  chat(request: ContextualRagRequest): Promise<ContextualRagResponse>;
}

/**
 * Pipeline RAG Đa Lượt có Bộ nhớ Ngữ cảnh & Phiên Hội Thoại (ContextualRagPipeline)
 * Điều phối luồng làm rõ câu hỏi trước khi gửi vào RAG Core và lưu trữ lịch sử
 */
export class ContextualRagPipeline implements IContextualRagPipeline {
  private config: SessionConfig;

  constructor(
    private sessionStore: ISessionStore,
    private condenser: IQueryCondenser,
    private ragPipeline: IRagPipeline,
    customConfig?: Partial<SessionConfig>
  ) {
    this.config = {
      ...DEFAULT_SESSION_CONFIG,
      ...customConfig,
    };
  }

  /**
   * Xử lý một lượt hỏi đáp trong phiên hội thoại
   */
  async chat(request: ContextualRagRequest): Promise<ContextualRagResponse> {
    const { sessionId, query, domain, confidenceThreshold } = request;

    // 1. Kiểm tra phiên tồn tại, nếu chưa có thì tự động tạo mới
    let session = await this.sessionStore.getSession(sessionId);
    if (!session) {
      session = await this.sessionStore.createSession(
        this.config.defaultSessionTitle
      );
    }
    const effectiveSessionId = session.id;

    // 2. Lấy lịch sử hội thoại gần nhất theo cửa sổ trượt (Sliding Window)
    const recentMessages = await this.sessionStore.getRecentMessages(
      effectiveSessionId,
      this.config.maxHistoryTurns
    );

    // 3. Tái tạo câu hỏi thành câu truy vấn độc lập (Standalone Query)
    const condensationResult = await this.condenser.condenseQuery(
      query,
      recentMessages
    );
    const standaloneQuery = condensationResult.standaloneQuery;
    const isCondensed = condensationResult.isCondensed;

    // 4. Lưu tin nhắn của người dùng vào lịch sử phiên
    await this.sessionStore.appendMessage({
      sessionId: effectiveSessionId,
      role: 'user',
      content: query,
      standaloneQuery: isCondensed ? standaloneQuery : undefined,
    });

    // 5. Chuyển câu hỏi độc lập vào Grounded RAG Pipeline để tìm kiếm luật và tổng hợp
    const ragResponse = await this.ragPipeline.query({
      query: standaloneQuery,
      domain,
      confidenceThreshold,
    });

    // 6. Lưu câu trả lời của trợ lý kèm danh mục trích dẫn đã được kiểm chứng
    await this.sessionStore.appendMessage({
      sessionId: effectiveSessionId,
      role: 'assistant',
      content: ragResponse.answer,
      citations: ragResponse.citations,
      isGrounded: ragResponse.isGrounded,
    });

    return {
      ...ragResponse,
      sessionId: effectiveSessionId,
      standaloneQuery,
      isCondensed,
    };
  }
}
