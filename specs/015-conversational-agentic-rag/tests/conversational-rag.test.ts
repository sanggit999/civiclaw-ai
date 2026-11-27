import { describe, it, expect, vi } from 'vitest';
import {
  detectVietnamesePersona,
  resolveSessionPersona,
  DEFAULT_CONVERSATION_PERSONA,
} from '../../../src/session/persona.js';
import { classifyIntent, GREETING_RESPONSE } from '../../../src/session/intent-router.js';
import { RuleAndLlmQueryCondenser } from '../../../src/session/query-condenser.js';
import { ContextualRagPipeline } from '../../../src/session/pipeline.js';
import { InMemorySessionStore } from '../../../src/session/in-memory-session-store.js';
import { ChatMessage } from '../../../src/session/types.js';
import { CivicLawAgent } from '../../../src/agent/civic-law-agent.js';
import { GroundedRagPipeline, createRetrieverFromSearchEngine, createGapRecorderFromQueue } from '../../../src/rag/pipeline.js';
import { RegexCitationVerifier } from '../../../src/rag/citation-verifier.js';
import { buildGroundedPrompt, DEFAULT_RAG_CONFIG } from '../../../src/rag/prompt-builder.js';
import { LegalSearchEngine } from '../../../src/search/engine.js';
import { LegalChunk } from '../../../src/ingestion/types.js';
import { ILlmProvider } from '../../../src/rag/types.js';

