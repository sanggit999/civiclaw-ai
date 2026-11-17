# Danh sách Công việc (Tasks): 001 - Legal Data Ingestion Pipeline

> **Quy tắc:** Chỉ được đánh dấu `[x]` sau khi code đã được kiểm tra bằng Unit Test trong `tests/` và đã review khớp với `spec.md`.

- [x] `t1: Định nghĩa Types (LegalDocumentMetadata, LegalChunk, LegalDomain) trong src/ingestion/types.ts` (Review: Đã hoàn thiện)
- [x] `t2: Viết Unit Tests trong specs/001-legal-data-ingestion/tests/ingestion.test.ts theo 3 kịch bản BDD` (Review: 3 kịch bản Given-When-Then)
- [x] `t3: Cài đặt LegalTextCleaner trong src/ingestion/cleaner.ts để làm sạch tiêu ngữ và số trang` (Review: Đã kiểm chứng xóa rác)
- [x] `t4: Cài đặt LegalHierarchyParser trong src/ingestion/parser.ts (bóc tách Chương-Điều-Khoản-Điểm kèm ngữ cảnh)` (Review: Bảo toàn ngữ cảnh)
- [x] `t5: Cài đặt KeywordExtractor để bắt số tiền phạt và từ khóa chủ thể` (Review: Bắt đúng mức phạt và từ khóa xe)
- [x] `t6: Chạy toàn bộ test suite và xác nhận 100% tests đều xanh` (Review: vitest run pass 100% trong 7ms)
- [x] `t7: Tải và lưu trữ văn bản luật gốc (PDF + HTML/Text bổ sung) vào data/raw/` (Review: Đã tải 5 bản PDF gốc mộc đỏ và 5 bản text chuẩn hóa; kiểm thử phân đoạn thành công 1.051 chunks cho Nghị định 168)
