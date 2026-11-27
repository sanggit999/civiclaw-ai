import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IncomingMessage, ServerResponse } from 'node:http';
import * as engineModule from '../../../src/search/engine.js';
import { LegalSearchEngine } from '../../../src/search/engine.js';
import { KnowledgeGapQueue } from '../../../src/search/gap-queue.js';
import { SearchController } from '../../../src/api/controllers/search-controller.js';
import { loadSearchSettingsFromSupabase, SupabaseFromLike } from '../../../src/search/config-loader.js';
import { LegalChunk } from '../../../src/ingestion/types.js';

const sampleChunks: LegalChunk[] = [
  {
    id: '168_D7_K2_Ph',
    docNumber: '168/2024/NĐ-CP',
    domain: 'TRAFFIC',
    article: 'Điều 7',
    clause: 'Khoản 2',
    point: 'Điểm h',
    fullReference: 'Điểm h Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP',
    content:
      'Điều 7. Xử phạt người điều khiển xe mô tô, xe gắn máy. Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe không đội mũ bảo hiểm cho người đi mô tô, xe máy.',
    keywords: ['không đội mũ bảo hiểm', 'xe mô tô', '400.000 đồng'],
  },
  {
    id: '168_D6_K1_Pa',
    docNumber: '168/2024/NĐ-CP',
    domain: 'TRAFFIC',
    article: 'Điều 6',
    clause: 'Khoản 1',
    point: 'Điểm a',
    fullReference: 'Điểm a Khoản 1 Điều 6 Nghị định 168/2024/NĐ-CP',
    content:
      'Điều 6. Xử phạt người điều khiển xe ô tô. Phạt tiền theo quy định của pháp luật đối với người tham gia giao thông không chấp hành hiệu lệnh.',
    keywords: ['xe ô tô', 'hiệu lệnh'],
  },
  {
    id: '45_D25_K2',
    docNumber: '45/2019/QH14',
    domain: 'LABOR',
    article: 'Điều 25',
    clause: 'Khoản 2',
    fullReference: 'Khoản 2 Điều 25 Bộ luật Lao động 2019',
    content:
      'Điều 25. Thời gian thử việc theo quy định của pháp luật đối với người lao động có trình độ chuyên môn cao đẳng không quá 60 ngày.',
    keywords: ['thử việc', 'cao đẳng'],
  },
  {
    id: '27_D160_K1',
    docNumber: '27/2023/QH15',
    domain: 'HOUSING',
    article: 'Điều 160',
    clause: 'Khoản 1',
    fullReference: 'Khoản 1 Điều 160 Luật Nhà ở 2023',
    content:
      'Điều 160. Người sở hữu nhà ở phải tuân thủ quy định của pháp luật về giao dịch nhà ở.',
    keywords: ['nhà ở', 'giao dịch'],
  },
];

function createMockRes() {
  let status = 0;
  let body = '';
  const res = {
    writeHead: (code: number) => {
      status = code;
    },
    end: (raw: string) => {
      body = raw;
    },
  } as unknown as ServerResponse;
  return { res, getStatus: () => status, getBody: () => JSON.parse(body) as Record<string, unknown> };
}

