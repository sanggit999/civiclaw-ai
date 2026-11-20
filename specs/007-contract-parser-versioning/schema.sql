-- =============================================================================
-- CIVICLAW AI - SPEC 007: MIGRATION CƠ SỞ DỮ LIỆU
-- QUẢN LÝ HỒ SƠ & PHIÊN BẢN HỢP ĐỒNG (CONTRACT DOCUMENTS & VERSIONS)
-- =============================================================================
-- Tuân thủ triệt để supabase-postgres-best-practices & SDD Domain Invariants:
-- 1. Định danh chuẩn: lowercase, snake_case, UUID v4 (gen_random_uuid())
-- 2. Chuẩn hóa thời gian: TIMESTAMPTZ mặc định timezone('utc', now())
-- 3. Toàn vẹn dữ liệu: CHECK constraints kiểm soát category, file_type, version >= 1, jsonb object
-- 4. Chống trùng lặp & bảo toàn lịch sử: UNIQUE (document_id, version_number) & UNIQUE (document_id, content_hash)
-- 5. Append-Only Invariant: Bảng contract_versions chỉ INSERT & SELECT (cấm UPDATE)
-- 6. Tối ưu truy vấn: B-Tree Indexes trên Foreign Keys (document_id, user_id) và created_at
-- 7. Idempotency: Hỗ trợ chạy lại an toàn nhiều lần không bao giờ báo lỗi (DO blocks + DROP POLICY)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG HỒ SƠ HỢP ĐỒNG (CONTRACT DOCUMENTS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    current_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Bổ sung cột user_id nếu bảng đã tồn tại từ trước
ALTER TABLE public.contract_documents 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NULL;

-- Ràng buộc kiểm tra (CHECK constraints) cho contract_documents (Idempotent DO blocks)
DO $$
BEGIN
    -- Kiểm tra category hợp lệ theo danh mục nghiệp vụ
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_contract_category' AND conrelid = 'public.contract_documents'::regclass
    ) THEN
        ALTER TABLE public.contract_documents 
            ADD CONSTRAINT chk_contract_category 
            CHECK (category IN ('labor', 'rental', 'civil_loan', 'general_civil'));
    END IF;

    -- Kiểm tra current_version >= 1
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_contract_current_version' AND conrelid = 'public.contract_documents'::regclass
    ) THEN
        ALTER TABLE public.contract_documents 
            ADD CONSTRAINT chk_contract_current_version 
            CHECK (current_version >= 1);
    END IF;

    -- Tiêu đề không được để trống
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_contract_title_not_empty' AND conrelid = 'public.contract_documents'::regclass
    ) THEN
        ALTER TABLE public.contract_documents 
            ADD CONSTRAINT chk_contract_title_not_empty 
            CHECK (length(trim(title)) > 0);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. BẢNG PHIÊN BẢN HỢP ĐỒNG (CONTRACT VERSIONS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.contract_documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    cleaned_text TEXT NOT NULL,
    audit_report JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    
    -- Ràng buộc tính duy nhất: 
    -- 1 document không thể có 2 version trùng số thứ tự
    CONSTRAINT uq_contract_version_number UNIQUE (document_id, version_number),
    -- 1 document không thể upload 2 file trùng hệt mã hash SHA-256
    CONSTRAINT uq_contract_version_hash UNIQUE (document_id, content_hash)
);

