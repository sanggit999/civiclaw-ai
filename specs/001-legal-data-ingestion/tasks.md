# Bước 4: Chia Lát Dọc (Vertical Slicing Tasks) — 001: Legal Data Ingestion Pipeline

> **Nguyên tắc phân rã công việc:**
> - Tuyệt đối không chia theo tầng ngang (viết hết DB -> viết hết API -> viết hết UI).
> - Chia theo **Lát cắt dọc (Vertical Slices)**: Mỗi lát cắt hoàn thành trọn vẹn từ Input -> Logic -> Output và **bắt buộc có lệnh kiểm tra độc lập**.
> - **Chỉ đánh dấu `[x]` sau khi lệnh kiểm tra của lát cắt đó chạy XANH (Test Passed).**

---

### Lát cắt 1: Luồng Phân Đoạn Phân Cấp Cốt Lõi (Core Hierarchy Slice)
*Mục tiêu: Đưa văn bản luật đi qua State Machine nhận diện phân cấp Điều -> Khoản -> Điểm, bảo toàn 3 tầng ngữ cảnh và trích xuất từ khóa mức phạt.*
- [x] `t1.1: Định nghĩa Types (LegalDocumentMetadata, LegalChunk, LegalDomain) trong src/ingestion/types.ts`
- [x] `t1.2: Viết Unit Test cho Kịch bản 1 - Phân đoạn Điều/Khoản/Điểm bảo toàn ngữ cảnh (Test ĐỎ)`
- [x] `t1.3: Cài đặt LegalHierarchyParser & KeywordExtractor trong src/ingestion/parser.ts để test XANH`
*👉 Lệnh kiểm tra Lát 1:* `npx vitest run specs/001-legal-data-ingestion/tests/ingestion.test.ts -t "Kịch bản 1"`

---

### Lát cắt 2: Bộ Làm Sạch Thực Thể HTML & Tiêu Ngữ (Resilience & Cleaner Slice)
*Mục tiêu: Loại bỏ 100% dòng rác tiêu ngữ, số trang và giải mã an toàn các thực thể HTML (&#32;, &nbsp;) để không làm trượt regex.*
- [x] `t2.1: Viết Unit Test cho Kịch bản 2 & 3 - Làm sạch rác văn bản, giải mã &#32; và gán Metadata (Test ĐỎ)`
- [x] `t2.2: Cài đặt LegalTextCleaner trong src/ingestion/cleaner.ts giải mã HTML entities và chuẩn hóa dòng để test XANH`
*👉 Lệnh kiểm tra Lát 2:* `npx vitest run specs/001-legal-data-ingestion/tests/ingestion.test.ts -t "Kịch bản 3"`

---

### Lát cắt 3: Bóc Tách Toàn Diện 4.501 Chunks Trên 5 Bộ Luật Thực Tế (Full Scale Real Data Slice)
*Mục tiêu: Tải 5 file PDF gốc mộc đỏ, nạp 5 văn bản toàn văn thực tế và xuất bản 4.501 chunks JSON chuẩn hóa.*
- [x] `t3.1: Viết Integration Test specs/001-legal-data-ingestion/tests/real-data.test.ts kiểm chứng Điều 6 Khoản 2 Điểm a`
- [x] `t3.2: Tải 5 file PDF gốc vào data/raw/ và 5 file text toàn văn từ Công Báo`
- [x] `t3.3: Xây dựng scripts/run-all-ingestion.mjs bóc tách thành công 4.501 chunks vào data/processed/`
- [x] `t3.4: Chạy toàn bộ test suite dự án và đối soát lại toàn bộ spec.md`
*👉 Lệnh kiểm tra Lát 3:* `npx vitest run specs/001-legal-data-ingestion/tests/real-data.test.ts`
