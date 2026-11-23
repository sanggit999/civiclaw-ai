import { IRagPipeline } from '../rag/types.js';
import { DEFAULT_MAINTENANCE_MESSAGE } from '../rag/prompt-builder.js';
import { classifyIntent } from './intent-router.js';
import { CivicLawAgent } from '../agent/civic-law-agent.js';
import { CivicLawAgentResponse } from '../agent/types.js';
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
  getAgent?(): CivicLawAgent;
}

/**
 * Pipeline RAG Đa Lượt có Bộ nhớ Ngữ cảnh & Phiên Hội Thoại (ContextualRagPipeline)
 * Điều phối luồng làm rõ câu hỏi trước khi gửi vào CivicLaw Legal Agent và lưu trữ lịch sử
 */
export class ContextualRagPipeline implements IContextualRagPipeline {
  private config: SessionConfig;
  private agent: CivicLawAgent;

  constructor(
    private sessionStore: ISessionStore,
    private condenser: IQueryCondenser,
    private ragPipeline: IRagPipeline,
    customConfig?: Partial<SessionConfig>,
    agent?: CivicLawAgent
  ) {
    this.config = {
      ...DEFAULT_SESSION_CONFIG,
      ...customConfig,
    };
    this.agent = agent ?? new CivicLawAgent(undefined, { ragPipeline: this.ragPipeline });
  }

  /**
   * Truy xuất instance của CivicLawAgent nội bộ
   */
  getAgent(): CivicLawAgent {
    return this.agent;
  }

  /**
   * Xử lý một lượt hỏi đáp trong phiên hội thoại
   */
  async chat(request: ContextualRagRequest): Promise<ContextualRagResponse> {
    const { sessionId, query, domain, confidenceThreshold } = request;

    // 1. Kiểm tra phiên tồn tại, nếu chưa có thì tự động tạo mới (kèm Fallback Guard)
    let session = null;
    try {
      if (sessionId) {
        session = await this.sessionStore.getSession(sessionId);
      }
      if (!session) {
        session = await this.sessionStore.createSession(
          this.config.defaultSessionTitle
        );
      }
    } catch {
      // Supabase network error fallback
      session = {
        id: sessionId || `session-local-${Date.now()}`,
        title: this.config.defaultSessionTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    const effectiveSessionId = session.id;

    // 2. PHÂN LUỒNG Ý ĐỊNH (INTENT ROUTER): Chào hỏi, cảm ơn, hỏi thăm danh tính
    const intentResult = classifyIntent(query);
    if (intentResult.directAnswer) {
      try {
        await this.sessionStore.appendMessage({
          sessionId: effectiveSessionId,
          role: 'user',
          content: query,
        });
        await this.sessionStore.appendMessage({
          sessionId: effectiveSessionId,
          role: 'assistant',
          content: intentResult.directAnswer,
          isGrounded: true,
        });
      } catch {
        // Ignored non-fatal logging error
      }

      return {
        sessionId: effectiveSessionId,
        standaloneQuery: query,
        isCondensed: false,
        answer: intentResult.directAnswer,
        citations: [],
        verifiedSources: [],
        isGrounded: true,
        confidenceScore: 1.0,
        fallbackTriggered: false,
      };
    }

    // 3. Lấy lịch sử hội thoại gần nhất theo cửa sổ trượt (Sliding Window)
    let recentMessages: any[] = [];
    try {
      recentMessages = await this.sessionStore.getRecentMessages(
        effectiveSessionId,
        this.config.maxHistoryTurns
      );
    } catch {
      recentMessages = [];
    }

    // 4. Tái tạo câu hỏi thành câu truy vấn độc lập (Standalone Query)
    const condensationResult = await this.condenser.condenseQuery(
      query,
      recentMessages
    );
    const standaloneQuery = condensationResult.standaloneQuery;
    const isCondensed = condensationResult.isCondensed;

    // 5. Lưu tin nhắn của người dùng vào lịch sử phiên
    try {
      await this.sessionStore.appendMessage({
        sessionId: effectiveSessionId,
        role: 'user',
        content: query,
        standaloneQuery: isCondensed ? standaloneQuery : undefined,
      });
    } catch {
      // Ignored non-fatal logging error
    }

    // 6. Chuyển câu hỏi độc lập vào CivicLaw Legal Agent để định tuyến suy luận Bounded ReAct (kèm Maintenance Guard)
    let agentResponse: CivicLawAgentResponse;
    try {
      agentResponse = await this.agent.process({
        query: standaloneQuery,
        domain,
        confidenceThreshold,
        sessionId: effectiveSessionId,
      });
    } catch (err) {
      console.warn('[ContextualRagPipeline] Lỗi xử lý Agent / RAG, trả về thông báo bảo trì UX:', err);
      return {
        sessionId: effectiveSessionId,
        standaloneQuery: standaloneQuery || query,
        isCondensed,
        answer: DEFAULT_MAINTENANCE_MESSAGE,
        citations: [],
        verifiedSources: [],
        isGrounded: false,
        confidenceScore: 0,
        fallbackTriggered: true,
        metadata: {
          systemState: 'MAINTENANCE',
        },
      };
    }

    // Nếu Agent gặp sự cố hạ tầng / lỗi công cụ bên dưới, trả về thông điệp bảo trì UX chuẩn
    if (
      agentResponse.fallbackTriggered &&
      (agentResponse.answer.includes('Hệ thống gặp sự cố') || agentResponse.metadata?.systemState === 'MAINTENANCE')
    ) {
      return {
        sessionId: effectiveSessionId,
        standaloneQuery: standaloneQuery || query,
        isCondensed,
        answer: DEFAULT_MAINTENANCE_MESSAGE,
        citations: [],
        verifiedSources: [],
        isGrounded: false,
        confidenceScore: 0,
        fallbackTriggered: true,
        metadata: {
          systemState: 'MAINTENANCE',
        },
      };
    }

    // 7. Lưu câu trả lời của trợ lý kèm danh mục trích dẫn đã được kiểm chứng
    try {
      await this.sessionStore.appendMessage({
        sessionId: effectiveSessionId,
        role: 'assistant',
        content: agentResponse.answer,
        citations: agentResponse.citations,
        isGrounded: agentResponse.isGrounded,
      });
    } catch {
      // Ignored non-fatal logging error
    }

    return {
      ...agentResponse,
      sessionId: effectiveSessionId,
      standaloneQuery,
      isCondensed,
    };
  }
}
