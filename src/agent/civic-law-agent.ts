import {
  AgentDecision,
  AgentTool,
  AgentToolName,
  CivicLawAgentOptions,
  CivicLawAgentRequest,
  CivicLawAgentResponse,
  DEFAULT_CIVIC_LAW_AGENT_OPTIONS,
  DomainLandscapeInfo,
  LegalDomain,
} from './types.js';
import {
  DOMAINS_LANDSCAPE_DATA,
  detectExploratoryDomain,
  formatHonestFallback,
  formatLandscapeSynthesis,
  getDomainLandscape,
  isOutOfScopeDomain,
} from './domain-landscape.js';
import { GroundedCitation, ILlmProvider, IRagPipeline, RagQueryResponse } from '../rag/types.js';
import { LegalSearchEngine } from '../search/engine.js';
import { LegalChunk } from '../ingestion/types.js';
import { ConversationPersona, DEFAULT_CONVERSATION_PERSONA } from '../session/persona.js';

const OPEN_TOPIC_SWITCH_PATTERNS = [
  /(?:^|\s)(?:tìm\s+(?:hiểu\s+)?(?:ý|chủ\s+đề|vấn\s+đề|mảng)\s+khác|hỏi\s+(?:cái|ý|chủ\s+đề|vấn\s+đề)\s+khác|chuyển\s+(?:ý|chủ\s+đề|vấn\s+đề)\s*(?:khác)?|còn\s+(?:lĩnh\s+vực|luật|mảng)\s+nào\s+nữa)(?=$|[\s,!?.])/i,
];

function isOpenTopicSwitchRequest(query: string): boolean {
  const trimmed = (query || '').trim();
  if (!trimmed) return false;
  const matchesSwitch = OPEN_TOPIC_SWITCH_PATTERNS.some((p) => p.test(trimmed));
  if (!matchesSwitch) return false;

  // Nếu người dùng đã nêu kèm lĩnh vực hoặc nội dung cụ thể (vd: "chuyển sang bảo hiểm xã hội", "hỏi vấn đề khác về lương thử việc") -> KHÔNG phải câu hỏi mở
  if (detectExploratoryDomain(trimmed)) return false;
  const hasConcreteTopicAfterPrep =
    /(?:^|\s)(?:sang|về)\s+(?:vụ\s+|chủ\s+đề\s+|vấn\s+đề\s+|mảng\s+|lĩnh\s+vực\s+|luật\s+)?(?!(?:ý|chủ\s+đề|vấn\s+đề|cái|mảng)\s+khác\b)[^\s,!.?]+(?:\s+[^\s,!.?]+){1,}/i.test(
      trimmed
    );
  if (hasConcreteTopicAfterPrep) return false;

  return trimmed.split(/\s+/).length <= 12;
}

export interface CivicLawAgentDependencies {
  ragPipeline?: IRagPipeline;
  llmProvider?: ILlmProvider;
  searchEngine?: LegalSearchEngine;
}

/**
 * CivicLaw Legal Agent với cơ chế suy luận Bounded ReAct (Thought -> Action -> Observation)
 * 
 * Khả năng cốt lõi:
 * 1. Exploratory / Broad Inquiry: Khi công dân hỏi tổng quan (vd: 'Cho Tôi về Giao thông đường bộ'),
 *    Agent kích hoạt tool `domain_landscape` để tổng hợp bản đồ lộ trình pháp lý và gợi ý chủ đề tương tác.
 * 2. Specific Legal Inquiry / Violation: Khi công dân hỏi vi phạm hoặc tình huống cụ thể (vd: 'Vượt đèn đỏ xe máy...'),
 *    Agent định tuyến sang tool `search_legal_code` (RAG Pipeline) để truy xuất căn cứ và trích dẫn chính thống.
 * 3. Out of Scope / DB Bounds: Khi công dân hỏi lĩnh vực ngoài 5 bộ luật trong DB (vd: Hình sự, Thuế),
 *    Agent kích hoạt tool `honest_fallback` để phản hồi minh bạch, trung thực, không ảo giác.
 */
export class CivicLawAgent {
  private config: Required<CivicLawAgentOptions>;
  private ragPipeline?: IRagPipeline;
  private llmProvider?: ILlmProvider;
  private searchEngine?: LegalSearchEngine;
  private tools: Map<string, AgentTool> = new Map();

