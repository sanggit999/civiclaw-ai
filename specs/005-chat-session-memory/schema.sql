-- =============================================================================
-- SCHEMA MIGRATION: SPECS-005 CHAT SESSION MEMORY & MULTI-TURN DIALOGUE
-- =============================================================================
-- Tuân thủ supabase-postgres-best-practices:
-- - lowercase snake_case
-- - UUID v4 gen_random_uuid()
-- - TIMESTAMPTZ utc
-- - RLS policies
-- - B-tree indexes tối ưu cho truy vấn phân trang theo session_id
-- =============================================================================

-- 1. Bảng lưu trữ thông tin phiên tư vấn pháp lý
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL,
    title TEXT NOT NULL DEFAULT 'Phiên tư vấn pháp luật',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Bảng lưu trữ chi tiết từng lượt tin nhắn và siêu dữ liệu trích dẫn
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    standalone_query TEXT NULL,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_grounded BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Chỉ mục tối ưu hóa tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created 
    ON public.chat_messages(session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user 
    ON public.chat_sessions(user_id);

-- 4. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. Chính sách bảo mật RLS
-- Cho phép đọc/ghi công khai hoặc theo session_id (phục vụ cả công dân tra cứu ẩn danh lẫn đã đăng nhập)
DROP POLICY IF EXISTS "Allow public session access" ON public.chat_sessions;
CREATE POLICY "Allow public session access" 
    ON public.chat_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public message access" ON public.chat_messages;
CREATE POLICY "Allow public message access" 
    ON public.chat_messages FOR ALL USING (true);

-- 6. Phân quyền truy cập bảng (Object-level Grants) cho các roles Supabase (Bắt buộc theo chuẩn PostgreSQL)
GRANT ALL ON TABLE public.chat_sessions TO service_role, anon, authenticated;
GRANT ALL ON TABLE public.chat_messages TO service_role, anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, anon, authenticated;
