# TASKS-003: Chia Lát Dọc Triển khai Lớp Lưu trữ Supabase

## BƯỚC 4: CHIA LÁT DỌC (Vertical Slicing)

Quy tắc: Mỗi lát cắt đi xuyên từ Input -> Logic -> Output và **bắt buộc có lệnh kiểm thử độc lập (Test Verification Command)** để nghiệm thu ngay.

---

### Lát 1: Cấu hình Môi trường & Schema Migration SQL
- [x] **t3.1.1:** Soạn thảo `specs/003-supabase-storage/schema.sql` tuân thủ 100% `supabase-postgres-best-practices` (pgvector, HNSW, tsvector, RLS, BigInt Identity).
- [x] **t3.1.2:** Thiết lập `.env.example` và cập nhật `.gitignore` để không bao giờ lộ credentials.
- [x] **t3.1.3:** Kiểm tra tính toàn vẹn của DDL schema và biến môi trường mẫu.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    node -e "const fs = require('fs'); const sql = fs.readFileSync('specs/003-supabase-storage/schema.sql', 'utf8'); console.assert(sql.includes('CREATE EXTENSION IF NOT EXISTS vector'), 'Missing vector'); console.assert(sql.includes('ENABLE ROW LEVEL SECURITY'), 'Missing RLS'); console.log('✅ Slice 1 Schema Verification Passed!');"
    ```

---

### Lát 2: Supabase Client & Repository Pattern
- [x] **t3.2.1:** Định nghĩa kiểu dữ liệu chuẩn `src/storage/types.ts` (`LegalChunkRecord`, `UnresolvedQueryRecord`, `SearchOptions`).
- [x] **t3.2.2:** Xây dựng `src/storage/supabase-client.ts` tạo singleton client với xử lý lỗi biến môi trường rõ ràng.
- [x] **t3.2.3:** Xây dựng `src/storage/supabase-legal-repo.ts` hỗ trợ `upsertBatch`, `getById`, `count` và gọi hàm RPC `match_legal_chunks`.
- [x] **t3.2.4:** Xây dựng `src/storage/supabase-gap-repo.ts` hỗ trợ lưu câu hỏi chưa có lời giải và chống trùng lặp.
- [x] **t3.2.5:** Viết bộ kiểm thử unit test giả lập (Mock Client) trong `specs/003-supabase-storage/tests/supabase-repos.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/003-supabase-storage/tests/supabase-repos.test.ts
    ```

---

### Lát 3: Tập lệnh Nạp Hàng loạt 4.715 Chunks (Batch Ingestion Pipeline)
- [x] **t3.3.1:** Xây dựng script `scripts/upload-chunks-to-supabase.mjs` đọc 5 file `data/processed/*.chunks.json`.
- [x] **t3.3.2:** Tích hợp phân lô (batching 500 records/lô) theo `data-batch-inserts.md` với thanh tiến trình trực quan.
- [x] **t3.3.3:** Bổ sung script `"upload:supabase"` vào `package.json`.
- [x] **t3.3.4:** Viết test kiểm tra logic phân lô dữ liệu 4.715 chunks.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/003-supabase-storage/tests/upload-batch.test.ts
    ```

---

### Lát 4: Tích hợp Toàn diện & Hướng dẫn Kết nối
- [x] **t3.4.1:** Chạy toàn bộ test suite dự án (`npm test`) đảm bảo không phá vỡ các module `001` và `002`.
- [x] **t3.4.2:** Biên dịch TypeScript (`npm run build`) đảm bảo 0 lỗi type.
- [x] **t3.4.3:** Hướng dẫn chi tiết cho người dùng các bước kết nối với Supabase Cloud (tạo project Singapore, chạy SQL, lấy API key và nạp dữ liệu).
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npm test && npm run build
    ```
