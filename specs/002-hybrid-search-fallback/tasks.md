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
- [x] `t1.3: Cài đặt LegalSearchEngine với thuật toán tính điểm scoreChunk() để test XANH`
*👉 Lệnh kiểm tra Lát 1:* `npx vitest run specs/002-hybrid-search-fallback/tests/search-fallback.test.ts -t "Kịch bản 1"`

---

### Lát cắt 2: Bộ Lọc Chặn Ảo Giác & Ghi Nhận Thiếu (Resilience & Fallback Guard Slice)
*Mục tiêu: Chặn tuyệt đối việc AI tự suy diễn luật khi điểm tin cậy < 0.65; trả về phản hồi an toàn, chặn rác đầu vào và ghi nhận vào Knowledge Gap Queue.*
- [x] `t2.1: Định nghĩa UnresolvedQuery, GapQueueStats và mở rộng ExtendedDomain trong src/search/types.ts`
- [x] `t2.2: Viết Unit Test cho Kịch bản 2 (Fallback Guard), Kịch bản 4 (Tự động đoán domain) và Kịch bản 7 (Chặn input rác) (Test ĐỎ)`
- [x] `t2.3: Cài đặt KnowledgeGapQueue.logQuery() và tích hợp InputValidationGuard trong engine.ts để test XANH`
*👉 Lệnh kiểm tra Lát 2:* `npx vitest run specs/002-hybrid-search-fallback/tests/search-fallback.test.ts -t "Kịch bản 2|Kịch bản 7"`

---

### Lát cắt 3: Khử Trùng Lặp & Quản Trị Hàng Đợi Web Admin (De-duplication & Admin Management Slice)
*Mục tiêu: Khử trùng lặp thông minh (Jaccard similarity >= 0.6) để gom nhóm câu hỏi và cung cấp công cụ quản trị duyệt/bỏ qua/thống kê cho Web Admin.*
- [x] `t3.1: Viết Unit Test cho Kịch bản 3 (Gom nhóm tăng hitCount) và Kịch bản 8 (Quản trị Web Admin) (Test ĐỎ)`
- [x] `t3.2: Cài đặt resolveGap(), ignoreGap(), getStats(), searchGaps() trong gap-queue.ts để test XANH`
*👉 Lệnh kiểm tra Lát 3:* `npx vitest run specs/002-hybrid-search-fallback/tests/search-fallback.test.ts -t "Kịch bản 3|Kịch bản 8"`

---

### Lát cắt 4: Tối Ưu Tiếng Việt Không Dấu, Citation Booster & Tích Hợp 4.501 Chunks (Optimization & Full Scale Slice)
*Mục tiêu: Tối ưu so khớp tiếng Việt không dấu, cơ chế Citation Booster nhận diện đích danh Điều luật và thuật toán Bigram n-gram vượt qua toàn bộ 4.501 chunks thực tế.*
- [x] `t4.1: Viết Unit Test cho Kịch bản 5 (Tiếng Việt không dấu) và Kịch bản 6 (Citation Booster) (Test ĐỎ)`
- [x] `t4.2: Cài đặt removeVietnameseDiacritics() và extractBigrams() trong engine.ts để test XANH`
- [x] `t4.3: Viết Integration Test specs/002-hybrid-search-fallback/tests/search-real-data.test.ts nạp 4.501 chunks thực tế`
- [x] `t4.4: Chạy toàn bộ test suite dự án và đối soát lại toàn bộ spec.md`
*👉 Lệnh kiểm tra Lát 4:* `npm test`
