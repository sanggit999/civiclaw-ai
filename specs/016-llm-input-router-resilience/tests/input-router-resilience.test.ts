import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_INPUT_ROUTER_PROMPT,
  SinglePassLlmInputRouter,
} from '../../../src/session/input-router.js';
import { detectVietnamesePersona } from '../../../src/session/persona.js';
import { classifyIntent } from '../../../src/session/intent-router.js';
import * as condenserModule from '../../../src/session/query-condenser.js';
import { RuleAndLlmQueryCondenser } from '../../../src/session/query-condenser.js';
import { ContextualRagPipeline } from '../../../src/session/pipeline.js';
import { InMemorySessionStore } from '../../../src/session/in-memory-session-store.js';
import { ChatMessage } from '../../../src/session/types.js';
import { CivicLawAgent } from '../../../src/agent/civic-law-agent.js';
import {
  GroundedRagPipeline,
  createRetrieverFromSearchEngine,
  createGapRecorderFromQueue,
} from '../../../src/rag/pipeline.js';
import { RegexCitationVerifier } from '../../../src/rag/citation-verifier.js';
import { DEFAULT_MAINTENANCE_MESSAGE } from '../../../src/rag/prompt-builder.js';
import { GeminiLlmProvider } from '../../../src/rag/gemini-llm-provider.js';
import { LegalSearchEngine } from '../../../src/search/engine.js';
import { LegalChunk } from '../../../src/ingestion/types.js';
import { ILlmProvider } from '../../../src/rag/types.js';
import {
  DEFAULT_CHAT_MAINTENANCE_NOTICE,
  formatChatMaintenanceFallback,
} from '../../../admin/lib/api-client.js';

const mockChunks: LegalChunk[] = [
  {
    id: '168_D7_K2_Ph',
    docNumber: '168/2024/NĐ-CP',
    domain: 'TRAFFIC',
    article: 'Điều 7',
    clause: 'Khoản 2',
    point: 'Điểm h',
    fullReference: 'Điểm h Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP',
    content:
      'Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe mô tô, xe gắn máy không đội mũ bảo hiểm khi tham gia giao thông.',
    keywords: ['mũ bảo hiểm', 'xe mô tô', '400.000 đồng'],
  },
  {
    id: '45_D25_K2',
    docNumber: '45/2019/QH14',
    domain: 'LABOR',
    article: 'Điều 25',
    clause: 'Khoản 2',
    fullReference: 'Khoản 2 Điều 25 Bộ luật Lao động 2019',
    content:
      'Thời gian thử việc không quá 60 ngày đối với công việc có chức danh nghề nghiệp cần trình độ chuyên môn cao đẳng trở lên.',
    keywords: ['thử việc', '60 ngày', 'cao đẳng'],
  },
];

