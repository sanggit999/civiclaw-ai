import { SupabaseClient } from '@supabase/supabase-js';
import { GapStatus, ExtendedDomain, UnresolvedQuery } from '../search/types.js';
import {
  SupabaseUnresolvedQueryRow,
  fromSupabaseQueryRow,
} from './types.js';

/**
 * Chuẩn hóa chuỗi tìm kiếm để chống trùng lặp khoảng trống tri thức
 */
function normalizeQueryText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class SupabaseGapRepository {
  constructor(private client: SupabaseClient) {}

  /**
   * Ghi nhận một câu hỏi chưa có căn cứ pháp lý vào bảng unresolved_queries.
   * Nếu câu hỏi trùng nội dung đã tồn tại, tự động tăng hit_count thay vì tạo rác dữ liệu.
   */
  async recordQuery(
    queryText: string,
    domainGuess: ExtendedDomain = 'OTHER'
  ): Promise<UnresolvedQuery | null> {
    const trimmed = queryText.trim();
    if (trimmed.length < 3) return null;

    // 1. Thử gọi hàm RPC atomic record_unresolved_query (Khuyến nghị theo Supabase Best Practices)
    if (typeof this.client.rpc === 'function') {
      const { data: rpcData, error: rpcError } = await this.client.rpc(
        'record_unresolved_query',
        {
          p_query_text: trimmed,
          p_domain_guess: domainGuess,
        }
      );

      if (!rpcError && rpcData) {
        return fromSupabaseQueryRow(rpcData as SupabaseUnresolvedQueryRow);
      }
    }

    // 2. Fallback sang logic client-side (phục vụ unit test offline hoặc khi chưa chạy migration)
    const normalized = normalizeQueryText(trimmed);

    // Kiểm tra xem đã có câu hỏi tương tự chưa duyệt chưa
    const { data: existing } = await this.client
      .from('unresolved_queries')
      .select('*')
      .eq('normalized_query', normalized)
      .eq('status', 'unreviewed')
      .maybeSingle();

    if (existing) {
      const updatedHitCount = (existing.hit_count || 1) + 1;
      const { data: updated } = await this.client
        .from('unresolved_queries')
        .update({
          hit_count: updatedHitCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      return updated ? fromSupabaseQueryRow(updated as SupabaseUnresolvedQueryRow) : null;
    }

    // Nếu chưa có, chèn mới
    const { data: inserted, error } = await this.client
      .from('unresolved_queries')
      .insert({
        query_text: trimmed,
        normalized_query: normalized,
        domain_guess: domainGuess,
        hit_count: 1,
        status: 'unreviewed',
      })
      .select()
      .single();

    if (error || !inserted) return null;
    return fromSupabaseQueryRow(inserted as SupabaseUnresolvedQueryRow);
  }

  /**
   * Lấy danh sách câu hỏi cần Quản trị viên duyệt (ưu tiên số lượt hỏi hit_count cao nhất)
   * Tận dụng Partial Index: idx_unresolved_queries_unreviewed
   */
  async getUnreviewed(limit = 50): Promise<UnresolvedQuery[]> {
    const { data, error } = await this.client
      .from('unresolved_queries')
      .select('*')
      .eq('status', 'unreviewed')
      .order('hit_count', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((row) => fromSupabaseQueryRow(row as SupabaseUnresolvedQueryRow));
  }

  /**
   * Cập nhật trạng thái câu hỏi (Quản trị viên đánh dấu đã giải quyết hoặc bỏ qua)
   */
  async markStatus(
    id: number,
    status: GapStatus,
    adminNotes?: string
  ): Promise<boolean> {
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (adminNotes !== undefined) {
      updatePayload.admin_notes = adminNotes;
    }

    const { error } = await this.client
      .from('unresolved_queries')
      .update(updatePayload)
      .eq('id', id);

    return !error;
  }

  /**
   * Lấy số liệu thống kê hàng đợi khoảng trống tri thức
   * Sử dụng exact count thay vì fetch toàn bộ mảng status về RAM theo Supabase Best Practices
   */
  async getStats(): Promise<{
    total: number;
    unreviewed: number;
    resolved: number;
    ignored: number;
  }> {
    try {
      const [totalRes, unreviewedRes, resolvedRes, ignoredRes] = await Promise.all([
        this.client.from('unresolved_queries').select('*', { count: 'exact', head: true }),
        this.client.from('unresolved_queries').select('*', { count: 'exact', head: true }).eq('status', 'unreviewed'),
        this.client.from('unresolved_queries').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
        this.client.from('unresolved_queries').select('*', { count: 'exact', head: true }).eq('status', 'ignored'),
      ]);

      if (totalRes.count !== undefined && totalRes.count !== null) {
        return {
          total: totalRes.count ?? 0,
          unreviewed: unreviewedRes.count ?? 0,
          resolved: resolvedRes.count ?? 0,
          ignored: ignoredRes.count ?? 0,
        };
      }
    } catch {
      // Fallback cho môi trường mock
    }

    // Fallback cho môi trường test mock đơn giản
    const { data, error } = await this.client
      .from('unresolved_queries')
      .select('status');

    if (error || !data) {
      return { total: 0, unreviewed: 0, resolved: 0, ignored: 0 };
    }

    const stats = { total: data.length, unreviewed: 0, resolved: 0, ignored: 0 };
    for (const item of data) {
      const s = item.status as GapStatus;
      if (s === 'unreviewed') stats.unreviewed++;
      else if (s === 'resolved') stats.resolved++;
      else if (s === 'ignored') stats.ignored++;
    }
    return stats;
  }
}
