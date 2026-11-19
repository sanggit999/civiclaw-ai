import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseClient,
  resetSupabaseClientCache,
} from '../../../src/storage/supabase-client.js';
import { SupabaseLegalRepository } from '../../../src/storage/supabase-legal-repo.js';
import { SupabaseGapRepository } from '../../../src/storage/supabase-gap-repo.js';
import { LegalChunk } from '../../../src/ingestion/types.js';

describe('BDD Mock-up Test Suite (spec.md Section 1.4)', () => {
  beforeEach(() => {
    resetSupabaseClientCache();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Kịch bản 1: Khởi tạo kết nối Supabase an toàn
  // ---------------------------------------------------------------------------
  describe('Kịch bản 1: Khởi tạo kết nối Supabase an toàn', () => {
    it('Given biến môi trường hợp lệ, When getSupabaseClient(), Then trả về client sẵn sàng', () => {
      const client = getSupabaseClient(false, {
        supabaseUrl: 'https://mock-project.supabase.co',
        supabaseAnonKey: 'mock-anon-key',
      });
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
      expect(typeof client.rpc).toBe('function');
    });

    it('Given thiếu SUPABASE_URL, When khởi tạo, Then ném lỗi cảnh báo rõ ràng', () => {
      expect(() => {
        getSupabaseClient(false, {
          supabaseUrl: '',
          supabaseAnonKey: 'mock-anon-key',
        });
      }).toThrowError(/Thiếu biến môi trường SUPABASE_URL/);
    });

    it('Given thiếu API key, When khởi tạo, Then ném lỗi cảnh báo rõ ràng', () => {
      expect(() => {
        getSupabaseClient(true, {
          supabaseUrl: 'https://mock-project.supabase.co',
          supabaseAnonKey: '',
          supabaseServiceRoleKey: '',
        });
      }).toThrowError(/Thiếu API Key Supabase/);
    });
  });

  // ---------------------------------------------------------------------------
  // Kịch bản 2: Nạp hàng loạt chunks với cơ chế Upsert (Batch Ingestion)
  // ---------------------------------------------------------------------------
  describe('Kịch bản 2: Nạp hàng loạt chunks với cơ chế Upsert', () => {
    it('Given danh sách chunks, When upsertBatch theo lô 500, Then gửi upsert đúng lô và không lỗi', async () => {
      // Giả lập 1.200 chunks mẫu
      const mockChunks: LegalChunk[] = Array.from({ length: 1200 }, (_, i) => ({
        id: `doc_dieu_${i + 1}`,
        docNumber: '168/2024/NĐ-CP',
        domain: 'TRAFFIC',
        article: `Điều ${i + 1}`,
        fullReference: `Điều ${i + 1} Nghị định 168/2024/NĐ-CP`,
        content: `Nội dung xử phạt điều ${i + 1}`,
        keywords: ['giao thông'],
      }));

      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const mockClient = {
        from: vi.fn().mockReturnValue({ upsert: upsertSpy }),
      } as unknown as SupabaseClient;

      const repo = new SupabaseLegalRepository(mockClient);
      const progressCalls: number[] = [];

      const result = await repo.upsertBatch(mockChunks, 500, (processed) => {
        progressCalls.push(processed);
      });

      // 1200 / 500 = 3 lô (500 + 500 + 200)
      expect(result.total).toBe(1200);
      expect(result.batches).toBe(3);
      expect(result.successCount).toBe(1200);
      expect(result.failedCount).toBe(0);
      expect(upsertSpy).toHaveBeenCalledTimes(3);
      expect(progressCalls).toEqual([500, 1000, 1200]);
    });
  });

  // ---------------------------------------------------------------------------
  // Kịch bản 3: Tìm kiếm kết hợp (Full-Text Search + RPC) trên Supabase
  // ---------------------------------------------------------------------------
  describe('Kịch bản 3: Tìm kiếm kết hợp (Full-Text Search + RPC) trên Supabase', () => {
    it('Given bảng legal_chunks có dữ liệu, When gọi match_legal_chunks, Then trả về kết quả kèm similarity', async () => {
      const mockRpcResponse = [
        {
          id: '168_2024_ND-CP_Điều_6_Khoản_2_Điểm_a',
          doc_number: '168/2024/NĐ-CP',
          domain: 'TRAFFIC',
          article: 'Điều 6',
          clause: 'Khoản 2',
          point: 'Điểm a',
          full_reference: 'Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP',
          content: 'Không chấp hành hiệu lệnh của đèn tín hiệu giao thông (vượt đèn đỏ)',
          keywords: ['vượt đèn đỏ', 'mức phạt'],
          similarity: 0.94,
        },
      ];

      const rpcSpy = vi.fn().mockResolvedValue({ data: mockRpcResponse, error: null });
      const mockClient = { rpc: rpcSpy } as unknown as SupabaseClient;

      const repo = new SupabaseLegalRepository(mockClient);
      const results = await repo.search('vượt đèn đỏ', { limit: 5, domain: 'TRAFFIC' });

      expect(rpcSpy).toHaveBeenCalledWith('match_legal_chunks', {
        query_text: 'vượt đèn đỏ',
        query_embedding: null,
        match_count: 5,
        filter_domain: 'TRAFFIC',
      });
      expect(results).toHaveLength(1);
      expect(results[0].chunk.article).toBe('Điều 6');
      expect(results[0].similarity).toBe(0.94);
      expect(results[0].chunk.fullReference).toContain('Nghị định 168/2024/NĐ-CP');
    });

    it('Given RPC gặp sự cố, When search, Then tự động kích hoạt truy vấn fallback trực tiếp', async () => {
      const mockFallbackRows = [
        {
          id: '168_2024_ND-CP_Điều_6',
          doc_number: '168/2024/NĐ-CP',
          domain: 'TRAFFIC',
          article: 'Điều 6',
          full_reference: 'Điều 6 NĐ 168',
          content: 'Nội dung fallback',
        },
      ];

      const mockClient = {
        rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('RPC not found') }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockFallbackRows }),
          }),
        }),
      } as unknown as SupabaseClient;

      const repo = new SupabaseLegalRepository(mockClient);
      const results = await repo.search('vượt đèn đỏ');

      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.5); // Fallback similarity
      expect(results[0].chunk.article).toBe('Điều 6');
    });
  });

  // ---------------------------------------------------------------------------
  // Kịch bản 4: Thu thập câu hỏi chưa có lời giải & Quản trị viên duyệt
  // ---------------------------------------------------------------------------
  describe('Kịch bản 4: Thu thập câu hỏi chưa có lời giải (Unresolved Query) & Duyệt', () => {
    it('Given câu hỏi mới chưa tồn tại, When recordQuery, Then chèn mới với hit_count = 1', async () => {
      const mockInsertResult = {
        id: 1,
        query_text: 'quy định về nuôi chó pitbull tại chung cư',
        normalized_query: 'quy dinh ve物联网...',
        domain_guess: 'HOUSING',
        hit_count: 1,
        status: 'unreviewed',
      };

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInsertResult, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const gapRepo = new SupabaseGapRepository(mockClient);
      const record = await gapRepo.recordQuery('quy định về nuôi chó pitbull tại chung cư', 'HOUSING');

      expect(record).not.toBeNull();
      expect(record?.hitCount).toBe(1);
      expect(record?.domainGuess).toBe('HOUSING');
    });

    it('Given danh sách câu hỏi chưa duyệt, When getUnreviewed, Then lấy sắp xếp theo hit_count giảm dần', async () => {
      const mockUnreviewed = [
        { id: 1, query_text: 'câu hỏi phổ biến', hit_count: 10, status: 'unreviewed' },
        { id: 2, query_text: 'câu hỏi ít gặp', hit_count: 2, status: 'unreviewed' },
      ];

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockUnreviewed, error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const gapRepo = new SupabaseGapRepository(mockClient);
      const list = await gapRepo.getUnreviewed(10);

      expect(list).toHaveLength(2);
      expect(list[0].hitCount).toBe(10);
      expect(list[1].hitCount).toBe(2);
    });

    it('Given câu hỏi chưa duyệt, When Admin đánh dấu resolved, Then cập nhật status và ghi chú', async () => {
      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockClient = {
        from: vi.fn().mockReturnValue({ update: updateSpy }),
      } as unknown as SupabaseClient;

      const gapRepo = new SupabaseGapRepository(mockClient);
      const success = await gapRepo.markStatus(1, 'resolved', 'Đã bổ sung Nghị định mới');

      expect(success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          admin_notes: 'Đã bổ sung Nghị định mới',
        })
      );
    });
  });
});
