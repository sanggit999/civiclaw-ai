import { SupabaseClient } from '@supabase/supabase-js';
import {
  ChatMessage,
  ChatSession,
  ISessionStore,
  MessageRole,
} from './types.js';

interface SupabaseSessionRow {
  id: string;
  user_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseMessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  standalone_query: string | null;
  citations: any;
  is_grounded: boolean;
  created_at: string;
}

/**
 * Bộ lưu trữ phiên trò chuyện trên Supabase PostgreSQL
 * Tuân thủ supabase-postgres-best-practices về phân trang và RLS
 */
export class SupabaseSessionStore implements ISessionStore {
  constructor(private client: SupabaseClient) {}

  /**
   * Tạo mới một phiên hội thoại trong bảng public.chat_sessions
   */
  async createSession(title = 'Phiên tư vấn pháp luật', userId?: string): Promise<ChatSession> {
    const { data, error } = await this.client
      .from('chat_sessions')
      .insert({
        title,
        user_id: userId ?? null,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Lỗi tạo chat_session: ${error?.message || 'Không có dữ liệu'}`);
    }

    const row = data as SupabaseSessionRow;
    return {
      id: row.id,
      userId: row.user_id ?? undefined,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Lấy chi tiết phiên theo ID
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    const { data, error } = await this.client
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as SupabaseSessionRow;
    return {
      id: row.id,
      userId: row.user_id ?? undefined,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Lấy các tin nhắn gần nhất theo cửa sổ trượt (Sliding Window)
   */
  async getRecentMessages(sessionId: string, limit = 6): Promise<ChatMessage[]> {
    const { data, error } = await this.client
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    // Đảo ngược lại để có thứ tự thời gian tăng dần từ cũ đến mới
    const rows = (data as SupabaseMessageRow[]).reverse();

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      role: r.role as MessageRole,
      content: r.content,
      standaloneQuery: r.standalone_query ?? undefined,
      citations: Array.isArray(r.citations) ? r.citations : [],
      isGrounded: Boolean(r.is_grounded),
      createdAt: r.created_at,
    }));
  }

  /**
   * Thêm một tin nhắn mới vào bảng public.chat_messages
   */
  async appendMessage(
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ): Promise<ChatMessage> {
    const { data, error } = await this.client
      .from('chat_messages')
      .insert({
        session_id: message.sessionId,
        role: message.role,
        content: message.content,
        standalone_query: message.standaloneQuery ?? null,
        citations: message.citations ?? [],
        is_grounded: message.isGrounded ?? true,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Lỗi ghi nhận chat_message: ${error?.message || 'Không có dữ liệu'}`);
    }

    // Cập nhật updated_at cho phiên
    await this.client
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.sessionId);

    const row = data as SupabaseMessageRow;
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role as MessageRole,
      content: row.content,
      standaloneQuery: row.standalone_query ?? undefined,
      citations: Array.isArray(row.citations) ? row.citations : [],
      isGrounded: Boolean(row.is_grounded),
      createdAt: row.created_at,
    };
  }

  /**
   * Xóa một phiên hội thoại (tự động xóa cascade các messages liên quan)
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const { error } = await this.client
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    return !error;
  }
}
