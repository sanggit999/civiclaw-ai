-- =============================================================================
-- CIVICLAW AI - PRODUCTION DATABASE SCHEMA (SUPABASE POSTGRESQL 15+)
-- Tuân thủ 100% hướng dẫn Supabase Postgres Best Practices:
-- - Schema: Lowercase snake_case, timestamptz, text types, BigInt identity PK
-- - Indexes: HNSW for vector cosine, GIN for full-text search, Partial index for gaps
-- - Security: Row Level Security (RLS) với DROP POLICY IF EXISTS đảm bảo Idempotent
-- - RPC: SECURITY DEFINER với SET search_path = public chống search_path hijacking
-- =============================================================================

-- 1. KÍCH HOẠT EXTENSIONS CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector cho Semantic Search
CREATE EXTENSION IF NOT EXISTS unaccent;        -- Hỗ trợ tìm kiếm tiếng Việt không dấu
CREATE EXTENSION IF NOT EXISTS pg_trgm;         -- Trigram matching chống sai chính tả

-- =============================================================================
-- 2. BẢNG DANH MỤC LĨNH VỰC PHÁP LUẬT ĐỘNG (DYNAMIC LEGAL DOMAINS)
-- Hỗ trợ mở rộng không giới hạn: Thêm lĩnh vực mới mà không cần can thiệp DDL
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.legal_domains (
    code TEXT PRIMARY KEY,                          -- 'TRAFFIC', 'LABOR', 'LAND'...
    name TEXT NOT NULL,                             -- 'Giao thông đường bộ'...
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Nạp các lĩnh vực chuẩn ban đầu và lĩnh vực sẵn sàng mở rộng
INSERT INTO public.legal_domains (code, name, description) VALUES
    ('TRAFFIC', 'Giao thông đường bộ', 'Nghị định 168/2024/NĐ-CP, Luật TTATGTĐB 2024'),
    ('LABOR', 'Lao động & Tiền lương', 'Bộ luật Lao động 2019'),
    ('SOCIAL_INSURANCE', 'Bảo hiểm xã hội', 'Luật Bảo hiểm xã hội 2024'),
    ('HOUSING', 'Nhà ở & Cư trú', 'Luật Nhà ở 2023'),
    ('LAND', 'Đất đai & Bất động sản', 'Luật Đất đai 2024 (Sẵn sàng mở rộng)'),
    ('CIVIL', 'Dân sự & Hợp đồng', 'Bộ luật Dân sự 2015 (Sẵn sàng mở rộng)'),
    ('OTHER', 'Lĩnh vực khác', 'Dành cho các câu hỏi mở rộng hoặc chưa phân loại')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 3. BẢNG KHO DỮ LIỆU ĐIỀU LUẬT (LEGAL CHUNKS)
-- Lưu trữ 4.715 chunks đã bóc tách từ 5 bộ luật cốt lõi
-- Khóa ngoại domain tham chiếu sang bảng legal_domains (Mở rộng linh hoạt O(1))
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.legal_chunks (
    id TEXT PRIMARY KEY,                            -- Deterministic ID: 168_2024_ND-CP_Điều_6_Khoản_2_Điểm_a
    doc_number TEXT NOT NULL,                       -- '168/2024/NĐ-CP'
    domain TEXT NOT NULL REFERENCES public.legal_domains(code) ON UPDATE CASCADE,
    chapter TEXT,                                   -- 'Chương II'
    article TEXT NOT NULL,                          -- 'Điều 6'
    clause TEXT,                                    -- 'Khoản 2'
    point TEXT,                                     -- 'Điểm a'
    full_reference TEXT NOT NULL,                   -- 'Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP'
    content TEXT NOT NULL,                          -- Nội dung bảo toàn ngữ cảnh 3 tầng
    keywords TEXT[] DEFAULT '{}'::TEXT[],           -- Mảng từ khóa mức phạt và phương tiện
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(full_reference, '') || ' ' || coalesce(content, ''))
    ) STORED,                                       -- Cột FTS tự động tính toán
    embedding VECTOR(768),                          -- Vector 768 chiều (Gemini Embedding)
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Chỉ mục hiệu năng cao (High-Performance Indexes)
CREATE INDEX IF NOT EXISTS idx_legal_chunks_domain ON public.legal_chunks (domain);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_doc_number ON public.legal_chunks (doc_number);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_fts ON public.legal_chunks USING gin (search_vector);

-- Chỉ mục HNSW cho vector similarity (nhanh hơn IVFFlat gấp 10-20 lần, không cần re-index)
CREATE INDEX IF NOT EXISTS idx_legal_chunks_embedding 
ON public.legal_chunks USING hnsw (embedding vector_cosine_ops);