describe('Spec 014 - Auto-IDF Search Scoring & Dynamic System Configs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('Lát 1 (BDD 1): Xóa DISPUTE_FILLER_WORDS, tính Auto-IDF tự động và không làm mất từ có dấu', () => {
    expect('DISPUTE_FILLER_WORDS' in engineModule).toBe(false);

    const engine = new LegalSearchEngine(sampleChunks, new KnowledgeGapQueue());

    const idfMu = engine.getWordIdfScore('mũ');
    const idfNguoi = engine.getWordIdfScore('người');
    expect(idfMu).toBeGreaterThan(idfNguoi);
    expect(engine.getWordIdfScore('tôi')).toBe(1.0);

    const dispute =
      'Hôm qua tôi đi xe máy không đội mũ bảo hiểm bị cảnh sát xử phạt bao nhiêu tiền nhờ tư vấn giúp?';
    const res = engine.search({ text: dispute, mode: 'admin', limit: 5 });
    expect(res.isFound).toBe(true);
    expect(res.results[0].chunk.id).toBe('168_D7_K2_Ph');

    engine.addChunks([
      {
        id: '36_D33_K1',
        docNumber: '36/2024/QH15',
        domain: 'TRAFFIC',
        article: 'Điều 33',
        fullReference: 'Điều 33 Luật TTATGTĐB 2024',
        content: 'Người đi mô tô phải đội mũ bảo hiểm.',
        keywords: ['mũ bảo hiểm'],
      },
    ]);
    expect(engine.getWordIdfScore('mũ')).toBeLessThan(idfMu);
  });

  it('Lát 2 (BDD 2 & 3): loadSearchSettingsFromSupabase parse chuẩn, chặn biên dữ liệu lỗi & fallback khi DB sự cố', async () => {
    // 1. Khi không truyền Supabase
    const emptyRes = await loadSearchSettingsFromSupabase(undefined);
    expect(emptyRes).toEqual({ config: {}, loadedKeys: [] });

    // 2. Dữ liệu hợp lệ + dữ liệu sai biên (partial weights, âm, NaN, ngoài khoảng)
    const mockSupabaseMixed: SupabaseFromLike = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { key: 'stop_words', value: [' LÀ ', '', 'và', 123, 'xin'] },
            {
              key: 'search_weights',
              value: { keyword: 0.3, unigram: -0.5, bigram: Number.NaN },
            },
            { key: 'confidence_threshold', value: 0 }, // invalid: <= 0
            { key: 'min_query_length', value: 4.9 }, // valid -> trunc to 4
          ],
          error: null,
        }),
      }),
    };

    const loaded = await loadSearchSettingsFromSupabase(mockSupabaseMixed);
    expect(loaded.loadedKeys.sort()).toEqual(['min_query_length', 'search_weights', 'stop_words']);
    expect(Array.from(loaded.stopWords || [])).toEqual(['là', 'và', 'xin']);
    expect(loaded.config.weights).toEqual({ keyword: 0.3 });
    expect(loaded.config.defaultConfidenceThreshold).toBeUndefined();
    expect(loaded.config.minQueryLength).toBe(4);

    // 3. Khi confidence_threshold > 1 hoặc min_query_length < 1 bị từ chối
    const mockOutOfBounds: SupabaseFromLike = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { key: 'confidence_threshold', value: 1.5 },
            { key: 'min_query_length', value: 0 },
          ],
          error: null,
        }),
      }),
    };
    const rejected = await loadSearchSettingsFromSupabase(mockOutOfBounds);
    expect(rejected.loadedKeys).toEqual([]);

    // 4. Khi Supabase lỗi hoặc Promise reject (network failure)
    const mockErr: SupabaseFromLike = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Timeout' } }),
      }),
    };
    expect((await loadSearchSettingsFromSupabase(mockErr)).loadedKeys).toEqual([]);

    const mockThrow: SupabaseFromLike = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('ECONNRESET')),
      }),
    };
    expect((await loadSearchSettingsFromSupabase(mockThrow)).loadedKeys).toEqual([]);
  });

  it('Lát 2 (BDD 2 & 3): LegalSearchEngine.updateConfig & POST /api/v1/search/reload-config (kèm bảo vệ token & fallback)', async () => {
    const engine = new LegalSearchEngine(sampleChunks, new KnowledgeGapQueue());

    // 1. Controller không có Supabase vẫn trả 200 với reloaded: false
    const controllerNoDb = new SearchController(engine);
    const mockNoDb = createMockRes();
    await controllerNoDb.handleReloadConfig({ headers: {} } as IncomingMessage, mockNoDb.res);
    expect(mockNoDb.getStatus()).toBe(200);
    expect((mockNoDb.getBody().data as { reloaded: boolean }).reloaded).toBe(false);

    // 2. Controller có cấu hình adminSecret: từ chối 401 khi sai token, cho phép 200 khi đúng token
    const mockSupabase: SupabaseFromLike = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { key: 'stop_words', value: ['là', 'của', 'mũ'] },
            { key: 'confidence_threshold', value: 0.8 },
            { key: 'min_query_length', value: 5 },
          ],
          error: null,
        }),
      }),
    };
    const controllerProtected = new SearchController(engine, mockSupabase, 'secret-token-123');

    const unauthRes = createMockRes();
    await controllerProtected.handleReloadConfig(
      { headers: { 'x-admin-token': 'wrong-token' } } as unknown as IncomingMessage,
      unauthRes.res
    );
    expect(unauthRes.getStatus()).toBe(401);

    const authRes = createMockRes();
    await controllerProtected.handleReloadConfig(
      { headers: { 'x-admin-token': 'secret-token-123' } } as unknown as IncomingMessage,
      authRes.res
    );
    expect(authRes.getStatus()).toBe(200);
    const parsedData = authRes.getBody().data as {
      reloaded: boolean;
      stopWordsCount: number;
    };
    expect(parsedData.reloaded).toBe(true);
    expect(parsedData.stopWordsCount).toBe(3);
    expect(engine.getConfig().defaultConfidenceThreshold).toBe(0.8);
    expect(engine.getConfig().minQueryLength).toBe(5);

    const shortRes = engine.search({ text: 'xe ô', mode: 'citizen' });
    expect(shortRes.isFound).toBe(false);
  });

  it('Lát 2 (Integration): PUT /api/configs gọi reload-config theo NEXT_PUBLIC_API_GATEWAY_URL và không fail khi Gateway tắt', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_GATEWAY_URL', 'http://localhost:3999');
    vi.stubEnv('GATEWAY_ADMIN_SECRET', 'adm-secret');

    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    const fromMock = vi.fn().mockReturnValue({ update: updateMock });

    vi.doMock('@/lib/supabase-server', () => ({
      getSupabaseServerClient: () => ({ from: fromMock }),
    }));

    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);

    const { PUT } = await import('../../../admin/app/api/configs/route.js');
    const req = new Request('http://localhost:3000/api/configs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'confidence_threshold', value: 0.72 }),
    });

    const response = await PUT(req);
    expect(response.status).toBe(200);
    const json = (await response.json()) as { success: boolean };
    expect(json.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3999/api/v1/search/reload-config');
    expect((fetchMock.mock.calls[0][1] as { headers: Record<string, string> }).headers['x-admin-token']).toBe(
      'adm-secret'
    );
  });
});
