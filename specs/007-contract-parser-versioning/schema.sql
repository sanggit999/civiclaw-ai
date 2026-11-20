-- =============================================================================
-- CIVICLAW AI - SPEC 007: MIGRATION CƠ SỞ DỮ LIỆU
-- QUẢN LÝ HỒ SƠ & PHIÊN BẢN HỢP ĐỒNG (CONTRACT DOCUMENTS & VERSIONS)
-- =============================================================================

-- 1. BẢNG HỒ SƠ HỢP ĐỒNG (CONTRACT DOCUMENTS)
CREATE TABLE IF NOT EXISTS public.contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    current_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. BẢNG PHIÊN BẢN HỢP ĐỒNG (CONTRACT VERSIONS)
CREATE TABLE IF NOT EXISTS public.contract_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.contract_documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    cleaned_text TEXT NOT NULL,
    audit_report JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ràng buộc tính duy nhất: 
    -- 1 document không thể có 2 version trùng số thứ tự
    CONSTRAINT uq_contract_version_number UNIQUE (document_id, version_number),
    -- 1 document không thể upload 2 file trùng hệt mã hash SHA-256
    CONSTRAINT uq_contract_version_hash UNIQUE (document_id, content_hash)
);

-- 3. CHỈ MỤC TỐI ƯU HIỆU NĂNG TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_contract_versions_doc_id 
    ON public.contract_versions (document_id);

CREATE INDEX IF NOT EXISTS idx_contract_versions_created_at 
    ON public.contract_versions (created_at DESC);

-- 4. PHÂN QUYỀN TRUY CẬP (OBJECT-LEVEL GRANTS)
GRANT ALL ON TABLE public.contract_documents, public.contract_versions TO service_role;
GRANT ALL ON TABLE public.contract_documents, public.contract_versions TO anon, authenticated;

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read contract_documents" 
    ON public.contract_documents FOR SELECT USING (true);

CREATE POLICY "Allow public insert contract_documents" 
    ON public.contract_documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update contract_documents" 
    ON public.contract_documents FOR UPDATE USING (true);

CREATE POLICY "Allow public read contract_versions" 
    ON public.contract_versions FOR SELECT USING (true);

CREATE POLICY "Allow public insert contract_versions" 
    ON public.contract_versions FOR INSERT WITH CHECK (true);
