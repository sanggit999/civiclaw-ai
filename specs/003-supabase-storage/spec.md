# SPEC-003: Supabase Storage & Persistence Layer (Lớp Lưu trữ Supabase & Đồng bộ Dữ liệu Pháp luật)

## BƯỚC 1: PRODUCT REVIEW (Đặc tả Sản phẩm)

### 1.1. Vấn đề (Problem Statement)
Hiện tại, ở module `specs/001-legal-data-ingestion` và `specs/002-hybrid-search-fallback`, toàn bộ dữ liệu 4.715 chunks pháp luật và danh sách câu hỏi chưa được giải quyết (`unresolved_queries`) đang được lưu trữ dưới dạng file JSON tĩnh trên đĩa (`data/processed/*.chunks.json`) hoặc giữ trong RAM máy chủ:
1. **Thiếu tính bền vững (Persistence):** Khi tiến trình Node.js khởi động lại hoặc triển khai đa phiên bản (multi-instance/serverless), dữ liệu trong RAM mất hết (đặc biệt là hàng đợi `unresolved_queries` do công dân đóng góp).
2. **Không thể mở rộng (Scalability):** Việc nạp toàn bộ 4.715 chunks vào RAM khi khởi động ứng dụng gây tốn bộ nhớ và chậm trễ khi kho luật mở rộng lên hàng chục ngàn điều luật.
3. **Không hỗ trợ đa client:** Cả ứng dụng Web Admin (Next.js) và Ứng dụng Di động (React Native / Expo) cần một Backend-as-a-Service tập trung, có phân quyền bảo mật (Row Level Security) để truy xuất dữ liệu an toàn mà không làm lộ khóa bí mật (Secret Key).
4. **Vấn đề môi trường cục bộ:** Môi trường Windows của người dùng không chạy sẵn daemon Docker Desktop, việc ép dùng Docker cục bộ gây tốn RAM và lỗi môi trường.

### 1.2. Hành vi Mong muốn (Desired Behavior)
1. **Kho dữ liệu đám mây Supabase PostgreSQL 15+:** Toàn bộ 4.715 chunks điều luật và bảng câu hỏi chờ duyệt được lưu trữ an toàn, có chỉ mục vector (`HNSW` via `pgvector`) và chỉ mục tìm kiếm toàn văn (`GIN` trên `search_vector`).
2. **Tuân thủ Supabase Postgres Best Practices:**
   - Định danh `snake_case` chữ thường, `timestamptz`, `BigInt generated always as identity` cho khóa chính tránh phân mảnh B-tree index.
   - Kích hoạt Row Level Security (RLS): Cho phép người dùng công cộng (`anon`) đọc điều luật và gửi câu hỏi mới; bảo lưu quyền quản trị (CUD điều luật, duyệt câu hỏi, cấu hình tham số hệ thống) cho `service_role`.
   - Batch insert (phân lô 500-1000 bản ghi) khi nạp 4.715 chunks nhằm tối ưu round-trip mạng theo `data-batch-inserts.md`.
3. **Repository Pattern linh hoạt:** Cung cấp `SupabaseLegalRepository` và `SupabaseGapRepository` thực thi các interface trừu tượng (`ILegalRepository`, `IKnowledgeGapRepository`), cho phép hệ thống hoạt động với Supabase khi online và tự động fallback/mock khi chạy kiểm thử offline mà không phụ thuộc mạng internet.
4. **Tập lệnh nạp tự động (Batch Ingestion Script):** Một lệnh duy nhất `npm run upload:supabase` đọc 4.715 chunks từ `data/processed/` và nạp vào bảng `legal_chunks` trên Supabase với thanh tiến trình trực quan.

### 1.3. Mock-up Giao diện & Luồng Dữ liệu
```
+--------------------------------------------------------------------------+
|                     CIVICLAW AI - STORAGE ARCHITECTURE                   |
+--------------------------------------------------------------------------+
|                                                                          |
|   [ 4.715 Legal Chunks (JSON) ] ----> [ upload:supabase script ]         |
|                                                     |                    |
|                                                     v (Batch 500 rows)   |
|                                  +------------------------------------+  |
|                                  |        SUPABASE POSTGRESQL         |  |
|                                  |  - legal_chunks (HNSW + GIN)       |  |
|                                  |  - unresolved_queries (Partial Idx)|  |
|                                  |  - system_configs (JSONB)          |  |
|                                  |  - match_legal_chunks (RPC)        |  |
|                                  +------------------------------------+  |
|                                           ^                   ^          |
|                                           | (RLS: Read-only)  | (RLS:RW) |
|                                           |                   |          |
|                           [ Công dân / Web / Mobile ]   [ Admin CLI ]    |
|                           (Anon Key / JWT)              (Service Role)   |
|                                                                          |
+--------------------------------------------------------------------------+
```

### 1.4. Tiêu chí Nghiệm thu BDD (Given - When - Then)

#### Kịch bản 1: Khởi tạo kết nối Supabase an toàn
- **Given:** Biến môi trường `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` được cấu hình trong `.env`.
- **When:** Hệ thống khởi tạo `getSupabaseClient()`.
- **Then:** Client trả về kết nối hợp lệ, các truy vấn kiểm tra kết nối (ping/healthcheck) trả về trạng thái sẵn sàng.

#### Kịch bản 2: Nạp hàng loạt 4.715 chunks với cơ chế Upsert
- **Given:** 5 file `data/processed/*.chunks.json` chứa 4.715 chunks chuẩn hóa.
- **When:** Quản trị viên chạy lệnh `npm run upload:supabase`.
- **Then:** Hệ thống chia dữ liệu thành các lô nhỏ (chunking batch 500 bản ghi), gửi upsert lên bảng `legal_chunks`, thông báo số lượng thành công 4.715/4.715 và không gây trùng lặp bản ghi nếu chạy lại.

#### Kịch bản 3: Tìm kiếm kết hợp (Full-Text Search + RPC) trên Supabase
- **Given:** Bảng `legal_chunks` đã có dữ liệu và chỉ mục `GIN` trên cột `search_vector`.
- **When:** Người dùng tìm kiếm cụm từ `"vượt đèn đỏ"`.
- **Then:** Hàm RPC `match_legal_chunks` trả về đúng các điều luật giao thông (ví dụ Điều 6 Nghị định 168/2024/NĐ-CP) với điểm `similarity > 0`.

#### Kịch bản 4: Thu thập câu hỏi chưa có lời giải (Unresolved Query)
- **Given:** Người dùng gửi câu hỏi chưa tìm thấy điều luật phù hợp.
- **When:** `SupabaseGapRepository.recordQuery(queryText, domain)` được kích hoạt.
- **Then:** Bản ghi được chèn vào bảng `unresolved_queries` với trạng thái `'unreviewed'`, nếu trùng lặp nội dung chuẩn hóa thì tăng `hit_count` thay vì tạo bản ghi rác.
