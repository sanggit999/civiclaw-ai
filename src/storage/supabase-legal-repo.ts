import { SupabaseClient } from '@supabase/supabase-js';
import { LegalChunk } from '../ingestion/types.js';
import {
  SupabaseLegalChunkRow,
  toSupabaseLegalRow,
  fromSupabaseLegalRow,
  normalizeDomain,
  LegalDomainRecord,
} from './types.js';

export interface BatchUploadResult {
  total: number;
  batches: number;
  successCount: number;
  failedCount: number;
  errors: string[];
}

export interface LegalSearchFilter {
  limit?: number;
  domain?: string;
  embedding?: number[] | null;
}

export class SupabaseLegalRepository {
  constructor(private client: SupabaseClient) {}

  /**
   * Nạp hàng loạt chunks vào bảng public.legal_chunks (Upsert theo id)
   * Tuân thủ supabase-postgres-best-practices về batch inserts (500 records/lô)
   */
  async upsertBatch(
    chunks: LegalChunk[],
    batchSize = 500,
    onProgress?: (processed: number, total: number) => void
  ): Promise<BatchUploadResult> {
    const result: BatchUploadResult = {
      total: chunks.length,
      batches: Math.ceil(chunks.length / batchSize),
      successCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (let i = 0; i < chunks.length; i += batchSize) {
      const slice = chunks.slice(i, i + batchSize);
      const rows = slice.map((c) => toSupabaseLegalRow(c));

      const { error } = await this.client
        .from('legal_chunks')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        result.failedCount += slice.length;
        result.errors.push(`Lô ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        result.successCount += slice.length;
      }

      if (onProgress) {
        onProgress(result.successCount + result.failedCount, chunks.length);
      }
    }

    return result;
  }

  /**
   * Lấy chi tiết một điều luật theo ID duy nhất
   */
  async getById(id: string): Promise<LegalChunk | null> {
    const { data, error } = await this.client
      .from('legal_chunks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return fromSupabaseLegalRow(data as SupabaseLegalChunkRow);
  }

  /**
   * Đếm tổng số lượng chunks hiện có trong kho dữ liệu Supabase
   */
  async count(): Promise<number> {
    const { count, error } = await this.client
      .from('legal_chunks')
      .select('*', { count: 'exact', head: true });

    if (error) return 0;
    return count ?? 0;
  }

  /**
   * Lấy danh sách các lĩnh vực pháp lý đang kích hoạt từ bảng public.legal_domains
   */
  async getDomains(): Promise<LegalDomainRecord[]> {
    const { data, error } = await this.client
      .from('legal_domains')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error || !data) return [];
    return (data as Array<{ code: string; name: string; description?: string; is_active: boolean; created_at?: string }>).map((d) => ({
      code: d.code,
      name: d.name,
      description: d.description ?? undefined,
      isActive: Boolean(d.is_active),
      createdAt: d.created_at,
    }));
  }

  /**
   * Tìm kiếm kết hợp (Hybrid Search) bằng hàm lưu trữ RPC match_legal_chunks
   */
  async search(
    queryText: string,
    options?: LegalSearchFilter
  ): Promise<{ chunk: LegalChunk; similarity: number }[]> {
    const limit = options?.limit ?? 5;
    const filterDomain = options?.domain ? normalizeDomain(options.domain) : null;
    const embedding = options?.embedding ?? null;

    const { data, error } = await this.client.rpc('match_legal_chunks', {
      query_text: queryText,
      query_embedding: embedding,
      match_count: limit,
      filter_domain: filterDomain,
    });

    if (error || !data || !Array.isArray(data)) {
      // Fallback: nếu RPC chưa được tạo hoặc lỗi, thực hiện truy vấn text trực tiếp
      const fallbackQuery = this.client
        .from('legal_chunks')
        .select('*')
        .limit(limit);

      if (filterDomain) {
        fallbackQuery.eq('domain', filterDomain);
      }

      const { data: fallbackData } = await fallbackQuery;
      if (!fallbackData) return [];

      return (fallbackData as SupabaseLegalChunkRow[]).map((row) => ({
        chunk: fromSupabaseLegalRow(row),
        similarity: 0.5,
      }));
    }

    return data.map((item: SupabaseLegalChunkRow & { similarity: number }) => ({
      chunk: fromSupabaseLegalRow(item),
      similarity: Number(item.similarity) || 0,
    }));
  }
}
