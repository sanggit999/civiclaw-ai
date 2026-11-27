import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { LegalSearchEngine } from '../../../src/search/engine.js';
import { KnowledgeGapQueue } from '../../../src/search/gap-queue.js';
import { SearchController } from '../../../src/api/controllers/search-controller.js';
import { normalizeDomain } from '../../../src/storage/types.js';
import { LegalChunk } from '../../../src/ingestion/types.js';
import { searchLaws, fetchLegalDomains } from '../../../admin/lib/api-client.js';

describe('Spec 013 - Unified Legal Search, Canonical Domain & Admin Browse', () => {
  let gapQueue: KnowledgeGapQueue;
  let engine: LegalSearchEngine;

  const mockChunks: LegalChunk[] = [
    {
      id: '168_2024_D7_K2_Pb',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 7',
      clause: 'Khoản 2',
      point: 'Điểm b',
      fullReference: 'Điểm b Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP',
      content:
        'Điều 7. Xử phạt, trừ điểm giấy phép lái xe của người điều khiển xe mô tô, xe gắn máy\n' +
        '2. Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe:\n' +
        'b) Không đội mũ bảo hiểm cho người đi mô tô, xe máy khi tham gia giao thông trên đường bộ;',
      keywords: ['400.000 đồng', '600.000 đồng', 'xe mô tô', 'mũ bảo hiểm'],
    },
    {
      id: '36_2024_D33_K1',
      docNumber: '36/2024/QH15',
      domain: 'TRAFFIC',
      article: 'Điều 33',
      clause: 'Khoản 1',
      fullReference: 'Khoản 1 Điều 33 Luật Trật tự, an toàn giao thông đường bộ 2024',
      content:
        'Điều 33. Người lái xe, người được chở trên xe mô tô, xe gắn máy, xe đạp máy phải đội mũ bảo hiểm theo đúng quy chuẩn kỹ thuật quốc gia và cài quai đúng quy cách.',
      keywords: ['xe mô tô', 'mũ bảo hiểm'],
    },
    {
      id: '45_2019_D25_K1',
      docNumber: '45/2019/QH14',
      domain: 'LABOR',
      article: 'Điều 25',
      clause: 'Khoản 1',
      fullReference: 'Khoản 1 Điều 25 Bộ luật Lao động 2019',
      content:
        'Điều 25. Thời gian thử việc\n' +
        'Thời gian thử việc do hai bên thỏa thuận căn cứ vào tính chất và mức độ phức tạp của công việc nhưng chỉ được thử việc một lần đối với một công việc và bảo đảm điều kiện không quá 60 ngày đối với công việc có chức danh nghề nghiệp cần trình độ chuyên môn, kỹ thuật từ cao đẳng trở lên.',
      keywords: ['thử việc', 'người lao động'],
    },
    {
      id: '41_2024_D70_K1',
      docNumber: '41/2024/QH15',
      domain: 'SOCIAL_INSURANCE',
      article: 'Điều 70',
      clause: 'Khoản 1',
      fullReference: 'Khoản 1 Điều 70 Luật Bảo hiểm xã hội 2024',
      content:
        'Điều 70. Hưởng bảo hiểm xã hội một lần đối với người lao động đóng bảo hiểm xã hội.',
      keywords: ['bảo hiểm xã hội'],
    },
    {
      id: '27_2023_D160_K1',
      docNumber: '27/2023/QH15',
      domain: 'HOUSING',
      article: 'Điều 160',
      clause: 'Khoản 1',
      fullReference: 'Khoản 1 Điều 160 Luật Nhà ở 2023',
      content:
        'Điều 160. Điều kiện của nhà ở tham gia giao dịch mua bán, cho thuê mua, tặng cho, đổi, thế chấp, góp vốn bằng nhà ở.',
      keywords: ['nhà ở'],
    },
  ];

  beforeEach(() => {
    gapQueue = new KnowledgeGapQueue();
    engine = new LegalSearchEngine(mockChunks, gapQueue);
  });

  it('BDD 2: Chuẩn hóa Canonical Domain cho mọi biến thể Anh/Việt/Alias cũ', () => {
    expect(normalizeDomain('traffic')).toBe('TRAFFIC');
    expect(normalizeDomain('Giao thông')).toBe('TRAFFIC');
    expect(normalizeDomain('Giao thông đường bộ')).toBe('TRAFFIC');
    expect(normalizeDomain('INSURANCE')).toBe('SOCIAL_INSURANCE');
    expect(normalizeDomain('Bảo hiểm xã hội')).toBe('SOCIAL_INSURANCE');
    expect(normalizeDomain('BHXH')).toBe('SOCIAL_INSURANCE');
    expect(normalizeDomain('Lao động')).toBe('LABOR');
    expect(normalizeDomain('Nhà ở')).toBe('HOUSING');
    expect(normalizeDomain('Dân sự')).toBe('CIVIL');

    const resTrafficVi = engine.search({ text: 'mũ bảo hiểm', domain: 'Giao thông', mode: 'admin' });
    expect(resTrafficVi.isFound).toBe(true);
    expect(resTrafficVi.results.length).toBe(2);

    const resBhxhVi = engine.search({ text: 'bảo hiểm xã hội', domain: 'Bảo hiểm xã hội', mode: 'admin' });
    expect(resBhxhVi.isFound).toBe(true);
    expect(resBhxhVi.results[0].chunk.docNumber).toBe('41/2024/QH15');
  });

  it('BDD 3: Hỗ trợ Browse Mode (query rỗng) + lọc docNumber + phân trang và không ghi GapQueue', () => {
    const browseAll = engine.search({
      text: '',
      mode: 'admin',
      page: 1,
      limit: 2,
    });
    expect(browseAll.isFound).toBe(true);
    expect(browseAll.searchMode).toBe('browse');
    expect(browseAll.results).toHaveLength(2);
    expect(browseAll.totalMatches).toBe(5);
    expect(gapQueue.getAll()).toHaveLength(0);

    const browsePage2 = engine.search({
      text: '',
      domain: 'Giao thông',
      docNumber: '168/2024/NĐ-CP',
      mode: 'admin',
      page: 1,
      limit: 10,
    });
    expect(browsePage2.isFound).toBe(true);
    expect(browsePage2.totalMatches).toBe(1);
    expect(browsePage2.results[0].chunk.docNumber).toBe('168/2024/NĐ-CP');
  });

  it('BDD 4: Tìm trúng điều luật khi nhập nội dung tranh chấp pháp lý dài (15-25 từ)', () => {
    const longDispute =
      'Hôm qua tôi đi xe máy không đội mũ bảo hiểm trên đường phố thì bị cảnh sát xử phạt bao nhiêu tiền vậy nhờ tư vấn giúp?';
    const res = engine.search({
      text: longDispute,
      mode: 'admin',
      limit: 5,
    });

    expect(res.isFound).toBe(true);
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].chunk.docNumber).toBe('168/2024/NĐ-CP');
    expect(res.totalMatches).toBeLessThan(mockChunks.length); // Không đếm nhầm các chunk chỉ trùng từ nhiễu
    expect(res.loggedToKnowledgeGap).toBe(false);

    const laborDispute =
      'Công ty tôi ký hợp đồng thử việc 90 ngày đối với nhân viên kỹ thuật trình độ cao đẳng thì có đúng quy định pháp luật không?';
    const laborRes = engine.search({
      text: laborDispute,
      domain: 'Lao động',
      mode: 'admin',
      limit: 5,
    });
    expect(laborRes.isFound).toBe(true);
    expect(laborRes.results[0].chunk.docNumber).toBe('45/2019/QH14');
  });

  it('BDD 5: Thống kê getDomainSummary() và API /domains + SearchController hỗ trợ browse & docNumber', async () => {
    const summary = engine.getDomainSummary();
    const traffic = summary.find((d) => d.code === 'TRAFFIC');
    expect(traffic?.chunkCount).toBe(2);
    expect(traffic?.documents.map((doc) => doc.docNumber).sort()).toEqual(['168/2024/NĐ-CP', '36/2024/QH15']);

    const controller = new SearchController(engine);
    const mockReq = Readable.from([
      Buffer.from(JSON.stringify({ query: '', domain: 'Giao thông', docNumber: '36/2024/QH15', mode: 'admin' })),
    ]) as unknown as IncomingMessage;

    let responseStatus = 0;
    let responseBody = '';
    const mockRes = {
      writeHead: (code: number) => {
        responseStatus = code;
      },
      end: (body: string) => {
        responseBody = body;
      },
    } as unknown as ServerResponse;

    await controller.handleSearch(mockReq, mockRes);
    expect(responseStatus).toBe(200);
    const parsed = JSON.parse(responseBody);
    expect(parsed.success).toBe(true);
    expect(parsed.data.results).toHaveLength(1);
    expect(parsed.data.results[0].chunk.docNumber).toBe('36/2024/QH15');

    // Kiểm tra thêm handleListDomains
    let domainStatus = 0;
    let domainBody = '';
    const domainRes = {
      writeHead: (code: number) => {
        domainStatus = code;
      },
      end: (body: string) => {
        domainBody = body;
      },
    } as unknown as ServerResponse;
    await controller.handleListDomains({} as IncomingMessage, domainRes);
    expect(domainStatus).toBe(200);
    const domainParsed = JSON.parse(domainBody);
    expect(domainParsed.data.totalChunks).toBe(5);
    expect(domainParsed.data.domains.find((d: any) => d.code === 'TRAFFIC')?.chunkCount).toBe(2);
  });

  it('BDD 6: Bảo toàn Fallback Guard của chế độ citizen (không làm vỡ Spec 002)', () => {
    const res = engine.search({
      text: 'thuế thu nhập cá nhân khi trúng số độc đắc 2 tỷ đồng',
    });
    expect(res.isFound).toBe(false);
    expect(res.topScore).toBeLessThan(0.65);
    expect(res.results).toHaveLength(0);
    expect(res.loggedToKnowledgeGap).toBe(true);
    expect(gapQueue.getAll()).toHaveLength(1);
  });

  it('BDD 7: Admin api-client searchLaws map đúng camelCase LegalChunk & fetchLegalDomains đọc GET /domains', async () => {
    const origFetch = global.fetch;
    try {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            totalMatches: 42,
            page: 1,
            limit: 20,
            searchMode: 'search',
            results: [
              {
                chunk: mockChunks[0],
                score: 0.91,
              },
            ],
          },
        }),
      });

      const res = await searchLaws('mũ bảo hiểm', 'TRAFFIC', 20, { docNumber: '168/2024/NĐ-CP' });
      expect(res.totalMatches).toBe(42);
      expect(res.results[0].document_number).toBe('168/2024/NĐ-CP');
      expect(res.results[0].article_number).toBe('Điều 7');
      expect(res.results[0].clause_number).toBe('Khoản 2');
      expect(res.results[0].point_number).toBe('Điểm b');
      expect(res.results[0].full_reference).toBe('Điểm b Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP');

      // Khi Gateway trả HTTP 400/500 thì không che giấu bằng mock giả 100/2019
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({ error: { message: 'Lỗi nội bộ Gateway' } }),
        json: async () => ({ error: { message: 'Lỗi nội bộ Gateway' } }),
      });
      const errRes = await searchLaws('abc', 'TRAFFIC');
      expect(errRes.results).toHaveLength(0);
      expect(errRes.errorMessage).toContain('Lỗi nội bộ Gateway');

      // Kiểm tra fetchLegalDomains
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            totalChunks: 4715,
            domains: [{ code: 'TRAFFIC', name: 'Giao thông đường bộ', chunkCount: 1841, documents: [] }],
          },
        }),
      });
      const domRes = await fetchLegalDomains();
      expect(domRes.totalChunks).toBe(4715);
      expect(domRes.domains[0].code).toBe('TRAFFIC');
    } finally {
      global.fetch = origFetch;
    }
  });

  it('BDD 8: Kiểm tra biên an toàn tại SearchController (kiểu input sai -> 400, giới hạn limit/page & fallback /domains)', async () => {
    // 1. Clamp limit cực lớn / NaN ở LegalSearchEngine
    const clamped = engine.search({
      text: '',
      mode: 'admin',
      limit: 999999,
      page: Number.NaN,
    });
    expect(clamped.page).toBe(1);
    expect(clamped.limit).toBe(100);
    expect(clamped.results).toHaveLength(5);

    // 2. Payload query là số (sai kiểu) -> trả HTTP 400 thay vì crash 500
    const fakeBrokenSupabase = {
      from: () => {
        throw new Error('Supabase network down');
      },
    } as any;
    const controller = new SearchController(engine, fakeBrokenSupabase);

    const badReq = Readable.from([
      Buffer.from(JSON.stringify({ query: 12345, mode: 'admin' })),
    ]) as unknown as IncomingMessage;
    let badStatus = 0;
    let badBody = '';
    const badRes = {
      writeHead: (code: number) => {
        badStatus = code;
      },
      end: (body: string) => {
        badBody = body;
      },
    } as unknown as ServerResponse;

    await controller.handleSearch(badReq, badRes);
    expect(badStatus).toBe(400);
    expect(JSON.parse(badBody).error.code).toBe('BAD_REQUEST');

    // 3. GET /domains vẫn trả 200 từ SearchEngine kể cả khi Supabase ném exception mạng
    let domStatus = 0;
    let domBody = '';
    const domRes = {
      writeHead: (code: number) => {
        domStatus = code;
      },
      end: (body: string) => {
        domBody = body;
      },
    } as unknown as ServerResponse;

    await controller.handleListDomains({} as IncomingMessage, domRes);
    expect(domStatus).toBe(200);
    expect(JSON.parse(domBody).data.totalChunks).toBe(5);
  });
});
