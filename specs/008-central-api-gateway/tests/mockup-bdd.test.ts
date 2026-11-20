import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApiGateway } from '../../../src/api/gateway-factory.js';
import { ApiGatewayServer } from '../../../src/api/gateway-server.js';
import { IContextualRagPipeline } from '../../../src/session/pipeline.js';
import { ContractLifecycleManager } from '../../../src/contract/contract-lifecycle-manager.js';
import { InMemoryContractVersionStore } from '../../../src/contract/in-memory-version-store.js';

describe('BDD Scenarios: Spec 008 Central API Gateway & Streaming', () => {
  let server: ApiGatewayServer;
  let baseUrl: string;

  const mockRagPipeline: IContextualRagPipeline = {
    chat: async (req) => ({
      sessionId: req.sessionId || 'bdd-session-123',
      query: req.query,
      standaloneQuery: 'Hành vi vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?',
      answer: 'Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với xe mô tô, xe gắn máy.',
      citations: [
        {
          docNumber: '168/2024/NĐ-CP',
          article: 'Điều 6',
          clause: 'Khoản 3',
          point: 'Điểm đ',
          fullReference: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
          isVerified: true,
        },
      ],
      isGrounded: true,
      confidenceScore: 0.98,
    }),
  };

  const store = new InMemoryContractVersionStore();
  const lifecycleManager = new ContractLifecycleManager({ versionStore: store });

  beforeAll(async () => {
    server = createApiGateway({
      config: { port: 0 },
      ragPipeline: mockRagPipeline,
      lifecycleManager,
      versionStore: store,
    });
    await server.start();
    baseUrl = `http://localhost:${server.getPort()}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  // Kịch bản 1: Kiểm tra trạng thái hệ thống thành công (Happy Path Healthcheck)
  it('Kịch bản 1: GET /api/v1/health trả về HTTP 200 OK kèm uptime và status ok', async () => {
    // Given: Gateway đang chạy
    // When: Client gọi GET /api/v1/health
    const res = await fetch(`${baseUrl}/api/v1/health`);

    // Then: Phản hồi 200 OK với thông tin trạng thái
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toContain('CivicLaw AI');
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  // Kịch bản 2: Hỏi đáp pháp lý truyền phát thời gian thực (Chat SSE Streaming)
  it('Kịch bản 2: POST /api/v1/chat/stream phát chuỗi sự kiện SSE có trích dẫn nguồn luật', async () => {
    // Given: Client gửi câu hỏi cần stream
    // When: Gọi POST /api/v1/chat/stream
    const res = await fetch(`${baseUrl}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Vượt đèn đỏ xe máy phạt bao nhiêu?',
        sessionId: 'bdd-session-123',
      }),
    });

    // Then: Nhận luồng text/event-stream đầy đủ các pha
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');

    const sseData = await res.text();
    expect(sseData).toContain('event: progress');
    expect(sseData).toContain('event: citations');
    expect(sseData).toContain('168/2024/NĐ-CP');
    expect(sseData).toContain('event: token');
    expect(sseData).toContain('event: done');
  });

  // Kịch bản 3: Tải lên và thẩm định vòng đời hợp đồng (Contract Audit API)
  it('Kịch bản 3: POST /api/v1/contracts/audit khởi tạo hồ sơ và trả về điểm số an toàn', async () => {
    // Given: Văn bản hợp đồng cần thẩm định
    const payload = {
      title: 'Hợp đồng lao động mẫu BDD',
      category: 'labor',
      content: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐiều 1: Công việc. Điều 2: Lương 15 triệu/tháng.',
    };

    // When: Gọi POST /api/v1/contracts/audit
    const res = await fetch(`${baseUrl}/api/v1/contracts/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Then: Trả về HTTP 200, tạo phiên bản v1
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.document.id).toBeDefined();
    expect(body.data.version.versionNumber).toBe(1);
    expect(body.data.version.auditReport).toBeDefined();
  });

  // Kịch bản 4: Xử lý ngoại lệ và mã lỗi chuẩn RESTful (Error Boundary)
  it('Kịch bản 4: Trả về HTTP 400 khi thiếu query và HTTP 409 khi tải file trùng lặp', async () => {
    // Test 1: Query rỗng -> 400 Bad Request
    const res400 = await fetch(`${baseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '   ' }),
    });
    expect(res400.status).toBe(400);
    const body400 = await res400.json();
    expect(body400.error.code).toBe('BAD_REQUEST');

    // Test 2: Upload trùng lặp trên cùng documentId -> 409 Conflict
    const createRes = await fetch(`${baseUrl}/api/v1/contracts/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'HĐLĐ Test Duplicate BDD',
        category: 'labor',
        content: 'Nội dung duy nhất không thay đổi 123.',
      }),
    });
    const createdJson = await createRes.json();
    const docId = createdJson.data.document.id;

    // Cố tình tải lại đúng nội dung
    const res409 = await fetch(`${baseUrl}/api/v1/contracts/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: docId,
        content: 'Nội dung duy nhất không thay đổi 123.',
      }),
    });

    expect(res409.status).toBe(409);
    const body409 = await res409.json();
    expect(body409.error.code).toBe('DUPLICATE_CONTENT_ERROR');
  });
});