describe('Spec 016 - Single-Pass LLM Input Router & Maintenance Resilience', () => {
  it('Lát 1: Fallback Rules hiểu tiếng Việt không dấu và KHÔNG nhận nhầm "chỉ", "có", "thổi", "con"', async () => {
    // 1. Persona không dấu đúng & chống false-positive có dấu
    const pChi = detectVietnamesePersona('chi oi cho em hoi quy dinh nay');
    expect(pChi.assistantPronoun).toBe('Chị');
    expect(pChi.userPronoun).toBe('em');

    const pNotChi = detectVietnamesePersona('Không chỉ vượt đèn đỏ mà còn chạy quá tốc độ');
    expect(pNotChi.detectedFromInput).toBe(false);

    const pChauCo = detectVietnamesePersona('Cháu có bị phạt không?');
    expect(pChauCo.detectedFromInput).toBe(false);

    const pChauCoUnaccented = detectVietnamesePersona('chau co bi phat ko');
    expect(pChauCoUnaccented.detectedFromInput).toBe(false);

    // 2. Intent Router không dấu
    const g = classifyIntent('em chao anh a');
    expect(g.intent).toBe('GREETING');
    expect(g.directAnswer).toContain('Chào em');
    expect(g.directAnswer).toContain('Anh là CivicLaw AI');

    const t = classifyIntent('cam on chi nhieu nha');
    expect(t.intent).toBe('THANKS');
    expect(t.directAnswer).toContain('Chị');

    // 3. QueryCondenser Pure LLM-only: không còn 6 hằng số Regex hardcode; LLM xử lý Topic Shift & Follow-up, khi offline/429 giữ nguyên câu gốc an toàn
    expect('DEPENDENT_PATTERNS' in condenserModule).toBe(false);
    expect('EXPLICIT_TOPIC_SHIFT_PATTERNS' in condenserModule).toBe(false);

    const history: ChatMessage[] = [
      {
        id: 'm1',
        sessionId: 's1',
        role: 'user',
        content: 'Vuot den do xe may phat bao nhieu?',
        standaloneQuery: 'Vượt đèn đỏ xe máy bị phạt bao nhiêu?',
        createdAt: new Date().toISOString(),
      },
    ];
    const llmCondenser = new RuleAndLlmQueryCondenser({
      generate: vi.fn(async (prompt: string) => {
        if (prompt.includes('the con o to')) {
          return { text: 'Hành vi vượt đèn đỏ đối với xe ô tô bị phạt bao nhiêu?' };
        }
        return { text: 'thời gian thử việc 60 ngày' };
      }),
    });
    const condensed = await llmCondenser.condenseQuery('the con o to thi sao?', history);
    expect(condensed.isCondensed).toBe(true);
    expect(condensed.standaloneQuery.toLowerCase()).toContain('ô tô');

    // Khi offline / không có LLM -> giữ nguyên câu gốc an toàn, không ghép bừa từ ngữ cảnh cũ
    const offlineCondenser = new RuleAndLlmQueryCondenser();
    const offlinePass = await offlineCondenser.condenseQuery('Con đường này có cấm xe ô tô không?', history);
    expect(offlinePass.isCondensed).toBe(false);
    expect(offlinePass.standaloneQuery).toBe('Con đường này có cấm xe ô tô không?');
  });

  it('Lát 2 (BDD 1 & 2): SinglePassLlmInputRouter xử lý JSON 1 lượt (kể cả Topic Shift / Out-of-Scope) & rơi êm về Rule khi 429 hoặc JSON lỗi', async () => {
    const validRouterLlm: ILlmProvider = {
      generate: vi.fn(async (prompt: string) => {
        if (prompt.includes('thoi bo qua')) {
          return {
            text: '{"intent":"LEGAL_QUERY","assistantPronoun":"Anh","userPronoun":"em","isTopicShift":true,"isFollowUp":false,"standaloneQuery":"thời gian thử việc 60 ngày cao đẳng"}',
          };
        }
        if (prompt.includes('hon nhan')) {
          return {
            text: '{"intent":"OUT_OF_SCOPE","assistantPronoun":"Anh","userPronoun":"em","isTopicShift":true,"isFollowUp":false,"standaloneQuery":"thủ tục ly hôn","outOfScopeTopic":"Hôn nhân gia đình"}',
          };
        }
        if (prompt.includes('y khac')) {
          return {
            text: '{"intent":"TOPIC_SWITCH_OPEN","assistantPronoun":"Anh","userPronoun":"em","isTopicShift":true,"isFollowUp":false,"standaloneQuery":"muốn tìm hiểu ý khác"}',
          };
        }
        return {
          text: '```json\n{"intent":"LEGAL_QUERY","assistantPronoun":"Anh","userPronoun":"em","isTopicShift":false,"isFollowUp":false,"standaloneQuery":"xe mô tô không đội mũ bảo hiểm 400.000 đồng"}\n```',
        };
      }),
    };

    const router = new SinglePassLlmInputRouter(validRouterLlm);

    // 1. Ultra-fast path tiết kiệm token cho "hi"
    const fastRes = await router.route('hi', []);
    expect(fastRes.intent).toBe('GREETING');
    expect(fastRes.usedLlm).toBe(false);
    expect(validRouterLlm.generate).not.toHaveBeenCalled();

    // 2. Câu không dấu + teencode đi qua LLM Router 1 lượt
    const legalRes = await router.route('hom qua em ko doi mu bh bi phat bn anh', []);
    expect(legalRes.usedLlm).toBe(true);
    expect(legalRes.intent).toBe('LEGAL_QUERY');
    expect(legalRes.persona.assistantPronoun).toBe('Anh');
    expect(legalRes.persona.userPronoun).toBe('em');
    expect(legalRes.standaloneQuery).toBe('xe mô tô không đội mũ bảo hiểm 400.000 đồng');

    // 2b. Câu đổi ý không dấu -> isTopicShift: true
    const topicShiftRes = await router.route('thoi bo qua vu xe qua hoi thu viec di a', [
      { id: 'h1', sessionId: 's', role: 'user', content: 'vuot den do', createdAt: '' },
    ]);
    expect(topicShiftRes.isTopicShift).toBe(true);
    expect(topicShiftRes.isFollowUp).toBe(false);
    expect(topicShiftRes.standaloneQuery).toContain('thử việc');
    expect(DEFAULT_INPUT_ROUTER_PROMPT).toContain('đèn tín hiệu giao thông');
    expect(DEFAULT_INPUT_ROUTER_PROMPT).toContain('assistantPronoun là cách Bot');

    // 3. Khi LLM hết Free Quota (429) hoặc JSON hỏng -> fallback êm sang rule không dấu
    const quotaExhaustedLlm: ILlmProvider = {
      generate: vi.fn(async () => {
        throw new Error('Gemini API Error (429): Resource has been exhausted');
      }),
    };
    const fallbackRouter = new SinglePassLlmInputRouter(quotaExhaustedLlm);
    const degradedGreeting = await fallbackRouter.route('em chao anh a', []);
    expect(degradedGreeting.usedLlm).toBe(false);
    expect(degradedGreeting.intent).toBe('GREETING');
    expect(degradedGreeting.directReply).toContain('Chào em');

    const corruptJsonLlm: ILlmProvider = {
      generate: vi.fn(async () => ({ text: 'Đây không phải JSON hợp lệ' })),
    };
    const safeRouter = new SinglePassLlmInputRouter(corruptJsonLlm);
    const corruptFallback = await safeRouter.route('cam on anh nhieu', []);
    expect(corruptFallback.usedLlm).toBe(false);
    expect(corruptFallback.intent).toBe('THANKS');
    expect(corruptFallback.directReply).toContain('Anh');

    // 4. Tích hợp trọn vẹn ContextualRagPipeline + InputRouter (LEGAL_QUERY, TOPIC_SWITCH_OPEN, OUT_OF_SCOPE)
    const engine = new LegalSearchEngine(mockChunks);
    const ragLlm: ILlmProvider = {
      generate: vi.fn(async (prompt: string) => {
        if (prompt.includes('BẮT ĐẦU NGỮ CẢNH PHÁP LUẬT')) {
          return {
            text: 'Chào em, hành vi này bị phạt 400.000 - 600.000 đồng theo [Điểm h Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP].',
          };
        }
        if (prompt.includes('hon nhan')) {
          return {
            text: '{"intent":"OUT_OF_SCOPE","assistantPronoun":"Anh","userPronoun":"em","isTopicShift":true,"isFollowUp":false,"standaloneQuery":"thủ tục ly hôn","outOfScopeTopic":"Hôn nhân gia đình"}',
          };
        }
        if (prompt.includes('y khac')) {
          return {
            text: '{"intent":"TOPIC_SWITCH_OPEN","assistantPronoun":"Anh","userPronoun":"em","isTopicShift":true,"isFollowUp":false,"standaloneQuery":"ý khác"}',
          };
        }
        return {
          text: '{"intent":"LEGAL_QUERY","assistantPronoun":"Anh","userPronoun":"em","isTopicShift":false,"isFollowUp":false,"standaloneQuery":"xe mô tô không đội mũ bảo hiểm 400.000 đồng"}',
        };
      }),
    };
    const ragPipeline = new GroundedRagPipeline(
      createRetrieverFromSearchEngine(engine),
      createGapRecorderFromQueue(engine.getGapQueue()),
      ragLlm,
      new RegexCitationVerifier()
    );
    const agent = new CivicLawAgent(undefined, { ragPipeline, llmProvider: ragLlm, searchEngine: engine });
    const pipeline = new ContextualRagPipeline(
      new InMemorySessionStore(),
      new RuleAndLlmQueryCondenser(ragLlm),
      ragPipeline,
      undefined,
      agent,
      undefined,
      new SinglePassLlmInputRouter(ragLlm)
    );

    const chatOut = await pipeline.chat({
      sessionId: '',
      query: 'hom qua em quen doi non bi thoi phat sao anh?',
    });
    expect(chatOut.isGrounded).toBe(true);
    expect(chatOut.citations[0].docNumber).toBe('168/2024/NĐ-CP');
    expect(chatOut.answer).toContain('Chào em');

    const switchOut = await pipeline.chat({ sessionId: chatOut.sessionId, query: 'em muon hoi y khac' });
    expect(switchOut.decision?.action).toBe('direct_clarification');

    const outScope = await pipeline.chat({ sessionId: chatOut.sessionId, query: 'hoi thu tuc hon nhan gia dinh' });
    expect(outScope.fallbackTriggered).toBe(true);
    expect(outScope.metadata?.agentMode).toBe('HONEST_FALLBACK');
    expect(outScope.answer).toContain('Hôn nhân gia đình');
  });

  it('Lát 3 (BDD 2 & 3): GeminiLlmProvider 429 failover, CitationVerifier đuôi "nha em" & Maintenance UX khi sập server', async () => {
    // 1. RegexCitationVerifier không nuốt từ đệm trò chuyện sau năm luật ("2019 nha em")
    const verifier = new RegexCitationVerifier();
    const verified = verifier.verify(
      'Thời gian thử việc tối đa 60 ngày theo Khoản 2 Điều 25 Bộ luật Lao động 2019 nha em.',
      mockChunks
    );
    expect(verified.isValid).toBe(true);
    expect(verified.verifiedCitations[0].fullReference).toBe('Khoản 2 Điều 25 Bộ luật Lao động 2019');

    // 2. GeminiLlmProvider failover trên HTTP 429
    const calledUrls: string[] = [];
    const mockFetch = vi.fn(async (url: string) => {
      calledUrls.push(String(url));
      if (String(url).includes('gemini-3.5-flash-lite')) {
        return {
          ok: false,
          status: 429,
          text: async () => 'Free quota exceeded',
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Phản hồi từ model dự phòng' }] } }],
          usageMetadata: { totalTokenCount: 25 },
        }),
      } as unknown as Response;
    });

    const provider = new GeminiLlmProvider({
      apiKey: 'test-key',
      modelName: 'gemini-3.5-flash-lite',
      fallbackModel: 'gemini-3.8-flash',
      fetchFn: mockFetch as unknown as typeof fetch,
    });
    const out = await provider.generate('Xin chào');
    expect(out.text).toBe('Phản hồi từ model dự phòng');
    expect(calledUrls).toHaveLength(2);
    expect(calledUrls[1]).toContain('gemini-3.8-flash');

    // 3. Khi cả 2 model đều hết quota (429) -> Extractive Grounded Fallback (0% bịa đặt)
    const engine = new LegalSearchEngine(mockChunks);
    const all429Llm: ILlmProvider = {
      generate: vi.fn(async () => {
        throw new Error('Gemini API Error (429): Quota exhausted');
      }),
    };
    const rag = new GroundedRagPipeline(
      createRetrieverFromSearchEngine(engine),
      createGapRecorderFromQueue(engine.getGapQueue()),
      all429Llm,
      verifier
    );
    const degradedOut = await rag.query({ query: 'không đội mũ bảo hiểm 400.000 đồng' });
    expect(degradedOut.isGrounded).toBe(true);
    expect(degradedOut.degradedMode).toBe(true);
    expect(degradedOut.citations[0].docNumber).toBe('168/2024/NĐ-CP');

    // 4. BDD 3 (Maintenance UX): Gateway crash trả DEFAULT_MAINTENANCE_MESSAGE & UI fallback không lộ lỗi thô
    const crashingAgent = {
      process: vi.fn().mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:5432')),
    } as unknown as CivicLawAgent;
    const crashingPipeline = new ContextualRagPipeline(
      new InMemorySessionStore(),
      new RuleAndLlmQueryCondenser(),
      rag,
      undefined,
      crashingAgent
    );
    const maintOut = await crashingPipeline.chat({ sessionId: '', query: 'xe máy vượt đèn đỏ' });
    expect(maintOut.answer).toBe(DEFAULT_MAINTENANCE_MESSAGE);
    expect(maintOut.metadata?.systemState).toBe('MAINTENANCE');
    expect(maintOut.answer).not.toContain('ECONNREFUSED');

    const uiMaint = formatChatMaintenanceFallback('sess-ui', 'mũ bảo hiểm');
    expect(uiMaint.answer).toBe(DEFAULT_CHAT_MAINTENANCE_NOTICE);
    expect(uiMaint.answer).toContain('THÔNG BÁO VẬN HÀNH HỆ THỐNG');
    expect(uiMaint.isGrounded).toBe(false);
  });
});