  constructor(
    customConfig?: CivicLawAgentOptions,
    dependencies?: CivicLawAgentDependencies
  ) {
    this.config = {
      ...DEFAULT_CIVIC_LAW_AGENT_OPTIONS,
      ...(customConfig || {}),
    };
    this.ragPipeline = dependencies?.ragPipeline;
    this.llmProvider = dependencies?.llmProvider;
    this.searchEngine = dependencies?.searchEngine;

    this.registerBuiltInTools();
  }

  /**
   * Đăng ký các công cụ nội bộ của Agent
   */
  private registerBuiltInTools(): void {
    // 1. Tool Toàn cảnh lĩnh vực (Domain Landscape)
    this.tools.set('domain_landscape', {
      name: 'domain_landscape',
      description: 'Tổng hợp bản đồ quy định pháp luật và gợi ý chủ đề tương tác khi công dân hỏi tổng quan về 1 trong 5 lĩnh vực.',
      execute: async (input: { domain: LegalDomain }) => {
        const landscape = getDomainLandscape(input.domain);
        if (!landscape) {
          throw new Error(`Không tìm thấy dữ liệu toàn cảnh cho lĩnh vực: ${input.domain}`);
        }

        const answer = formatLandscapeSynthesis(landscape);

        // Tạo trích dẫn căn cứ chính thống cho các văn bản thuộc lĩnh vực
        const citations: GroundedCitation[] = landscape.documents.map((doc) => ({
          fullReference: `${doc.title} (${doc.officialRef})`,
          article: 'Toàn văn',
          docNumber: doc.docNumber,
          isVerified: true,
        }));

        // Chuyển đổi tài liệu thành các chunks ngữ cảnh đại diện
        const verifiedSources: LegalChunk[] = landscape.documents.map((doc) => ({
          id: `landscape-${doc.docNumber}`,
          docNumber: doc.docNumber,
          domain: (doc.domain === 'INSURANCE' ? 'SOCIAL_INSURANCE' : doc.domain) as any,
          article: 'Toàn văn',
          content: `${doc.title}. ${doc.scopeDescription}. Chuyên đề trọng tâm: ${doc.keyTopics.join(', ')}.`,
          fullReference: doc.officialRef,
          keywords: doc.keyTopics,
        }));

        const response: CivicLawAgentResponse = {
          answer,
          isGrounded: true,
          confidenceScore: 0.98,
          citations,
          verifiedSources,
          fallbackTriggered: false,
          domain: landscape.domain,
          guidedTopics: landscape.guidedTopics,
          metadata: {
            agentMode: 'DOMAIN_LANDSCAPE',
            domain: landscape.domain,
          },
        };

        return response;
      },
    });

    // 2. Tool Tra cứu điều khoản cụ thể (Search Legal Code via RAG)
    this.tools.set('search_legal_code', {
      name: 'search_legal_code',
      description: 'Truy xuất các điều khoản, chế tài xử phạt cụ thể từ cơ sở dữ liệu pháp luật qua RAG Pipeline.',
      execute: async (input: {
        query: string;
        domain?: string;
        confidenceThreshold?: number;
        persona?: ConversationPersona;
        rawUserQuery?: string;
        history?: Array<{ role: string; content: string }>;
      }) => {
        if (this.ragPipeline) {
          const ragResult = await this.ragPipeline.query({
            query: input.query,
            domain: input.domain,
            confidenceThreshold: input.confidenceThreshold ?? this.config.confidenceThreshold,
            persona: input.persona,
            rawUserQuery: input.rawUserQuery,
            history: input.history,
          });

          // Nếu RAG truy xuất thành công và có căn cứ được xác minh
          if (!ragResult.fallbackTriggered && ragResult.isGrounded && ragResult.citations?.length > 0) {
            const response: CivicLawAgentResponse = {
              ...ragResult,
              metadata: {
                ...(ragResult.metadata || {}),
                agentMode: 'SEARCH_LEGAL_CODE',
              },
            };
            return response;
          }

          // Khi có RAG pipeline thật, trả về ragResult để vòng ReAct (Query Rewrite Retry) hoặc Fallback xử lý chuẩn
          const response: CivicLawAgentResponse = {
            ...ragResult,
            metadata: {
              ...(ragResult.metadata || {}),
              agentMode: 'SEARCH_LEGAL_CODE',
            },
          };
          return response;
        }

        // Fallback khi không có RAG pipeline (In-memory mock/offline mode)
        return this.createOfflineSearchFallback(input.query, input.domain);
      },
    });

    // 3. Tool Phản hồi Trung thực ngoài phạm vi (Honest Fallback)
    this.tools.set('honest_fallback', {
      name: 'honest_fallback',
      description: 'Phản hồi trung thực khi câu hỏi nằm ngoài phạm vi cơ sở dữ liệu 5 bộ luật, hướng dẫn công dân nguồn tra cứu chính thống.',
      execute: async (input: { query: string; detectedTopic?: string }) => {
        const answer = formatHonestFallback(input.query, input.detectedTopic);

        const response: CivicLawAgentResponse = {
          answer,
          isGrounded: false,
          confidenceScore: 0.0,
          citations: [],
          verifiedSources: [],
          fallbackTriggered: true,
          metadata: {
            agentMode: 'HONEST_FALLBACK',
            outOfScopeTopic: input.detectedTopic,
          },
        };
        return response;
      },
    });

    // 4. Tool Điều hướng khi người dùng muốn tìm hiểu ý khác (Direct Clarification)
    this.tools.set('direct_clarification', {
      name: 'direct_clarification',
      description: 'Gợi ý 5 lĩnh vực pháp luật và chủ đề mẫu khi người dùng muốn chuyển sang tìm ý khác.',
      execute: async (input: { persona?: ConversationPersona }) => {
        const persona = input.persona || DEFAULT_CONVERSATION_PERSONA;
        const landscapes = Object.values(DOMAINS_LANDSCAPE_DATA);
        const guidedTopics = landscapes.map((l) => l.guidedTopics[0]).filter(Boolean);
        const domainLines = landscapes
          .map((l) => `- ${l.icon} **${l.domainNameVi}:** ${l.guidedTopics[0]?.sampleQuery || l.summary}`)
          .join('\n');

        const userTitle =
          persona.userPronoun.charAt(0).toUpperCase() + persona.userPronoun.slice(1);
        const answer =
          `Được chứ ${persona.userPronoun}! ${persona.assistantPronoun} sẵn sàng hỗ trợ ${persona.userPronoun} chuyển sang tìm hiểu vấn đề khác trong 5 lĩnh vực dưới đây:\n\n` +
          `${domainLines}\n\n` +
          `${userTitle} cứ nhắn trực tiếp tình huống hoặc điều luật muốn tra cứu cho ${persona.assistantPronoun} nhé!`;

        const response: CivicLawAgentResponse = {
          answer,
          isGrounded: true,
          confidenceScore: 0.95,
          citations: [],
          verifiedSources: [],
          fallbackTriggered: false,
          guidedTopics,
          metadata: {
            agentMode: 'DIRECT_CLARIFICATION',
          },
        };
        return response;
      },
    });
  }

