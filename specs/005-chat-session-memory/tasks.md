# TASKS-005: Chia Lát Dọc Triển Khai Bộ Nhớ Ngữ Cảnh & Phiên Hội Thoại Pháp Lý

## BƯỚC 4: CHIA LÁT DỌC (Vertical Slicing)

Quy tắc: Mỗi lát cắt đi xuyên từ Input -> Logic -> Output và **bắt buộc có lệnh kiểm thử độc lập (Test Verification Command)** để nghiệm thu ngay.

---

### Lát 1: Quản lý Phiên Hội Thoại & Bộ Lưu Trữ Session (Session Store Slice)
- [x] **t5.1.1:** Định nghĩa kiểu dữ liệu chuẩn `src/session/types.ts` (`ChatMessage`, `ChatSession`, `ISessionStore`, `SessionConfig`, `DEFAULT_SESSION_CONFIG`).
- [x] **t5.1.2:** Xây dựng `src/session/in-memory-session-store.ts` (`InMemorySessionStore`) hỗ trợ CRUD phiên, phân trang tin nhắn và sliding window turns.
- [x] **t5.1.3:** Xây dựng `src/session/supabase-session-store.ts` (`SupabaseSessionStore`) liên kết bảng `chat_sessions` & `chat_messages`.
- [x] **t5.1.4:** Viết bộ kiểm thử unit test trong `specs/005-chat-session-memory/tests/session-store.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/005-chat-session-memory/tests/session-store.test.ts
    ```

---

### Lát 2: Tái Tạo Câu Hỏi Theo Ngữ Cảnh (Query Condenser & Topic Shift Slice)
- [x] **t5.2.1:** Xây dựng `src/session/query-condenser.ts` (`RuleAndLlmQueryCondenser`).
- [x] **t5.2.2:** Xây dựng bộ quy tắc Heuristic ban đầu (đã được nâng cấp lên kiến trúc Pure LLM-only tại Spec 016 Cách B để tránh sai lệch tiếng Việt không dấu/từ đồng âm).
- [x] **t5.2.3:** Tích hợp cơ chế tái tạo câu hỏi phụ thuộc thành câu hỏi độc lập (Standalone Query), tự động nhận diện chuyển chủ đề (Topic Shift).
- [x] **t5.2.4:** Viết bộ kiểm thử unit test trong `specs/005-chat-session-memory/tests/query-condenser.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/005-chat-session-memory/tests/query-condenser.test.ts
    ```

---

### Lát 3: Tích Hợp Contextual RAG Pipeline Đa Lượt (Integration Slice)
- [x] **t5.3.1:** Xây dựng `src/session/pipeline.ts` (`ContextualRagPipeline`) kết nối SessionStore, QueryCondenser và `GroundedRagPipeline`.
- [x] **t5.3.2:** Điều phối luồng đa lượt: Lấy lịch sử trượt -> Tái tạo câu hỏi -> Tra cứu RAG -> Lưu trữ tin nhắn và trích dẫn vào phiên.
- [x] **t5.3.3:** Viết bộ kiểm thử trong `specs/005-chat-session-memory/tests/contextual-pipeline.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/005-chat-session-memory/tests/contextual-pipeline.test.ts
    ```

---

### Lát 4: Bộ Kiểm Thử BDD Đa Lượt & Nghiệm Thu Code Review (Production Slice)
- [x] **t5.4.1:** Viết bộ kiểm thử BDD toàn diện `specs/005-chat-session-memory/tests/mockup-bdd.test.ts` kiểm chứng 5 kịch bản nghiệm thu từ `spec.md`.
- [x] **t5.4.2:** Chạy toàn bộ test suite dự án (`npm test`) và biên dịch TypeScript (`npm run build`).
- [x] **t5.4.3:** Kích hoạt Chốt chặn Code Review độc lập (`/code-review`) và khắc phục triệt để các phát hiện trước khi đóng Giai đoạn 1.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npm test && npm run build
    ```
