# Bước 4: Chia Lát Dọc (Vertical Slicing Tasks) — 002: Legal Search & Fallback Guard

> **Nguyên tắc phân rã công việc:**
> - Tuyệt đối không chia theo tầng ngang (viết hết DB -> viết hết API -> viết hết UI).
> - Chia theo **Lát cắt dọc (Vertical Slices)**: Mỗi lát cắt hoàn thành trọn vẹn từ Input -> Logic -> Output và **bắt buộc có lệnh kiểm tra độc lập**.
> - **Chỉ đánh dấu `[x]` sau khi lệnh kiểm tra của lát cắt đó chạy XANH (Test Passed).**

---

### Lát cắt 1: Luồng Tìm Kiếm Cốt Lõi (Core Search Happy Path Slice)
*Mục tiêu: Đưa câu hỏi người dùng đi qua bộ máy tìm kiếm, đối soát từ khóa và trả về trích dẫn điều luật chính xác khi câu hỏi có trong dữ liệu.*
- [x] `t1.1: Định nghĩa Types & Signatures cơ bản (SearchQuery, SearchResponse) trong src/search/types.ts`
- [x] `t1.2: Viết Unit Test cho Kịch bản 1 - Tìm thấy điều luật chính xác (Test ĐỎ)`
- [x] `t1.3: Cài đặt LegalSearchEngine tối thiểu với thuật toán tính điểm scoreChunk() để test XANH`
*👉 Lệnh kiểm tra Lát 1:* `npx vitest run specs/002-hybrid-search-fallback/tests/search-fallback.test.ts -t "Kịch bản 1"`

---

### Lát cắt 2: Bộ Lọc Chặn Ảo Giác & Ghi Nhận Thiếu (Resilience & Fallback Guard Slice)
*Mục tiêu: Chặn tuyệt đối việc AI tự suy diễn luật khi điểm tin cậy < 0.65; trả về phản hồi an toàn và ghi nhận vào Knowledge Gap Queue.*
- [x] `t2.1: Định nghĩa UnresolvedQuery type và mở rộng ExtendedDomain trong src/search/types.ts`
- [x] `t2.2: Viết Unit Test cho Kịch bản 2 (Fallback Guard) và Kịch bản 4 (Tự động đoán domain) (Test ĐỎ)`
- [x] `t2.3: Cài đặt KnowledgeGapQueue.logQuery() và tích hợp ngưỡng threshold trong engine.ts để test XANH`
*👉 Lệnh kiểm tra Lát 2:* `npx vitest run specs/002-hybrid-search-fallback/tests/search-fallback.test.ts -t "Kịch bản 2"`

---

### Lát cắt 3: Khử Trùng Lặp & Tích Hợp Trên 4.501 Chunks Thực Tế (De-duplication & Full Real Data Slice)
*Mục tiêu: Khử trùng lặp thông minh (Jaccard similarity >= 0.6) để gom nhóm câu hỏi và kiểm chứng end-to-end trên toàn bộ 5 bộ luật thực tế.*
- [x] `t3.1: Viết Unit Test cho Kịch bản 3 - Gom nhóm câu hỏi tương tự tăng hitCount (Test ĐỎ)`
- [x] `t3.2: Cài đặt hàm calculateJaccardSimilarity() và cơ chế de-dup trong gap-queue.ts để test XANH`
- [x] `t3.3: Viết Integration Test specs/002-hybrid-search-fallback/tests/search-real-data.test.ts nạp 4.501 chunks thực tế`
- [x] `t3.4: Chạy toàn bộ test suite dự án và đối soát lại toàn bộ spec.md`
*👉 Lệnh kiểm tra Lát 3:* `npm test`
