import { describe, it, expect, vi } from 'vitest';
import { LegalChunk } from '../../../src/ingestion/types.js';
import {
  toSupabaseLegalRow,
  fromSupabaseLegalRow,
  SupabaseLegalChunkRow,
} from '../../../src/storage/types.js';
import { SupabaseLegalRepository } from '../../../src/storage/supabase-legal-repo.js';
import { SupabaseGapRepository } from '../../../src/storage/supabase-gap-repo.js';
import { SupabaseClient } from '@supabase/supabase-js';

describe('Storage Module - DTO Mappers', () => {
  const sampleChunk: LegalChunk = {
    id: '168_2024_ND-CP_Điều_6_Khoản_2_Điểm_a',
    docNumber: '168/2024/NĐ-CP',
    domain: 'TRAFFIC',
    chapter: 'Chương II',
    article: 'Điều 6',
    clause: 'Khoản 2',
    point: 'Điểm a',
    fullReference: 'Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP',
    content: 'Xử phạt người điều khiển xe mô tô, xe gắn máy...',
    keywords: ['xe mô tô', 'phạt tiền'],
  };

  it('toSupabaseLegalRow chuyển đổi chính xác sang snake_case DB columns', () => {
    const row = toSupabaseLegalRow(sampleChunk);
    expect(row.id).toBe(sampleChunk.id);
    expect(row.doc_number).toBe('168/2024/NĐ-CP');
    expect(row.full_reference).toBe(sampleChunk.fullReference);
    expect(row.content).toBe(sampleChunk.content);
    expect(row.keywords).toEqual(['xe mô tô', 'phạt tiền']);
    expect(row.embedding).toBeNull();
  });

  it('fromSupabaseLegalRow khôi phục lại domain model LegalChunk', () => {
    const row: SupabaseLegalChunkRow = {
      id: '168_2024_ND-CP_Điều_6_Khoản_2_Điểm_a',
      doc_number: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      chapter: 'Chương II',
      article: 'Điều 6',
      clause: 'Khoản 2',
      point: 'Điểm a',
      full_reference: 'Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP',
      content: 'Xử phạt người điều khiển xe mô tô...',
      keywords: ['xe mô tô'],
    };

    const chunk = fromSupabaseLegalRow(row);
    expect(chunk.id).toBe(row.id);
    expect(chunk.docNumber).toBe('168/2024/NĐ-CP');
    expect(chunk.fullReference).toBe(row.full_reference);
    expect(chunk.domain).toBe('TRAFFIC');
  });
});

describe('SupabaseLegalRepository (Mocked Client)', () => {
  const sampleChunks: LegalChunk[] = [
    {
      id: 'doc1_d1_k1',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 1',
      fullReference: 'Khoản 1 Điều 1',
      content: 'Nội dung điều 1',
      keywords: ['giao thông'],
    },
    {
      id: 'doc1_d2_k1',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 2',
      fullReference: 'Khoản 1 Điều 2',
      content: 'Nội dung điều 2',
      keywords: ['tốc độ'],
    },
  ];

  it('upsertBatch phân lô và gọi upsert thành công', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    const mockClient = {
      from: vi.fn().mockReturnValue({
        upsert: upsertSpy,
      }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseLegalRepository(mockClient);
    let progressCalls = 0;

    const result = await repo.upsertBatch(sampleChunks, 1, () => {
      progressCalls++;
    });

    expect(result.total).toBe(2);
    expect(result.batches).toBe(2);
    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(upsertSpy).toHaveBeenCalledTimes(2);
    expect(progressCalls).toBe(2);
  });

  it('count trả về số lượng bản ghi', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ count: 4715, error: null }),
      }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseLegalRepository(mockClient);
    const count = await repo.count();
    expect(count).toBe(4715);
  });

  it('getDomains trả về danh sách các lĩnh vực pháp lý đang kích hoạt', async () => {
    const mockDomains = [
      { code: 'HOUSING', name: 'Nhà ở & Cư trú', is_active: true },
      { code: 'TRAFFIC', name: 'Giao thông đường bộ', is_active: true },
    ];

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockDomains, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseLegalRepository(mockClient);
    const domains = await repo.getDomains();

    expect(domains).toHaveLength(2);
    expect(domains[0].code).toBe('HOUSING');
    expect(domains[1].code).toBe('TRAFFIC');
    expect(domains[0].isActive).toBe(true);
  });

  it('getById trả về LegalChunk khi tìm thấy', async () => {
    const mockRow: SupabaseLegalChunkRow = {
      id: 'sample_id',
      doc_number: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 6',
      full_reference: 'Điều 6 NĐ 168',
      content: 'Nội dung xử phạt',
    };

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseLegalRepository(mockClient);
    const result = await repo.getById('sample_id');
    expect(result).not.toBeNull();
    expect(result?.docNumber).toBe('168/2024/NĐ-CP');
  });

  it('search gọi hàm RPC match_legal_chunks', async () => {
    const mockRpcData = [
      {
        id: 'sample_id',
        doc_number: '168/2024/NĐ-CP',
        domain: 'TRAFFIC',
        article: 'Điều 6',
        full_reference: 'Điều 6 NĐ 168',
        content: 'Vượt đèn đỏ phạt bao nhiêu',
        similarity: 0.92,
      },
    ];

    const mockClient = {
      rpc: vi.fn().mockResolvedValue({ data: mockRpcData, error: null }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseLegalRepository(mockClient);
    const searchResults = await repo.search('vượt đèn đỏ', { limit: 5 });

    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].similarity).toBe(0.92);
    expect(searchResults[0].chunk.docNumber).toBe('168/2024/NĐ-CP');
  });
});

describe('SupabaseGapRepository (Mocked Client)', () => {
  it('recordQuery tăng hit_count nếu câu hỏi đã tồn tại ở status unreviewed', async () => {
    const existingRow = {
      id: 101,
      query_text: 'chạy quá tốc độ',
      normalized_query: 'chay qua toc do',
      domain_guess: 'TRAFFIC',
      hit_count: 2,
      status: 'unreviewed',
    };

    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...existingRow, hit_count: 3 },
          }),
        }),
      }),
    });

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: existingRow }),
            }),
          }),
        }),
        update: updateSpy,
      }),
    } as unknown as SupabaseClient;

    const gapRepo = new SupabaseGapRepository(mockClient);
    const res = await gapRepo.recordQuery('chạy quá tốc độ', 'TRAFFIC');

    expect(res).not.toBeNull();
    expect(res?.hitCount).toBe(3);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ hit_count: 3 })
    );
  });

  it('recordQuery chèn mới nếu câu hỏi chưa từng xuất hiện', async () => {
    const insertedRow = {
      id: 102,
      query_text: 'hợp đồng thuê nhà 2026',
      normalized_query: 'hop dong thue nha 2026',
      domain_guess: 'HOUSING',
      hit_count: 1,
      status: 'unreviewed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
      }),
    });

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
        insert: insertSpy,
      }),
    } as unknown as SupabaseClient;

    const gapRepo = new SupabaseGapRepository(mockClient);
    const res = await gapRepo.recordQuery('hợp đồng thuê nhà 2026', 'HOUSING');

    expect(res).not.toBeNull();
    expect(res?.id).toBe('102');
    expect(res?.hitCount).toBe(1);
    expect(insertSpy).toHaveBeenCalled();
  });
});
