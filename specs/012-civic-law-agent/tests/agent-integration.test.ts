import { describe, it, expect } from 'vitest';
import { InMemorySessionStore } from '../../../src/session/in-memory-session-store.js';
import { RuleAndLlmQueryCondenser } from '../../../src/session/query-condenser.js';
import { ContextualRagPipeline } from '../../../src/session/pipeline.js';
import { GroundedRagPipeline } from '../../../src/rag/pipeline.js';
import { MockLlmProvider } from '../../../src/rag/mock-llm-provider.js';
import { RegexCitationVerifier } from '../../../src/rag/citation-verifier.js';
import { LegalChunk } from '../../../src/ingestion/types.js';
import { CivicLawAgent } from '../../../src/agent/civic-law-agent.js';
import { ChatController } from '../../../src/api/controllers/chat-controller.js';
import { IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';

describe('Lát 5: Tích hợp CivicLawAgent vào ContextualRagPipeline & API Gateway', () => {
  const sampleLawChunks: LegalChunk[] = [
    {
      id: '168_2024_ND-CP_Điều_6_Khoản_3_Điểm_đ',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 6',
      clause: 'Khoản 3',
      point: 'Điểm đ',
      fullReference: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
      content: 'Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe mô tô vượt đèn đỏ.',
      keywords: ['vượt đèn đỏ', 'xe máy'],
    },
  ];

  function createPipelineHarness() {
    const sessionStore = new InMemorySessionStore();
    const condenser = new RuleAndLlmQueryCondenser();
    const mockLlm = new MockLlmProvider();
    const verifier = new RegexCitationVerifier();

    const mockRetriever = {
      async search(queryText: string) {
        const lower = queryText.toLowerCase();
        if (lower.includes('vượt đèn đỏ')) {
          return { topScore: 0.95, results: [{ chunk: sampleLawChunks[0], score: 0.95 }] };
        }
        return { topScore: 0.1, results: [] };
      },
    };

    const mockGapRecorder = {
      async recordQuery() {
        return null;
      },
    };

    mockLlm.setCannedResponse(
      'vượt đèn đỏ',
      'Theo Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP, hành vi vượt đèn đỏ xe máy bị phạt từ 400.000 đến 600.000 đồng.'
    );

    const ragCore = new GroundedRagPipeline(
      mockRetriever,
      mockGapRecorder,
      mockLlm,
      verifier
    );

    const agent = new CivicLawAgent(
      { enableExploratoryLandscape: true },
      { ragPipeline: ragCore, llmProvider: mockLlm }
    );

    const contextualPipeline = new ContextualRagPipeline(
      sessionStore,
      condenser,
      ragCore,
      undefined,
      agent
    );

    return { contextualPipeline, sessionStore, ragCore, agent };
  }

  function createMockRequest(body: unknown): IncomingMessage {
    const req = new EventEmitter() as unknown as IncomingMessage;
    req.headers = { 'content-type': 'application/json' };
    req.method = 'POST';

    process.nextTick(() => {
      req.emit('data', Buffer.from(JSON.stringify(body)));
      req.emit('end');
    });

    return req;
  }

  function createMockResponse(): {
    res: ServerResponse;
    getOutput: () => string;
    getStatusCode: () => number;
    getHeaders: () => Record<string, string>;
  } {
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let output = '';

    const res = {
      writeHead: (code: number, h?: Record<string, string>) => {
        statusCode = code;
        if (h) Object.assign(headers, h);
        return res;
      },
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      write: (data: string) => {
        output += data;
        return true;
      },
      end: (data?: string) => {
        if (data) output += data;
      },
    } as unknown as ServerResponse;

    return {
      res,
      getOutput: () => output,
      getStatusCode: () => statusCode,
      getHeaders: () => headers,
    };
  }

  it('1. Giữ nguyên IntentRouter phản hồi tức thì các câu chào hỏi ("Xin chào bạn!")', async () => {
    const { contextualPipeline } = createPipelineHarness();

    const result = await contextualPipeline.chat({
      sessionId: 'session-intent-1',
      query: 'Xin chào bạn!',
    });

    expect(result.isGrounded).toBe(true);
    expect(result.citations).toEqual([]);
    expect(result.answer).toContain('Xin chào Bạn!');
    expect(result.answer).toContain('CivicLaw AI');
  });

  it('2. Định tuyến câu hỏi tổng quan khám phá ("Cho tôi về Giao thông đường bộ") qua CivicLawAgent domain_landscape', async () => {
    const { contextualPipeline, sessionStore } = createPipelineHarness();
    const session = await sessionStore.createSession('Tư vấn Giao thông');

    const result = await contextualPipeline.chat({
      sessionId: session.id,
      query: 'Cho tôi về Giao thông đường bộ',
    });

    expect(result.isGrounded).toBe(true);
    expect(result.domain).toBe('TRAFFIC');
    expect(result.guidedTopics).toBeDefined();
    expect(result.guidedTopics!.length).toBeGreaterThanOrEqual(3);
    expect(result.citations.length).toBeGreaterThanOrEqual(1);

    // Kiểm tra câu trả lời tổng hợp phong phú và trích dẫn văn bản luật
    expect(result.answer).toContain('Giao thông đường bộ');
    expect(result.answer).toContain('168/2024/NĐ-CP');
    expect(result.answer).toContain('36/2024/QH15');

    // Kiểm tra lưu vết trong session store
    const history = await sessionStore.getRecentMessages(session.id);
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
    expect(history[1].citations).toBeDefined();
  });

  it('3. Định tuyến câu hỏi tổng quan Lao động ("Quy định về Lao động") kích hoạt BLLĐ 2019', async () => {
    const { contextualPipeline } = createPipelineHarness();

    const result = await contextualPipeline.chat({
      sessionId: 'session-broad-labor',
      query: 'Quy định về Lao động',
    });

    expect(result.isGrounded).toBe(true);
    expect(result.domain).toBe('LABOR');
    expect(result.answer).toContain('Lao động & Việc làm');
    expect(result.answer).toContain('45/2019/QH14');
  });

  it('4. Định tuyến câu hỏi vi phạm cụ thể ("Vượt đèn đỏ xe máy...") sang Grounded RAG search_legal_code', async () => {
    const { contextualPipeline } = createPipelineHarness();

    const result = await contextualPipeline.chat({
      sessionId: 'session-specific-1',
      query: 'Vượt đèn đỏ xe máy bị xử phạt bao nhiêu tiền?',
    });

    expect(result.isGrounded).toBe(true);
    expect(result.answer).toContain('400.000 đến 600.000 đồng');
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].docNumber).toBe('168/2024/NĐ-CP');
  });

  it('5. Định tuyến câu hỏi ngoài cơ sở dữ liệu ("Tội giết người cướp tài sản...") sang honest_fallback', async () => {
    const { contextualPipeline } = createPipelineHarness();

    const result = await contextualPipeline.chat({
      sessionId: 'session-oos-1',
      query: 'Tội giết người cướp tài sản bị phạt tù mấy năm?',
    });

    expect(result.isGrounded).toBe(false);
    expect(result.fallbackTriggered).toBe(true);
    expect(result.answer).toContain('Hình sự');
    expect(result.answer).toContain('nằm ngoài phạm vi 5 bộ luật trên');
  });

  it('6. REST API Controller (POST /api/v1/chat): Trả về đầy đủ thông tin domain và guidedTopics', async () => {
    const { contextualPipeline } = createPipelineHarness();
    const controller = new ChatController(contextualPipeline);

    const req = createMockRequest({ query: 'Cho tôi về Giao thông đường bộ' });
    const { res, getOutput, getStatusCode } = createMockResponse();

    await controller.handleChat(req, res);

    expect(getStatusCode()).toBe(200);
    const json = JSON.parse(getOutput());
    expect(json.success).toBe(true);
    expect(json.data.domain).toBe('TRAFFIC');
    expect(json.data.guidedTopics).toBeDefined();
    expect(json.data.citations.length).toBeGreaterThan(0);
  });

  it('7. SSE Streaming Controller (POST /api/v1/chat/stream): Phát đầy đủ sự kiện guided_topics và done', async () => {
    const { contextualPipeline } = createPipelineHarness();
    const controller = new ChatController(contextualPipeline);

    const req = createMockRequest({ query: 'Cho tôi về Giao thông đường bộ' });
    const { res, getOutput, getStatusCode, getHeaders } = createMockResponse();

    await controller.handleChatStream(req, res);

    expect(getStatusCode()).toBe(200);
    expect(getHeaders()['Content-Type']).toContain('text/event-stream');

    const output = getOutput();
    expect(output).toContain('event: citations');
    expect(output).toContain('event: guided_topics');
    expect(output).toContain('event: token');
    expect(output).toContain('event: done');
    expect(output).toContain('"domain":"TRAFFIC"');
    expect(output).toContain('"isGrounded":true');
  });
});
