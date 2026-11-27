import { IRagPipeline } from '../rag/types.js';
import { DEFAULT_MAINTENANCE_MESSAGE } from '../rag/prompt-builder.js';
import {
  classifyIntent,
  formatPersonalizedGreeting,
  formatPersonalizedIdentity,
  formatPersonalizedThanks,
} from './intent-router.js';
import { IInputRouter } from './input-router.js';
import { ConversationPersona, resolveSessionPersona } from './persona.js';
import { CivicLawAgent } from '../agent/civic-law-agent.js';
import { formatHonestFallback } from '../agent/domain-landscape.js';
import { CivicLawAgentResponse } from '../agent/types.js';
import {
  ChatMessage,
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
  private defaultPersona?: Partial<ConversationPersona>;
  private inputRouter?: IInputRouter;

  constructor(
    private sessionStore: ISessionStore,
    private condenser: IQueryCondenser,
    private ragPipeline: IRagPipeline,
    customConfig?: Partial<SessionConfig>,
    agent?: CivicLawAgent,
    defaultPersona?: Partial<ConversationPersona>,
    inputRouter?: IInputRouter
  ) {
    this.config = {
      ...DEFAULT_SESSION_CONFIG,
      ...customConfig,
    };
    this.agent = agent ?? new CivicLawAgent(undefined, { ragPipeline: this.ragPipeline });
    this.defaultPersona = defaultPersona;
    this.inputRouter = inputRouter;
  }

  private async saveAndReturnDirectSocialReply(
    effectiveSessionId: string,
    query: string,
    answer: string
  ): Promise<ContextualRagResponse> {
    try {
      await this.sessionStore.appendMessage({
        sessionId: effectiveSessionId,
        role: 'user',
        content: query,
      });
      await this.sessionStore.appendMessage({
        sessionId: effectiveSessionId,
        role: 'assistant',
        content: answer,
        isGrounded: true,
      });
    } catch {
      // Ignored non-fatal logging error
    }

    return {
      sessionId: effectiveSessionId,
      standaloneQuery: query,
      isCondensed: false,
      answer,
      citations: [],
      verifiedSources: [],
      isGrounded: true,
      confidenceScore: 1.0,
      fallbackTriggered: false,
    };
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

    // 2. NẾU CÓ SINGLE-PASS LLM INPUT ROUTER: 1 lượt xử lý toàn bộ Intent, Xưng hô, Không dấu & Query Rewrite
    let recentMessages: ChatMessage[] = [];
    let standaloneQuery = query;
    let isCondensed = false;
    let sessionPersona: ConversationPersona;

    if (this.inputRouter) {
      try {
        recentMessages = await this.sessionStore.getRecentMessages(
          effectiveSessionId,
          this.config.maxHistoryTurns
        );
      } catch {
        recentMessages = [];
      }

      const route = await this.inputRouter.route(
        query,
        recentMessages,
        this.defaultPersona,
        this.condenser
      );
      if (route.directReply) {
        return this.saveAndReturnDirectSocialReply(effectiveSessionId, query, route.directReply);
      }
      if (route.intent === 'OUT_OF_SCOPE') {
        const honestAnswer = formatHonestFallback(query, route.outOfScopeTopic);
        try {
          await this.sessionStore.appendMessage({ sessionId: effectiveSessionId, role: 'user', content: query });
          await this.sessionStore.appendMessage({
            sessionId: effectiveSessionId,
            role: 'assistant',
            content: honestAnswer,
            isGrounded: false,
          });
        } catch {
          // Non-fatal logging error
        }
        return {
          sessionId: effectiveSessionId,
          standaloneQuery: route.standaloneQuery || query,
          isCondensed: false,
          answer: honestAnswer,
          citations: [],
          verifiedSources: [],
          isGrounded: false,
          confidenceScore: 0,
          fallbackTriggered: true,
          metadata: {
            agentMode: 'HONEST_FALLBACK',
            outOfScopeTopic: route.outOfScopeTopic,
          },
        };
      }

      sessionPersona = route.persona;
      isCondensed = route.isFollowUp;
      standaloneQuery =
        route.intent === 'TOPIC_SWITCH_OPEN' ? 'em muốn tìm hiểu ý khác' : route.standaloneQuery;
    } else {
      // Fallback đường chuẩn truyền thống (không có Input Router)
      const intentResult = classifyIntent(query, this.defaultPersona);
      if (intentResult.directAnswer) {
        let finalDirectAnswer = intentResult.directAnswer;
        if (!intentResult.persona?.detectedFromInput && sessionId) {
          try {
            const priorHistory = await this.sessionStore.getRecentMessages(
              effectiveSessionId,
              this.config.maxHistoryTurns
            );
            const sticky = resolveSessionPersona(query, priorHistory, this.defaultPersona);
            if (sticky.detectedFromInput) {
              if (intentResult.intent === 'GREETING') finalDirectAnswer = formatPersonalizedGreeting(sticky);
              else if (intentResult.intent === 'THANKS') finalDirectAnswer = formatPersonalizedThanks(sticky);
              else if (intentResult.intent === 'BOT_IDENTITY') finalDirectAnswer = formatPersonalizedIdentity(sticky);
            }
          } catch {
            // Non-fatal: giữ phản hồi mặc định nếu không đọc được lịch sử
          }
        }
        return this.saveAndReturnDirectSocialReply(effectiveSessionId, query, finalDirectAnswer);
      }

      try {
        recentMessages = await this.sessionStore.getRecentMessages(
          effectiveSessionId,
          this.config.maxHistoryTurns
        );
      } catch {
        recentMessages = [];
      }

      const condensationResult = await this.condenser.condenseQuery(query, recentMessages);
      standaloneQuery = condensationResult.standaloneQuery;
      isCondensed = condensationResult.isCondensed;
      sessionPersona = resolveSessionPersona(query, recentMessages, this.defaultPersona);
    }

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
        persona: sessionPersona,
        rawUserQuery: query,
        history: recentMessages,
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