-- Ràng buộc kiểm tra (CHECK constraints) cho contract_versions (Idempotent DO blocks)
DO $$
BEGIN
    -- Kiểm tra version_number >= 1
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_version_number_positive' AND conrelid = 'public.contract_versions'::regclass
    ) THEN
        ALTER TABLE public.contract_versions 
            ADD CONSTRAINT chk_version_number_positive 
            CHECK (version_number >= 1);
    END IF;

    -- Kiểm tra định dạng file hợp lệ
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_file_type' AND conrelid = 'public.contract_versions'::regclass
    ) THEN
        ALTER TABLE public.contract_versions 
            ADD CONSTRAINT chk_file_type 
            CHECK (file_type IN ('docx', 'pdf', 'txt', 'md', 'doc'));
    END IF;

    -- Tên file không được để trống
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_file_name_not_empty' AND conrelid = 'public.contract_versions'::regclass
    ) THEN
        ALTER TABLE public.contract_versions 
            ADD CONSTRAINT chk_file_name_not_empty 
            CHECK (length(trim(file_name)) > 0);
    END IF;

    -- Mã băm nội dung không được để trống
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_content_hash_not_empty' AND conrelid = 'public.contract_versions'::regclass
    ) THEN
        ALTER TABLE public.contract_versions 
            ADD CONSTRAINT chk_content_hash_not_empty 
            CHECK (length(trim(content_hash)) > 0);
    END IF;

    -- Nội dung bóc tách không được để trống
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_cleaned_text_not_empty' AND conrelid = 'public.contract_versions'::regclass
    ) THEN
        ALTER TABLE public.contract_versions 
            ADD CONSTRAINT chk_cleaned_text_not_empty 
            CHECK (length(trim(cleaned_text)) > 0);
    END IF;

    -- Báo cáo audit phải là cấu trúc JSONB Object hợp lệ
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_audit_report_is_object' AND conrelid = 'public.contract_versions'::regclass
    ) THEN
        ALTER TABLE public.contract_versions 
            ADD CONSTRAINT chk_audit_report_is_object 
            CHECK (jsonb_typeof(audit_report) = 'object');
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. CHỈ MỤC TỐI ƯU HIỆU NĂNG TRUY VẤN (B-TREE INDEXES)
-- -----------------------------------------------------------------------------
-- Tối ưu lọc hồ sơ theo người dùng
CREATE INDEX IF NOT EXISTS idx_contract_documents_user_id
    ON public.contract_documents (user_id);

-- Tối ưu JOIN và CASCADE giữa document và các versions (10-100x faster JOINs)
CREATE INDEX IF NOT EXISTS idx_contract_versions_doc_id 
    ON public.contract_versions (document_id);

-- Tối ưu truy vấn lịch sử phiên bản theo thứ tự thời gian
CREATE INDEX IF NOT EXISTS idx_contract_versions_created_at 
    ON public.contract_versions (created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. KÍCH HOẠT ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. CHÍNH SÁCH BẢO MẬT (RLS POLICIES) - CÓ DROP IF EXISTS ĐỂ CHẠY LẠI KHÔNG LỖI
-- -----------------------------------------------------------------------------
-- Bảng contract_documents: Cho phép xem, tạo, cập nhật phiên bản hiện tại, và xóa
DROP POLICY IF EXISTS "Allow public read contract_documents" ON public.contract_documents;
CREATE POLICY "Allow public read contract_documents" 
    ON public.contract_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert contract_documents" ON public.contract_documents;
CREATE POLICY "Allow public insert contract_documents" 
    ON public.contract_documents FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update contract_documents" ON public.contract_documents;
CREATE POLICY "Allow public update contract_documents" 
    ON public.contract_documents FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete contract_documents" ON public.contract_documents;
CREATE POLICY "Allow public delete contract_documents" 
    ON public.contract_documents FOR DELETE USING (true);

-- Bảng contract_versions: TUÂN THỦ APPEND-ONLY (Chỉ cho phép SELECT và INSERT, TUYỆT ĐỐI CẤM UPDATE)
DROP POLICY IF EXISTS "Allow public read contract_versions" ON public.contract_versions;
CREATE POLICY "Allow public read contract_versions" 
    ON public.contract_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert contract_versions" ON public.contract_versions;
CREATE POLICY "Allow public insert contract_versions" 
    ON public.contract_versions FOR INSERT WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 6. PHÂN QUYỀN TRUY CẬP (OBJECT-LEVEL GRANTS)
-- -----------------------------------------------------------------------------
GRANT ALL ON TABLE public.contract_documents, public.contract_versions TO service_role, anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, anon, authenticated;
