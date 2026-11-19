# Danh sách Công việc (Tasks): 002 - Hybrid Search, Fallback Guard & Knowledge Gap Queue

> **Quy tắc:** Chỉ được đánh dấu `[x]` sau khi code đã được kiểm tra bằng Unit Test trong `tests/` và đã review khớp với `spec.md`.

- [x] `t1: Định nghĩa Types (SearchQuery, SearchResponse, UnresolvedQuery) trong src/search/types.ts` (Review: Đã định nghĩa đầy đủ)
- [x] `t2: Viết Unit Tests trong specs/002-hybrid-search-fallback/tests/search-fallback.test.ts theo 3 kịch bản BDD` (Review: 4 test scenarios)
- [x] `t3: Cài đặt KnowledgeGapQueue trong src/search/gap-queue.ts (quản lý unresolved_queries, khử trùng lặp & hitCount)` (Review: Jaccard deduplication & domain guess)
- [x] `t4: Cài đặt LegalSearchEngine & ConfidenceGuard trong src/search/engine.ts (tính điểm tin cậy & chặn ảo giác)` (Review: Confidence threshold 0.65)
- [x] `t5: Chạy test suite và xác nhận 100% tests pass theo TDD` (Review: 11/11 tests passing)
- [x] `t6: Kiểm chứng tích hợp với dữ liệu 4.501 chunks thực tế` (Review: Search & Fallback chuẩn xác trên toàn bộ kho luật)