const testChunks: LegalChunk[] = [
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

describe('Spec 015 - Conversational Agentic RAG', () => {
  it('Lát 1 (BDD 1): detectVietnamesePersona & resolveSessionPersona bắt cặp xưng hô và bám phiên', () => {
    const emAnh = detectVietnamesePersona('Anh ơi hôm qua em đi xe quên đội mũ thì phạt sao anh?');
    expect(emAnh.detectedFromInput).toBe(true);
    expect(emAnh.assistantPronoun).toBe('Anh');
    expect(emAnh.userPronoun).toBe('em');

    const anhEm = detectVietnamesePersona('Em ơi cho anh hỏi mức lương thử việc với');
    expect(anhEm.detectedFromInput).toBe(true);
    expect(anhEm.assistantPronoun).toBe('Em');
    expect(anhEm.userPronoun).toBe('anh');

    const switchEmAnh = detectVietnamesePersona('Em muốn tìm hiểu ý khác được không anh?');
    expect(switchEmAnh.assistantPronoun).toBe('Anh');
    expect(switchEmAnh.userPronoun).toBe('em');

    const askAnhEm = detectVietnamesePersona('Anh muốn nhờ em tra giúp quy định này');
    expect(askAnhEm.assistantPronoun).toBe('Em');
    expect(askAnhEm.userPronoun).toBe('anh');

    const anhChoEmHoi = detectVietnamesePersona('Anh cho em hỏi lương thử việc');
    expect(anhChoEmHoi.assistantPronoun).toBe('Anh');
    expect(anhChoEmHoi.userPronoun).toBe('em');

    const neutral = detectVietnamesePersona('Mức phạt vượt đèn đỏ');
    expect(neutral.detectedFromInput).toBe(false);
    expect(neutral.assistantPronoun).toBe(DEFAULT_CONVERSATION_PERSONA.assistantPronoun);

    // Lượt 2 hỏi ngắn không nêu đại từ -> kế thừa Em - Anh từ lịch sử phiên
    const history: ChatMessage[] = [
      {
        id: 'm1',
        sessionId: 's1',
        role: 'user',
        content: 'Anh ơi cho em hỏi vụ vượt đèn đỏ',
        createdAt: new Date().toISOString(),
      },
    ];
    const sticky = resolveSessionPersona('Lương thử việc 60 ngày', history);
    expect(sticky.assistantPronoun).toBe('Anh');
    expect(sticky.userPronoun).toBe('em');
  });

  it('Lát 1 (BDD 1): IntentRouter & buildGroundedPrompt phản hồi tự nhiên theo xưng hô và vẫn tương thích Spec 004/005', () => {
    const neutralGreeting = classifyIntent('Xin chào');
    expect(neutralGreeting.directAnswer).toBe(GREETING_RESPONSE);

    const emAnhGreeting = classifyIntent('Em chào anh ạ');
    expect(emAnhGreeting.intent).toBe('GREETING');
    expect(emAnhGreeting.directAnswer).toContain('Chào em');
    expect(emAnhGreeting.directAnswer).toContain('Anh là CivicLaw AI');

    // Legacy call giữ nguyên systemPrompt
    const legacyPrompt = buildGroundedPrompt('Vượt đèn đỏ?', testChunks);
    expect(legacyPrompt.systemInstruction).toBe(DEFAULT_RAG_CONFIG.systemPrompt);
    expect(legacyPrompt.systemInstruction).toContain('100% CĂN CỨ VÀ TRÍCH DẪN');
    expect(legacyPrompt.systemInstruction).not.toContain('CẤU TRÚC PHẢN HỒI BẮT BUỘC GỒM 3 PHẦN');

    // Conversational call kèm xưng hô Anh - Em
    const convPrompt = buildGroundedPrompt('không đội mũ bảo hiểm', testChunks, undefined, {
      persona: { assistantPronoun: 'Anh', userPronoun: 'em', detectedFromInput: true },
      rawUserQuery: 'Anh ơi hôm qua em quên đội mũ bảo hiểm',
    });
    expect(convPrompt.systemInstruction).toContain('Anh');
    expect(convPrompt.systemInstruction).toContain('em');
    expect(convPrompt.prompt).toContain('Anh ơi hôm qua em quên đội mũ bảo hiểm');
  });

  it('Lát 2 (BDD 2): Topic Shift tách sạch chủ đề cũ kể cả câu ngắn lẫn câu chuyển ý rõ ràng (Pure LLM-only)', async () => {
    const condenserLlm: ILlmProvider = {
      generate: vi.fn(async (prompt: string) => {
        if (prompt.includes('Thế còn ô tô')) {
          return { text: 'Hành vi vượt đèn đỏ đối với xe ô tô bị phạt bao nhiêu?' };
        }
        const match = prompt.match(/CÂU HỎI TIẾP NỐI MỚI NHẤT CỦA CÔNG DÂN:\s*"([^"]+)"/);
        return { text: match ? match[1] : '' };
      }),
    };
    const condenser = new RuleAndLlmQueryCondenser(condenserLlm);
    const trafficHistory: ChatMessage[] = [
      {
        id: 'm1',
        sessionId: 's1',
        role: 'user',
        content: 'Anh ơi vượt đèn đỏ xe máy phạt sao ạ?',
        standaloneQuery: 'Vượt đèn đỏ xe máy bị xử phạt bao nhiêu tiền?',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'm2',
        sessionId: 's1',
        role: 'assistant',
        content: 'Phạt 800.000 - 1.000.000 đồng.',
        createdAt: new Date().toISOString(),
      },
    ];

    // Câu ngắn nhưng là chủ đề độc lập -> KHÔNG ghép ngữ cảnh cũ
    const shortTopicShift = await condenser.condenseQuery('Lương thử việc', trafficHistory);
    expect(shortTopicShift.isCondensed).toBe(false);
    expect(shortTopicShift.standaloneQuery).toBe('Lương thử việc');

    // Câu chuyển ý rõ ràng -> tách sạch ngữ cảnh cũ
    const shiftRes = await condenser.condenseQuery(
      'À thôi bỏ qua vụ xe, cho em hỏi lương thử việc 60 ngày',
      trafficHistory
    );
    expect(shiftRes.isCondensed).toBe(false);
    expect(shiftRes.standaloneQuery.toLowerCase()).not.toContain('vượt đèn đỏ');

    // Câu nối tiếp thật sự -> LLM vẫn gộp đúng
    const followUp = await condenser.condenseQuery('Thế còn ô tô thì sao?', trafficHistory);
    expect(followUp.isCondensed).toBe(true);
    expect(followUp.standaloneQuery.toLowerCase()).toContain('ô tô');
  });

  it('Lát 3 (BDD 3 & 4): Hermes-style Query Rewrite Retry vòng 2 + giữ CitationVerifier + direct_clarification khi muốn tìm ý khác', async () => {
    const engine = new LegalSearchEngine(testChunks);
    const retriever = createRetrieverFromSearchEngine(engine);
    const gapRecorder = createGapRecorderFromQueue(engine.getGapQueue());

    const mockLlm: ILlmProvider = {
      generate: vi.fn(async (prompt: string, opts?: { systemInstruction?: string }) => {
        if (prompt.includes('THUẬT NGỮ PHÁP LUẬT') || prompt.includes('Viết lại truy vấn')) {
          if (prompt.includes('thử việc')) {
            return { text: 'thời gian thử việc 60 ngày cao đẳng' };
          }
          return { text: 'xe mô tô không đội mũ bảo hiểm phạt tiền' };
        }
        const questionPart = prompt.split('CÂU HỎI CỦA NGƯỜI DÙNG:')[1] || prompt;
        if (questionPart.includes('thử việc')) {
          const isAnhEm = opts?.systemInstruction?.includes('Anh') && opts?.systemInstruction?.includes('em');
          return {
            text: isAnhEm
              ? 'Chào em, theo [Khoản 2 Điều 25 Bộ luật Lao động 2019], thời gian thử việc tối đa 60 ngày đối với công việc cần trình độ cao đẳng trở lên nhé. Em muốn hỏi thêm ý khác không?'
              : 'Thời gian thử việc tối đa 60 ngày theo Khoản 2 Điều 25 Bộ luật Lao động 2019.',
          };
        }
        return {
          text: 'Chào em, theo [Điểm h Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP], người điều khiển xe mô tô không đội mũ bảo hiểm bị phạt từ 400.000 đồng đến 600.000 đồng. Em muốn hỏi thêm ý khác không?',
        };
      }),
    };

    const ragPipeline = new GroundedRagPipeline(
      retriever,
      gapRecorder,
      mockLlm,
      new RegexCitationVerifier()
    );

    const agent = new CivicLawAgent(
      { maxIterations: 3, confidenceThreshold: 0.65 },
      { ragPipeline, llmProvider: mockLlm, searchEngine: engine }
    );

    // 1. Câu đời thường dùng 'đội nón lá chắn' (miss vòng 1 -> rewrite thành 'không đội mũ bảo hiểm' -> vòng 2 trúng grounded!)
    const retryRes = await agent.process({
      query: 'Hôm qua bạn em đi xe hai bánh quên mang bảo vệ đầu bị thổi phạt sao?',
      rawUserQuery: 'Anh ơi hôm qua bạn em quên mang bảo vệ đầu bị thổi phạt sao?',
      persona: { assistantPronoun: 'Anh', userPronoun: 'em', detectedFromInput: true },
    });

    expect(retryRes.isGrounded).toBe(true);
    expect(retryRes.fallbackTriggered).toBe(false);
    expect(retryRes.citations.some((c) => c.docNumber === '168/2024/NĐ-CP')).toBe(true);
    expect(retryRes.thoughtTrace?.some((t) => t.includes('Query Rewrite') || t.includes('Iteration 2'))).toBe(true);

    // 2. Câu muốn tìm ý khác mở -> direct_clarification thân thiện không ghi rác GapQueue
    const switchIntentRes = await agent.process({
      query: 'Em muốn tìm hiểu ý khác được không anh?',
      persona: { assistantPronoun: 'Anh', userPronoun: 'em', detectedFromInput: true },
    });
    expect(switchIntentRes.decision?.action).toBe('direct_clarification');
    expect(switchIntentRes.isGrounded).toBe(true);
    expect(switchIntentRes.answer).toContain('em');
    expect(switchIntentRes.answer).toContain('Em cứ nhắn trực tiếp');
    expect(switchIntentRes.guidedTopics?.length).toBeGreaterThanOrEqual(4);

    // 2b. Câu chuyển chủ đề ĐÃ nêu rõ lĩnh vực hoặc nội dung -> KHÔNG bị chặn bởi direct_clarification
    const switchWithDomainRes = await agent.process({
      query: 'Em muốn chuyển chủ đề sang bảo hiểm xã hội',
    });
    expect(switchWithDomainRes.decision?.action).not.toBe('direct_clarification');
    expect(switchWithDomainRes.decision?.action).toBe('search_legal_code');

    const switchWithTopicRes = await agent.process({
      query: 'Cho em hỏi vấn đề khác về thời gian thử việc 60 ngày cao đẳng',
    });
    expect(switchWithTopicRes.decision?.action).toBe('search_legal_code');
    expect(switchWithTopicRes.isGrounded).toBe(true);

    // 3. Qua ContextualRagPipeline giữ nguyên Session-sticky Persona ở cả lượt hỏi lẫn lượt Cảm ơn
    const pipeline = new ContextualRagPipeline(
      new InMemorySessionStore(),
      new RuleAndLlmQueryCondenser(mockLlm),
      ragPipeline,
      undefined,
      agent
    );
    const turn1 = await pipeline.chat({
      sessionId: '',
      query: 'Em chào anh ạ',
    });
    expect(turn1.answer).toContain('Chào em');

    const turn2 = await pipeline.chat({
      sessionId: turn1.sessionId,
      query: 'Lương thử việc 60 ngày có đúng luật không?',
    });
    expect(turn2.isGrounded).toBe(true);
    expect(turn2.answer).toContain('Chào em');
    expect(turn2.citations.some((c) => c.fullReference.includes('Bộ luật Lao động 2019'))).toBe(true);
    expect(turn2.verifiedSources.some((s) => s.docNumber === '45/2019/QH14')).toBe(true);

    const turn3Thanks = await pipeline.chat({
      sessionId: turn1.sessionId,
      query: 'Cảm ơn',
    });
    expect(turn3Thanks.answer).toContain('em');
    expect(turn3Thanks.answer).toContain('Anh');

    // 4. BDD 4: Ngay cả khi câu chứa từ khóa giao thông ("mũ bảo hiểm"), CivicLawAgent vẫn giữ kết quả CitationVerifier (isGrounded: false) khi LLM bịa trích dẫn
    const hallucinatingLlm: ILlmProvider = {
      generate: vi.fn(async () => ({
        text: 'Chào em, theo [Điều 999 Nghị định 99/2099/NĐ-CP], mức phạt là 50 triệu đồng nhé.',
      })),
    };
    const strictRag = new GroundedRagPipeline(
      retriever,
      gapRecorder,
      hallucinatingLlm,
      new RegexCitationVerifier()
    );
    const strictAgent = new CivicLawAgent(
      { maxIterations: 3, confidenceThreshold: 0.65 },
      { ragPipeline: strictRag, llmProvider: hallucinatingLlm, searchEngine: engine }
    );
    const verifiedCheck = await strictAgent.process({
      query: 'xe mô tô không đội mũ bảo hiểm 400.000 đồng',
      persona: { assistantPronoun: 'Anh', userPronoun: 'em', detectedFromInput: true },
    });
    expect(verifiedCheck.isGrounded).toBe(false);
    expect(verifiedCheck.unverifiedCitations?.some((c) => c.includes('999'))).toBe(true);

    // 5. Query Rewrite Retry bảo toàn ngữ cảnh multi-turn từ activeQuery (không ghi đè bằng rawUserQuery thiếu chủ ngữ)
    const rewriteCapturePrompts: string[] = [];
    const rewriteLlm: ILlmProvider = {
      generate: vi.fn(async (prompt: string) => {
        if (prompt.includes('THUẬT NGỮ PHÁP LUẬT')) {
          rewriteCapturePrompts.push(prompt);
          return { text: 'xe mô tô không đội mũ bảo hiểm phạt tiền' };
        }
        return { text: 'Phạt 400.000 - 600.000 đồng theo Điểm h Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP.' };
      }),
    };
    const rewriteRag = new GroundedRagPipeline(
      retriever,
      gapRecorder,
      rewriteLlm,
      new RegexCitationVerifier()
    );
    const rewriteAgent = new CivicLawAgent(
      { maxIterations: 3, confidenceThreshold: 0.65 },
      { ragPipeline: rewriteRag, llmProvider: rewriteLlm, searchEngine: engine }
    );
    const rewriteMultiTurn = await rewriteAgent.process({
      query: 'Quy định xử phạt hành vi không cài quai mũ khi đi xe hai bánh đối với người ngồi sau?',
      rawUserQuery: 'Thế còn người ngồi sau?',
    });
    expect(rewriteMultiTurn.isGrounded).toBe(true);
    expect(rewriteCapturePrompts[0]).toContain('người ngồi sau');
    expect(rewriteCapturePrompts[0]).toContain('xe hai bánh');

    // 6. Vòng 1 trả chunks lệch điểm (isGrounded: true nhưng citations: [] vì LLM từ chối bịa) -> vẫn phải kích hoạt Vòng 2 Query Rewrite Retry
    let v1SearchCount = 0;
    const offTopicThenHitRag = {
      async query(req: { query: string }) {
        v1SearchCount++;
        if (v1SearchCount === 1) {
          return {
            answer: 'Hiện tại ngữ cảnh chưa có thông tin cụ thể về lỗi này.',
            isGrounded: true,
            confidenceScore: 0.72,
            citations: [],
            verifiedSources: [],
            fallbackTriggered: false,
          };
        }
        return {
          answer: 'Theo [Điểm h Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP], phạt 400.000 - 600.000 đồng.',
          isGrounded: true,
          confidenceScore: 0.93,
          citations: [
            {
              fullReference: 'Điểm h Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP',
              article: 'Điều 7',
              clause: 'Khoản 2',
              point: 'Điểm h',
              docNumber: '168/2024/NĐ-CP',
              isVerified: true,
            },
          ],
          verifiedSources: [testChunks[0]],
          fallbackTriggered: false,
        };
      },
    };
    const offTopicRetryAgent = new CivicLawAgent(
      { maxIterations: 3, confidenceThreshold: 0.65 },
      { ragPipeline: offTopicThenHitRag as any, llmProvider: rewriteLlm }
    );
    const offTopicRetryRes = await offTopicRetryAgent.process({
      query: 'vượt đèn đỏ xe máy bị phạt bao nhiêu',
    });
    expect(v1SearchCount).toBe(2);
    expect(offTopicRetryRes.citations.length).toBeGreaterThan(0);
    expect(offTopicRetryRes.thoughtTrace?.some((t) => t.includes('Query Rewrite'))).toBe(true);
  });
});
