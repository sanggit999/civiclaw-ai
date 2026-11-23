import { describe, it, expect, vi } from 'vitest';
import {
  CivicLawAgent,
  CivicLawAgentDependencies,
} from '../../../src/agent/civic-law-agent.js';
import {
  getAllDomainLandscapes,
  getDomainLandscape,
  detectExploratoryDomain,
  isOutOfScopeDomain,
  formatLandscapeSynthesis,
  formatHonestFallback,
} from '../../../src/agent/domain-landscape.js';
import {
  DEFAULT_CIVIC_LAW_AGENT_OPTIONS,
} from '../../../src/agent/types.js';
import { IRagPipeline, RagQueryRequest, RagQueryResponse } from '../../../src/rag/types.js';

describe('CivicLaw Legal Agent & Domain Landscape (Bounded ReAct)', () => {
  describe('1. Domain Landscape Metadata & Synthesis (5 Legal Codes)', () => {
    it('Cung cấp đầy đủ siêu dữ liệu của cả 5 bộ luật chính thống trong DB', () => {
      const allLandscapes = getAllDomainLandscapes();
      const domains = Object.keys(allLandscapes);

      expect(domains).toContain('TRAFFIC');
      expect(domains).toContain('LABOR');
      expect(domains).toContain('INSURANCE');
      expect(domains).toContain('HOUSING');
      expect(domains).toContain('CIVIL');

      // 1. TRAFFIC: Nghị định 168/2024 & Luật 36/2024
      const traffic = allLandscapes.TRAFFIC;
      expect(traffic.documents).toHaveLength(2);
      expect(traffic.documents.some((d) => d.docNumber === '168/2024/NĐ-CP')).toBe(true);
      expect(traffic.documents.some((d) => d.docNumber === '36/2024/QH15')).toBe(true);
      expect(traffic.keyPillars).toHaveLength(4);
      expect(traffic.guidedTopics.length).toBeGreaterThanOrEqual(4);

      // 2. LABOR: Bộ luật Lao động 2019
      const labor = allLandscapes.LABOR;
      expect(labor.documents.some((d) => d.docNumber === '45/2019/QH14')).toBe(true);
      expect(labor.keyPillars).toHaveLength(4);

      // 3. INSURANCE: Luật Bảo hiểm xã hội 2024
      const insurance = allLandscapes.INSURANCE;
      expect(insurance.documents.some((d) => d.docNumber === '41/2024/QH15')).toBe(true);
      expect(insurance.keyPillars).toHaveLength(4);

      // 4. HOUSING: Luật Nhà ở 2023
      const housing = allLandscapes.HOUSING;
      expect(housing.documents.some((d) => d.docNumber === '27/2023/QH15')).toBe(true);
      expect(housing.keyPillars).toHaveLength(4);

      // 5. CIVIL: Bộ luật Dân sự 2015
      const civil = allLandscapes.CIVIL;
      expect(civil.documents.some((d) => d.docNumber === '91/2015/QH13')).toBe(true);
      expect(civil.keyPillars).toHaveLength(4);
    });

    it('Truy xuất đúng bản đồ lĩnh vực qua các alias chuẩn hóa', () => {
      expect(getDomainLandscape('traffic')?.domain).toBe('TRAFFIC');
      expect(getDomainLandscape('GIAO_THONG')?.domain).toBe('TRAFFIC');
      expect(getDomainLandscape('social_insurance')?.domain).toBe('INSURANCE');
      expect(getDomainLandscape('BHXH')?.domain).toBe('INSURANCE');
      expect(getDomainLandscape('nhà ở')?.domain).toBe('HOUSING');
      expect(getDomainLandscape('dan_su')?.domain).toBe('CIVIL');
      expect(getDomainLandscape('UNKNOWN_DOMAIN')).toBeNull();
    });

    it('Nhận diện chính xác câu hỏi tổng quan khám phá lĩnh vực (Exploratory Inquiries)', () => {
      // Traffic broad queries
      const r1 = detectExploratoryDomain('Cho Tôi về Giao thông đường bộ');
      expect(r1).not.toBeNull();
      expect(r1?.domain).toBe('TRAFFIC');
      expect(r1?.isExploratory).toBe(true);

      const r2 = detectExploratoryDomain('Quy định về Giao thông đường bộ');
      expect(r2?.domain).toBe('TRAFFIC');

      // Labor broad queries
      const r3 = detectExploratoryDomain('Quy định về Lao động');
      expect(r3?.domain).toBe('LABOR');
      expect(r3?.isExploratory).toBe(true);

      // Insurance broad queries
      const r4 = detectExploratoryDomain('Tìm hiểu về Bảo hiểm xã hội');
      expect(r4?.domain).toBe('INSURANCE');

      // Housing broad queries
      const r5 = detectExploratoryDomain('Cho Tôi về Nhà ở');
      expect(r5?.domain).toBe('HOUSING');

      // Civil broad queries
      const r6 = detectExploratoryDomain('Bộ luật Dân sự 2015');
      expect(r6?.domain).toBe('CIVIL');
    });

    it('Phân biệt rõ ràng: KHÔNG nhận diện câu hỏi vi phạm chi tiết là câu hỏi tổng quan', () => {
      expect(detectExploratoryDomain('Vượt đèn đỏ xe máy phạt bao nhiêu?')).toBeNull();
      expect(detectExploratoryDomain('Mức phạt nồng độ cồn đối với người điều khiển xe máy')).toBeNull();
      expect(detectExploratoryDomain('Thời gian thử việc tối đa theo Bộ luật Lao động là bao lâu?')).toBeNull();
      expect(detectExploratoryDomain('Điều kiện rút bảo hiểm xã hội một lần mới nhất')).toBeNull();
      expect(detectExploratoryDomain('Quỹ bảo trì 2% chung cư do ai quản lý?')).toBeNull();
      expect(detectExploratoryDomain('Lãi suất cho vay tối đa là bao nhiêu?')).toBeNull();
    });

    it('Phát hiện chính xác các câu hỏi nằm ngoài phạm vi 5 bộ luật (Out of Scope)', () => {
      const criminal = isOutOfScopeDomain('Tội phạm cướp giật tài sản bị xử phạt bao nhiêu năm tù?');
      expect(criminal.isOutOfScope).toBe(true);
      expect(criminal.detectedTopic).toContain('Hình sự');

      const tax = isOutOfScopeDomain('Hướng dẫn kê khai thuế thu nhập cá nhân và thuế giá trị gia tăng');
      expect(tax.isOutOfScope).toBe(true);
      expect(tax.detectedTopic).toContain('Thuế');

      const customs = isOutOfScopeDomain('Thủ tục hải quan thông quan hàng hóa nhập khẩu');
      expect(customs.isOutOfScope).toBe(true);

      // Câu hỏi bình thường thuộc 5 bộ luật thì isOutOfScope phải là false
      expect(isOutOfScopeDomain('Vượt đèn đỏ xe máy').isOutOfScope).toBe(false);
      expect(isOutOfScopeDomain('Nghỉ việc cần báo trước bao nhiêu ngày').isOutOfScope).toBe(false);
    });

    it('Định dạng bản đồ tổng hợp (formatLandscapeSynthesis) sắc nét, đầy đủ cấu trúc Markdown', () => {
      const trafficLandscape = getDomainLandscape('TRAFFIC')!;
      const markdown = formatLandscapeSynthesis(trafficLandscape);

      expect(markdown).toContain('### 🚦 Bản Đồ Quy Định Pháp Luật: Giao thông đường bộ');
      expect(markdown).toContain('168/2024/NĐ-CP');
      expect(markdown).toContain('36/2024/QH15');
      expect(markdown).toContain('4 Trọng Tâm Quy Định Cốt Lõi');
      expect(markdown).toContain('Gợi Ý Chủ Đề Tra Cứu Nhanh');
      expect(markdown).toContain('100% dữ liệu được kiểm chứng');
    });

    it('Định dạng thông báo từ chối trung thực (formatHonestFallback) văn minh, hướng dẫn nguồn chính phủ', () => {
      const fallbackMsg = formatHonestFallback('Tội giết người', 'Hình sự (Bộ luật Hình sự)');
      expect(fallbackMsg).toContain('⚠️ **Thông Báo Phạm Vi Cơ Sở Dữ Liệu Tra Cứu:**');
      expect(fallbackMsg).toContain('Hình sự (Bộ luật Hình sự)');
      expect(fallbackMsg).toContain('5 lĩnh vực pháp luật cốt lõi');
      expect(fallbackMsg).toContain('vanban.chinhphu.vn');
    });
  });

  describe('2. CivicLawAgent Bounded ReAct Execution Flow', () => {
    it('Tuân thủ cấu hình mặc định (Anti-Hardcode)', () => {
      expect(DEFAULT_CIVIC_LAW_AGENT_OPTIONS.maxIterations).toBe(3);
      expect(DEFAULT_CIVIC_LAW_AGENT_OPTIONS.confidenceThreshold).toBe(0.65);
      expect(DEFAULT_CIVIC_LAW_AGENT_OPTIONS.enableExploratoryLandscape).toBe(true);
    });

    it('Lát 1 (Core Broad Query): Kích hoạt domain_landscape khi người dùng hỏi tổng quan', async () => {
      const agent = new CivicLawAgent();

      const response = await agent.process({
        query: 'Cho Tôi về Giao thông đường bộ',
      });

      // 1. Kiểm tra quyết định ReAct
      expect(response.decision).toBeDefined();
      expect(response.decision?.action).toBe('domain_landscape');
      expect(response.decision?.domain).toBe('TRAFFIC');
      expect(response.decision?.isExploratory).toBe(true);

      // 2. Kiểm tra chuỗi suy luận ReAct
      expect(response.thoughtTrace).toBeDefined();
      expect(response.thoughtTrace?.some((t) => t.includes('domain_landscape'))).toBe(true);

      // 3. Kiểm tra dữ liệu kết quả
      expect(response.isGrounded).toBe(true);
      expect(response.confidenceScore).toBeGreaterThanOrEqual(0.9);
      expect(response.citations.length).toBeGreaterThanOrEqual(2);
      expect(response.citations.some((c) => c.docNumber === '168/2024/NĐ-CP')).toBe(true);
      expect(response.guidedTopics).toBeDefined();
      expect(response.guidedTopics!.length).toBeGreaterThanOrEqual(4);
      expect(response.fallbackTriggered).toBe(false);
      expect(response.answer).toContain('Bản Đồ Quy Định Pháp Luật: Giao thông đường bộ');
    });

    it('Lát 2 (Specific Violation): Định tuyến sang search_legal_code khi hỏi vi phạm cụ thể', async () => {
      const agent = new CivicLawAgent();

      const response = await agent.process({
        query: 'Vượt đèn đỏ xe máy phạt bao nhiêu?',
      });

      // 1. Kiểm tra quyết định ReAct
      expect(response.decision?.action).toBe('search_legal_code');
      expect(response.decision?.isExploratory).toBe(false);

      // 2. Kiểm tra kết quả
      expect(response.isGrounded).toBe(true);
      expect(response.citations.some((c) => c.docNumber === '168/2024/NĐ-CP')).toBe(true);
      expect(response.answer).toContain('Nghị định 168/2024/NĐ-CP');
      expect(response.answer).toContain('800.000');
    });

    it('Lát 3 (Honest Fallback): Phản hồi trung thực khi câu hỏi ngoài phạm vi DB (Hình sự)', async () => {
      const agent = new CivicLawAgent();

      const response = await agent.process({
        query: 'Tội phạm cướp giật tài sản bị xử phạt bao nhiêu năm tù?',
      });

      // 1. Kiểm tra quyết định ReAct
      expect(response.decision?.action).toBe('honest_fallback');

      // 2. Kiểm tra phản hồi trung thực
      expect(response.fallbackTriggered).toBe(true);
      expect(response.isGrounded).toBe(false);
      expect(response.confidenceScore).toBe(0);
      expect(response.citations).toHaveLength(0);
      expect(response.answer).toContain('Thông Báo Phạm Vi Cơ Sở Dữ Liệu Tra Cứu');
      expect(fallbackCheck(response.answer)).toBe(true);
    });

    it('Tích hợp mượt mà với RAG Pipeline tùy biến (Mock Dependency Injection)', async () => {
      const mockRagPipeline: IRagPipeline = {
        query: vi.fn().mockResolvedValue({
          answer: 'Theo Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP, mức phạt là 800.000đ - 1.000.000đ.',
          isGrounded: true,
          confidenceScore: 0.96,
          citations: [
            {
              fullReference: 'Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
              article: 'Điều 6',
              clause: 'Khoản 3',
              docNumber: '168/2024/NĐ-CP',
              isVerified: true,
            },
          ],
          verifiedSources: [],
          fallbackTriggered: false,
        } as RagQueryResponse),
      };

      const agent = new CivicLawAgent(undefined, { ragPipeline: mockRagPipeline });

      const response = await agent.process({
        query: 'Vượt đèn đỏ xe máy bị phạt như thế nào?',
      });

      expect(mockRagPipeline.query).toHaveBeenCalledTimes(1);
      expect(response.isGrounded).toBe(true);
      expect(response.answer).toContain('Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP');
      expect(response.decision?.action).toBe('search_legal_code');
    });

    it('Chặn lỗi đầu vào rỗng (Input Validation Trust Boundary)', async () => {
      const agent = new CivicLawAgent();
      await expect(agent.process({ query: '   ' })).rejects.toThrow('không được để trống');
    });

    it('Hỗ trợ gọi qua alias method query() tương thích IRagPipeline', async () => {
      const agent = new CivicLawAgent();
      const response = await agent.query({
        query: 'Quy định về Lao động',
      });
      expect(response.decision?.action).toBe('domain_landscape');
      expect(response.domain).toBe('LABOR');
      expect(response.isGrounded).toBe(true);
    });
  });
});

function fallbackCheck(text: string): boolean {
  return text.includes('5 lĩnh vực pháp luật cốt lõi') && text.includes('vanban.chinhphu.vn');
}