-- =============================================================================
-- 3. BẢNG HÀNG ĐỢI KHOẢNG TRỐNG TRI THỨC (KNOWLEDGE GAPS / UNRESOLVED QUERIES)
-- Thu thập câu hỏi công dân chưa có luật để Quản trị viên nạp bổ sung
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.unresolved_queries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- BigInt Identity chuẩn SQL tránh phân mảnh index
    query_text TEXT NOT NULL,
    normalized_query TEXT NOT NULL,
    domain_guess TEXT DEFAULT 'OTHER' NOT NULL REFERENCES public.legal_domains(code) ON UPDATE CASCADE,
    hit_count INT DEFAULT 1 NOT NULL CHECK (hit_count >= 1),
    status TEXT DEFAULT 'unreviewed' NOT NULL CHECK (status IN ('unreviewed', 'resolved', 'ignored')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Partial Index tối ưu theo best practice: chỉ lập chỉ mục cho câu hỏi chưa duyệt
CREATE INDEX IF NOT EXISTS idx_unresolved_queries_unreviewed 
ON public.unresolved_queries (hit_count DESC) 
WHERE status = 'unreviewed';

CREATE INDEX IF NOT EXISTS idx_unresolved_queries_status 
ON public.unresolved_queries (status);

-- Unique Partial Index chống Race Condition khi nhiều client gửi câu hỏi cùng lúc
CREATE UNIQUE INDEX IF NOT EXISTS idx_unresolved_queries_dedup 
ON public.unresolved_queries (normalized_query) 
WHERE status = 'unreviewed';

-- =============================================================================
-- 4. BẢNG CẤU HÌNH HỆ THỐNG ĐỘNG (SYSTEM CONFIGURATIONS)
-- Thay thế hoàn toàn hardcode trong mã nguồn, cho phép Web Admin chỉnh sửa thời gian thực
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.system_configs (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Nạp cấu hình mặc định ban đầu
INSERT INTO public.system_configs (key, value, description)
VALUES 
    ('search_weights', '{"keyword": 0.25, "unigram": 0.35, "bigram": 0.40, "citationArticleBonus": 0.35, "citationDocBonus": 0.15}'::JSONB, 'Trọng số thuật toán chấm điểm tìm kiếm'),
    ('confidence_threshold', '0.65'::JSONB, 'Ngưỡng tin cậy tối thiểu để trả lời căn cứ pháp lý'),
    ('min_query_length', '3'::JSONB, 'Độ dài tối thiểu của câu hỏi hợp lệ'),
    ('stop_words', '["là", "và", "hoặc", "thì", "mà", "của", "ở", "tại", "trong", "khi", "bị", "được", "cho", "về", "này", "đó", "gì", "bao", "nhiêu", "mấy", "các", "những", "một", "cái", "quy", "định", "theo"]'::JSONB, 'Danh mục hư từ tiếng Việt')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 5. PHÂN QUYỀN TRUY CẬP (OBJECT-LEVEL GRANTS) & ROW LEVEL SECURITY (RLS)
-- Cấp quyền bảng (Layer 1) và Thiết lập chính sách bảo mật dòng (Layer 2)
-- =============================================================================
-- 5.1. Cấp quyền truy cập bảng cho các roles Supabase (Bắt buộc theo chuẩn PostgreSQL)
GRANT ALL ON TABLE public.legal_domains TO service_role;
GRANT ALL ON TABLE public.legal_chunks TO service_role;
GRANT ALL ON TABLE public.unresolved_queries TO service_role;
GRANT ALL ON TABLE public.system_configs TO service_role;

GRANT SELECT ON TABLE public.legal_domains TO anon, authenticated;
GRANT SELECT ON TABLE public.legal_chunks TO anon, authenticated;
GRANT INSERT, SELECT ON TABLE public.unresolved_queries TO anon, authenticated;
GRANT SELECT ON TABLE public.system_configs TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, anon, authenticated;

-- Kích hoạt RLS trên tất cả các bảng
ALTER TABLE public.legal_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unresolved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- 5.0. Chính sách bảng legal_domains: Người dùng được đọc danh mục, Admin toàn quyền
DROP POLICY IF EXISTS "Public Read Legal Domains" ON public.legal_domains;
CREATE POLICY "Public Read Legal Domains" 
ON public.legal_domains FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Admin Full Legal Domains" ON public.legal_domains;
CREATE POLICY "Admin Full Legal Domains" 
ON public.legal_domains FOR ALL 
TO service_role 
USING (true);

-- 5.1. Chính sách bảng legal_chunks: Công chúng được đọc, chỉ Admin Service Role được ghi
DROP POLICY IF EXISTS "Public Read Legal Chunks" ON public.legal_chunks;
CREATE POLICY "Public Read Legal Chunks" 
ON public.legal_chunks FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Admin Full Legal Chunks" ON public.legal_chunks;
CREATE POLICY "Admin Full Legal Chunks" 
ON public.legal_chunks FOR ALL 
TO service_role 
USING (true);

-- 5.2. Chính sách bảng unresolved_queries: Người dùng được gửi câu hỏi, Admin toàn quyền
DROP POLICY IF EXISTS "Public Insert Unresolved Queries" ON public.unresolved_queries;
CREATE POLICY "Public Insert Unresolved Queries" 
ON public.unresolved_queries FOR INSERT 
TO anon, authenticated 
WITH CHECK (length(trim(query_text)) >= 3);

DROP POLICY IF EXISTS "Admin Full Unresolved Queries" ON public.unresolved_queries;
CREATE POLICY "Admin Full Unresolved Queries" 
ON public.unresolved_queries FOR ALL 
TO service_role 
USING (true);

-- 5.3. Chính sách bảng system_configs: Người dùng được đọc, Admin toàn quyền
DROP POLICY IF EXISTS "Public Read System Configs" ON public.system_configs;
CREATE POLICY "Public Read System Configs" 
ON public.system_configs FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Admin Full System Configs" ON public.system_configs;
CREATE POLICY "Admin Full System Configs" 
ON public.system_configs FOR ALL 
TO service_role 
USING (true);

-- =============================================================================
-- 6. HÀM TÌM KIẾM HYBRID KẾT HỢP VECTOR & FULL-TEXT SEARCH (STORED PROCEDURE)
-- Tối ưu: SET search_path = public bảo vệ an ninh, websearch_to_tsquery chống lỗi cú pháp
-- =============================================================================
CREATE OR REPLACE FUNCTION match_legal_chunks (
    query_text TEXT DEFAULT '',
    query_embedding VECTOR(768) DEFAULT NULL,
    match_count INT DEFAULT 5,
    filter_domain TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    doc_number TEXT,
    domain TEXT,
    article TEXT,
    clause TEXT,
    point TEXT,
    full_reference TEXT,
    content TEXT,
    keywords TEXT[],
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        lc.id,
        lc.doc_number,
        lc.domain,
        lc.article,
        lc.clause,
        lc.point,
        lc.full_reference,
        lc.content,
        lc.keywords,
        CASE 
            WHEN query_embedding IS NOT NULL AND lc.embedding IS NOT NULL THEN
                (1 - (lc.embedding <=> query_embedding))::FLOAT
            ELSE
                ts_rank(lc.search_vector, websearch_to_tsquery('simple', query_text))::FLOAT
        END AS similarity
    FROM public.legal_chunks lc
    WHERE 
        (filter_domain IS NULL OR lc.domain = filter_domain)
        AND (
            (query_embedding IS NOT NULL AND lc.embedding IS NOT NULL)
            OR (query_text IS NOT NULL AND query_text <> '' AND lc.search_vector @@ websearch_to_tsquery('simple', query_text))
        )
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Cấp quyền thực thi hàm RPC cho các roles
GRANT EXECUTE ON FUNCTION public.match_legal_chunks TO anon, authenticated, service_role;

-- =============================================================================
-- 7. HÀM GHI NHẬN KHOẢNG TRỐNG TRI THỨC NGUYÊN TỬ (ATOMIC GAP LOGGING)
-- Chạy dưới quyền SECURITY DEFINER giúp client public anon ghi nhận câu hỏi an toàn
-- Tự động tăng hit_count nếu trùng, giải quyết triệt để Issue C1 & I1
-- =============================================================================
CREATE OR REPLACE FUNCTION record_unresolved_query (
    p_query_text TEXT,
    p_domain_guess TEXT DEFAULT 'OTHER'
)
RETURNS public.unresolved_queries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_normalized TEXT;
    v_result public.unresolved_queries;
BEGIN
    v_normalized := lower(unaccent(trim(p_query_text)));
    v_normalized := regexp_replace(v_normalized, '[^\w\s]', ' ', 'g');
    v_normalized := regexp_replace(v_normalized, '\s+', ' ', 'g');
    v_normalized := trim(v_normalized);

    IF length(v_normalized) < 3 THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.unresolved_queries (query_text, normalized_query, domain_guess, hit_count, status)
    VALUES (trim(p_query_text), v_normalized, p_domain_guess, 1, 'unreviewed')
    ON CONFLICT (normalized_query) WHERE status = 'unreviewed'
    DO UPDATE SET 
        hit_count = public.unresolved_queries.hit_count + 1,
        updated_at = now()
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_unresolved_query TO anon, authenticated, service_role;
