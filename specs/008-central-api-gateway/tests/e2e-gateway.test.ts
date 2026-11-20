import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApiGateway } from '../../../src/api/gateway-factory.js';
import { ApiGatewayServer } from '../../../src/api/gateway-server.js';
import { IContextualRagPipeline } from '../../../src/session/pipeline.js';
import { LegalSearchEngine } from '../../../src/search/engine.js';
import { ContractLifecycleManager } from '../../../src/contract/contract-lifecycle-manager.js';
import { InMemoryContractVersionStore } from '../../../src/contract/in-memory-version-store.js';

describe('Slice 4: E2E Live Gateway Server Integration Test', () => {
  let server: ApiGatewayServer;
  let baseUrl: string;

  const mockRagPipeline: IContextualRagPipeline = {
    chat: async (req) => ({
      sessionId: req.sessionId || 'e2e-session-1',
      query: req.query,
      standaloneQuery: req.query,
      answer: 'Căn cứ Nghị định 168/2024/NĐ-CP, mức phạt là 500.000đ.',
      citations: [
        {
          docNumber: '168/2024/NĐ-CP',
          article: 'Điều 6',
          fullReference: 'Điều 6 Nghị định 168/2024/NĐ-CP',
        },
      ],
      isGrounded: true,
      confidenceScore: 0.9,
    }),
  };

  const store = new InMemoryContractVersionStore();
  const lifecycleManager = new ContractLifecycleManager({ versionStore: store });
  const searchEngine = new LegalSearchEngine([], { defaultConfidenceThreshold: 0.5 });

  beforeAll(async () => {
    server = createApiGateway({
      config: { port: 0 },
      ragPipeline: mockRagPipeline,
      lifecycleManager,
      versionStore: store,
      searchEngine,
    });
    await server.start();
    const port = server.getPort();
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  it('GET /api/v1/health: trả về HTTP 200 OK qua mạng thật', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.service).toBe('CivicLaw AI Central API Gateway');
  });

  it('OPTIONS /api/v1/chat: hỗ trợ CORS preflight với HTTP 204', async () => {
    const res = await fetch(`${baseUrl}/api/v1/chat`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://my-web-admin.local' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('POST /api/v1/chat: hỏi đáp thành công qua REST API', async () => {
    const res = await fetch(`${baseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Vượt đèn đỏ xe máy' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.answer).toContain('500.000đ');
  });

  it('POST /api/v1/chat/stream: nhận dữ liệu Server-Sent Events (SSE) thời gian thực', async () => {
    const res = await fetch(`${baseUrl}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ query: 'Vượt đèn đỏ ô tô' }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');

    const text = await res.text();
    expect(text).toContain('event: progress');
    expect(text).toContain('event: citations');
    expect(text).toContain('event: token');
    expect(text).toContain('event: done');
  });

  it('POST /api/v1/contracts/audit: thẩm định hợp đồng qua mạng thật', async () => {
    const res = await fetch(`${baseUrl}/api/v1/contracts/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'HĐLĐ E2E Test',
        category: 'labor',
        content: 'Điều 1: Công việc. Điều 2: Lương 10 triệu.',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.document.title).toBe('HĐLĐ E2E Test');
    expect(json.data.version.versionNumber).toBe(1);
  });
});
