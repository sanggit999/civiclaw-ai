import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchGatewayHealth,
  searchLaws,
  fetchUnresolvedQueries,
  updateUnresolvedQueryStatus,
  fetchSystemConfigs,
  updateSystemConfig,
  getGatewayBaseUrl,
  fetchAdminStats,
  fetchChatSessions,
  fetchChatSessionMessages,
  auditContractDirect,
} from '../../../admin/lib/api-client';

describe('Spec 009 - Web Admin API Client & Astryx Integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Lát 1 & 2: Gateway Health & Fallback Resilience', () => {
    it('Lấy trạng thái Gateway thành công khi Gateway online', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ok',
          uptimeSeconds: 125.4,
          timestamp: '2026-11-20T21:40:00.000Z',
          database: { connected: true, chunkCount: 4715 },
          llm: { configured: true, model: 'gemini-2.5-flash' },
        }),
      });

      const health = await fetchGatewayHealth();
      expect(health.status).toBe('ok');
      expect(health.database.connected).toBe(true);
      expect(health.database.chunkCount).toBe(4715);
      expect(health.llm.model).toBe('gemini-2.5-flash');
    });

    it('Tự động chuyển sang fallback degraded khi Gateway offline mà không làm sập UI', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused at port 3000'));

      const health = await fetchGatewayHealth();
      expect(health.status).toBe('degraded');
      expect(health.database.connected).toBe(false);
      expect(health.database.chunkCount).toBe(4715);
      expect(health.database.error).toContain('Connection refused');
    });
  });

  describe('Lát 3: Laws Browser Tra Cứu 4.715 Chunks', () => {
    it('Gọi API Gateway POST /search với query và domain hợp lệ', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: 'nồng độ cồn',
          domain: 'Giao thông',
          total: 1,
          results: [
            {
              id: 'chunk-100-d5',
              document_number: '100/2019/NĐ-CP',
              article_number: 'Điều 5',
              clause_number: 'Khoản 8',
              title: 'Xử phạt vi phạm nồng độ cồn',
              domain: 'Giao thông',
              content: 'Phạt tiền từ 30.000.000 đến 40.000.000 đồng...',
              score: 0.94,
              similarity: 0.94,
            },
          ],
        }),
      });

      const response = await searchLaws('nồng độ cồn', 'Giao thông', 5);
      expect(response.total).toBe(1);
      expect(response.results[0].document_number).toBe('100/2019/NĐ-CP');
      expect(response.results[0].article_number).toBe('Điều 5');
    });

    it('Fallback về mock offline khi Gateway chưa phản hồi', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const response = await searchLaws('sa thải', 'Lao động');
      expect(response.total).toBeGreaterThanOrEqual(1);
      expect(response.results[0].content).toBeDefined();
    });
  });

  describe('Lát 4: Knowledge Gaps & Cấu Hình Động', () => {
    it('Truy xuất và cập nhật trạng thái câu hỏi chưa giải quyết', async () => {
      const gaps = await fetchUnresolvedQueries();
      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps[0].query_text).toBeDefined();
      expect(gaps[0].hit_count).toBeGreaterThan(0);

      const updateRes = await updateUnresolvedQueryStatus('gap-001', 'resolved');
      expect(updateRes.success).toBe(true);
      expect(updateRes.status).toBe('resolved');
    });

    it('Đọc và cập nhật các tham số cấu hình động hệ thống', async () => {
      const configs = await fetchSystemConfigs();
      expect(configs.length).toBeGreaterThanOrEqual(3);

      const hybridCfg = configs.find((c) => c.key === 'hybrid_search_weights');
      expect(hybridCfg).toBeDefined();
      expect((hybridCfg?.value as Record<string, number>).vector_weight).toBe(0.7);

      const updateRes = await updateSystemConfig('confidence_threshold', 0.75);
      expect(updateRes.success).toBe(true);
      expect(updateRes.value).toBe(0.75);
    });
  });

  describe('Lát 5: Admin Stats, Chat Sessions Audit & Contract Testbed', () => {
    it('Lấy số liệu thống kê tổng hợp 5 bảng cơ sở dữ liệu', async () => {
      const stats = await fetchAdminStats();
      expect(stats.legalChunksCount).toBe(4715);
      expect(stats.chatSessionsCount).toBeGreaterThan(0);
      expect(stats.groundedRatioPercent).toBe(100);
      expect(stats.lastUpdated).toBeDefined();
    });

    it('Truy xuất danh sách phiên tư vấn và tin nhắn kiểm toán', async () => {
      const sessions = await fetchChatSessions();
      expect(Array.isArray(sessions)).toBe(true);

      const messages = await fetchChatSessionMessages('sess-001');
      expect(Array.isArray(messages)).toBe(true);
    });

    it('Rà soát hợp đồng kiểm toán pháp lý với Agentic Auditor', async () => {
      const report = await auditContractDirect('Hợp đồng thuê nhà đặt cọc 10 triệu...', 'RENTAL');
      expect(report.overallRisk).toBeDefined();
      expect(typeof report.riskScore).toBe('number');
      expect(report.findings.length).toBeGreaterThan(0);
    });
  });

  describe('Chính sách Chống Hardcode (Anti-Hardcode)', () => {
    it('Sử dụng cổng mặc định hoặc biến môi trường NEXT_PUBLIC_API_GATEWAY_URL an toàn', () => {
      const prevEnv = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
      delete process.env.NEXT_PUBLIC_API_GATEWAY_URL;

      const defaultUrl = getGatewayBaseUrl();
      expect(defaultUrl).toBe('http://localhost:3001');

      process.env.NEXT_PUBLIC_API_GATEWAY_URL = 'http://api.civiclaw.vn:8080';
      const customUrl = getGatewayBaseUrl();
      expect(customUrl).toBe('http://api.civiclaw.vn:8080');

      if (prevEnv) {
        process.env.NEXT_PUBLIC_API_GATEWAY_URL = prevEnv;
      } else {
        delete process.env.NEXT_PUBLIC_API_GATEWAY_URL;
      }
    });
  });
});