  /**
   * Viết lại truy vấn đời thường sang thuật ngữ pháp luật chuẩn (Hermes-style Query Rewrite)
   */
  private async rewriteQueryForLegalSearch(query: string, failureHint?: string): Promise<string | null> {
    if (!this.llmProvider) return null;
    try {
      const hintLine = failureHint ? `\nLƯU Ý VÒNG TRƯỚC: ${failureHint}` : '';
      const prompt = `${this.config.queryRewritePromptTemplate}${hintLine}

CÂU NÓI CỦA NGƯỜI DÙNG:
"${query}"

TRUY VẤN THUẬT NGỮ PHÁP LUẬT:`;
      const result = await this.llmProvider.generate(prompt, {
        temperature: 0.1,
        maxOutputTokens: 100,
      });
      const rewritten = (result.text || '')
        .replace(/^["'\s]+|["'\s]+$/g, '')
        .replace(/^(Truy vấn|Từ khóa):\s*/i, '')
        .trim();
      return rewritten.length >= 3 ? rewritten : null;
    } catch {
      return null;
    }
  }

  /**
   * Bước 1 của ReAct: Suy luận và ra quyết định hành động (Reason & Decide)
   */
  private decideAction(query: string, explicitDomain?: string): AgentDecision {
    const trimmed = (query || '').trim();

    // 1. Kiểm tra Ngoài phạm vi 5 bộ luật (Out of Scope Check)
    const outOfScope = isOutOfScopeDomain(trimmed);
    if (outOfScope.isOutOfScope) {
      return {
        thought: `Câu hỏi phát hiện chủ đề '${outOfScope.detectedTopic || 'ngoài cơ sở dữ liệu'}' nằm ngoài phạm vi 5 bộ luật của CivicLaw AI. Kích hoạt honest_fallback để phản hồi minh bạch, từ chối ảo giác.`,
        action: 'honest_fallback',
        actionInput: { query: trimmed, detectedTopic: outOfScope.detectedTopic },
        confidence: 0.99,
        isExploratory: false,
      };
    }

    // 1b. Kiểm tra yêu cầu chuyển sang tìm hiểu ý khác (chưa nêu chủ đề cụ thể)
    if (isOpenTopicSwitchRequest(trimmed)) {
      return {
        thought: 'Người dùng muốn chuyển sang tìm hiểu ý/chủ đề khác. Kích hoạt direct_clarification để gợi ý nhanh các lĩnh vực.',
        action: 'direct_clarification',
        actionInput: { query: trimmed },
        confidence: 0.95,
        isExploratory: true,
      };
    }

    // 2. Kiểm tra Câu hỏi khám phá / tổng quan lĩnh vực (Exploratory Domain Check)
    if (this.config.enableExploratoryLandscape) {
      const exploratory = detectExploratoryDomain(trimmed);
      if (exploratory) {
        return {
          thought: `Phát hiện câu hỏi mang tính chất khám phá / định hướng tổng quan về lĩnh vực '${exploratory.domain}'. Kích hoạt công cụ domain_landscape để tổng hợp bản đồ pháp lý và gợi ý chủ đề tương tác.`,
          action: 'domain_landscape',
          actionInput: { domain: exploratory.domain },
          confidence: exploratory.confidence,
          domain: exploratory.domain,
          isExploratory: true,
        };
      }
    }

    // 3. Mặc định: Câu hỏi tra cứu điều khoản, hành vi vi phạm hoặc chế tài cụ thể
    let targetDomain: LegalDomain | undefined = undefined;
    if (explicitDomain) {
      const landscape = getDomainLandscape(explicitDomain);
      if (landscape) targetDomain = landscape.domain;
    }

    return {
      thought: `Câu hỏi mang tính chất tra cứu vi phạm hoặc tình huống pháp lý cụ thể. Kích hoạt công cụ search_legal_code (RAG) để truy xuất điều khoản và trích dẫn căn cứ chính thống.`,
      action: 'search_legal_code',
      actionInput: {
        query: trimmed,
        domain: targetDomain,
      },
      confidence: 0.95,
      domain: targetDomain,
      isExploratory: false,
    };
  }

  /**
   * Xử lý một yêu cầu hỏi đáp pháp lý qua chu trình ReAct có giới hạn (Bounded ReAct)
   */
  async process(request: CivicLawAgentRequest): Promise<CivicLawAgentResponse> {
    const { query, domain, confidenceThreshold, persona, rawUserQuery, history } = request;

    if (!query || !query.trim()) {
      throw new Error('Câu hỏi của người dùng không được để trống.');
    }

    const thoughtTrace: string[] = [];
    let currentIteration = 0;
    const maxIterations = this.config.maxIterations;
    let activeQuery = query.trim();
    let hasRetriedQueryRewrite = false;

    while (currentIteration < maxIterations) {
      currentIteration++;

      // 1. Suy luận ReAct (Reasoning / Thought)
      const decision = this.decideAction(activeQuery, domain);
      thoughtTrace.push(`[Iteration ${currentIteration}] Thought: ${decision.thought}`);
      thoughtTrace.push(`[Iteration ${currentIteration}] Action: ${decision.action}`);

      // 2. Tìm công cụ tương ứng
      const tool = this.tools.get(decision.action);
      if (!tool) {
        throw new Error(`Công cụ không tồn tại: ${decision.action}`);
      }

      // 3. Thực thi công cụ (Action Execution / Observation)
      try {
        const toolInput = {
          ...decision.actionInput,
          confidenceThreshold: confidenceThreshold ?? this.config.confidenceThreshold,
          persona,
          rawUserQuery: rawUserQuery || query,
          history,
        };

        const result: CivicLawAgentResponse = await tool.execute(toolInput);
        thoughtTrace.push(`[Iteration ${currentIteration}] Observation: Hoàn tất thực thi công cụ ${decision.action}.`);

        // Cơ chế Hermes-style Query Rewrite Retry:
        // Kích hoạt khi Vòng 1 dưới ngưỡng fallback HOẶC tìm trúng điều khoản lệch ý khiến LLM trả về 0 trích dẫn hợp lệ (không phải lỗi bịa citation)
        const hasNoVerifiedCitations =
          result.metadata?.agentMode === 'SEARCH_LEGAL_CODE' &&
          !result.degradedMode &&
          (!result.unverifiedCitations || result.unverifiedCitations.length === 0) &&
          (!result.citations || result.citations.length === 0);

        if (
          decision.action === 'search_legal_code' &&
          !hasRetriedQueryRewrite &&
          this.config.enableQueryRewriteRetry &&
          this.llmProvider &&
          currentIteration < maxIterations &&
          ((result.fallbackTriggered && !result.isGrounded) || hasNoVerifiedCitations)
        ) {
          hasRetriedQueryRewrite = true;
          const failureHint = result.fallbackTriggered
            ? 'Truy vấn trước không đạt ngưỡng điểm khớp; hãy bỏ từ đệm và đổi sang cụm từ khóa quy phạm cô đọng hơn.'
            : 'Truy vấn trước tìm ra điều khoản nhưng chưa đúng hành vi người dùng hỏi; hãy đổi sang thuật ngữ văn bản luật chính xác.';
          const rewritten = await this.rewriteQueryForLegalSearch(activeQuery, failureHint);
          if (rewritten && rewritten.toLowerCase() !== activeQuery.toLowerCase()) {
            thoughtTrace.push(
              `[Iteration ${currentIteration}] Query Rewrite: Kết quả vòng 1 chưa đủ căn cứ, viết lại truy vấn thành "${rewritten}" để tìm lại.`
            );
            activeQuery = rewritten;
            continue;
          }
        }

        // Đính kèm thông tin quyết định và chuỗi suy luận ReAct
        return {
          ...result,
          domain: result.domain || decision.domain,
          decision,
          thoughtTrace,
        };
      } catch (err: any) {
        thoughtTrace.push(`[Iteration ${currentIteration}] Tool Error: ${err.message}`);

        // Fallback an toàn nếu công cụ gặp lỗi
        if (currentIteration >= maxIterations) {
          return {
            answer: `Hệ thống gặp sự cố trong quá trình xử lý công cụ: ${err.message}`,
            isGrounded: false,
            confidenceScore: 0,
            citations: [],
            verifiedSources: [],
            fallbackTriggered: true,
            decision,
            thoughtTrace,
          };
        }
      }
    }

    // Bounded fallback nếu vượt quá số vòng lặp tối đa
    return {
      answer: 'Hệ thống đã đạt giới hạn vòng lặp suy luận tối đa.',
      isGrounded: false,
      confidenceScore: 0,
      citations: [],
      verifiedSources: [],
      fallbackTriggered: true,
      thoughtTrace,
    };
  }

  /**
   * Alias tương thích với IRagPipeline.query
   */
  async query(request: CivicLawAgentRequest): Promise<CivicLawAgentResponse> {
    return this.process(request);
  }

  /**
   * Tạo phản hồi tìm kiếm ngoại tuyến khi không có RAG pipeline (cho Mock/Testing)
   */
  private createOfflineSearchFallback(query: string, domain?: string): CivicLawAgentResponse {
    const isTraffic = /vượt\s+đèn\s+đỏ|mũ\s+bảo\s+hiểm|nồng\s+độ\s+cồn|tốc\s+độ/i.test(query);

    if (isTraffic) {
      return {
        answer: `Căn cứ Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP, hành vi không chấp hành hiệu lệnh của đèn tín hiệu giao thông (vượt đèn đỏ) đối với người điều khiển xe mô tô, xe gắn máy bị phạt tiền từ 800.000 đồng đến 1.000.000 đồng và bị trừ 02 điểm giấy phép lái xe.`,
        isGrounded: true,
        confidenceScore: 0.95,
        citations: [
          {
            fullReference: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
            article: 'Điều 6',
            clause: 'Khoản 3',
            point: 'Điểm đ',
            docNumber: '168/2024/NĐ-CP',
            isVerified: true,
          },
        ],
        verifiedSources: [],
        fallbackTriggered: false,
        domain: 'TRAFFIC',
      };
    }

    return {
      answer: `CivicLaw AI đã tiếp nhận câu hỏi: "${query}". Vui lòng cung cấp thêm thông tin chi tiết để hỗ trợ tra cứu chính xác.`,
      isGrounded: false,
      confidenceScore: 0.5,
      citations: [],
      verifiedSources: [],
      fallbackTriggered: true,
      domain: (domain as LegalDomain) || undefined,
    };
  }

  /**
   * Lấy danh sách công cụ đã đăng ký
   */
  getRegisteredTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }
}
