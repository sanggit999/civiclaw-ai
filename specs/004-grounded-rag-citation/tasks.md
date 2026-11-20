# TASKS-004: Chia Lát Dọc Triển Khai RAG Pháp Lý & Trích Dẫn Minh Bạch

## BƯỚC 4: CHIA LÁT DỌC (Vertical Slicing)

Quy tắc: Mỗi lát cắt đi xuyên từ Input -> Logic -> Output và **bắt buộc có lệnh kiểm thử độc lập (Test Verification Command)** để nghiệm thu ngay.

---

### Lát 1: Core Grounded Prompting & Mock LLM Provider (Core Slice)
- [x] **t4.1.1:** Định nghĩa kiểu dữ liệu chuẩn `src/rag/types.ts` (`RagQueryRequest`, `RagQueryResponse`, `GroundedCitation`, `RagPipelineConfig`).
- [x] **t4.1.2:** Xây dựng `src/rag/prompt-builder.ts` (`buildGroundedPrompt`, cấu hình `DEFAULT_RAG_CONFIG` loại bỏ hoàn toàn hardcode).
- [x] **t4.1.3:** Xây dựng `src/rag/mock-llm-provider.ts` phục vụ kiểm thử offline độc lập.
- [x] **t4.1.4:** Viết bộ kiểm thử unit test trong `specs/004-grounded-rag-citation/tests/prompt-builder.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/004-grounded-rag-citation/tests/prompt-builder.test.ts
    ```

---

### Lát 2: Chốt Chặn Kiểm Chứng Trích Dẫn & Chống Ảo Giác (Resilience Slice)
- [x] **t4.2.1:** Xây dựng `src/rag/citation-verifier.ts` (`RegexCitationVerifier`) bóc tách và đối soát trích dẫn luật.
- [x] **t4.2.2:** Xử lý các mẫu trích dẫn tiếng Việt: `Điều...`, `Khoản...`, `Điểm...`, `Nghị định...`, `Luật...`.
- [x] **t4.2.3:** Phát hiện trích dẫn ma (trích dẫn không xuất hiện trong context chunks) và gắn cờ cảnh báo.
- [x] **t4.2.4:** Viết bộ kiểm thử trong `specs/004-grounded-rag-citation/tests/citation-verifier.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/004-grounded-rag-citation/tests/citation-verifier.test.ts
    ```

---

### Lát 3: Điều Phối Pipeline RAG Toàn Diện (Integration Slice)
- [x] **t4.3.1:** Xây dựng `src/rag/pipeline.ts` (`GroundedRagPipeline`) liên kết Repository tìm kiếm, Bộ gác cổng tin cậy, LLM Provider và Citation Verifier.
- [x] **t4.3.2:** Tích hợp Honest Fallback Guard: Tự động từ chối khi `topScore < 0.65`, không gọi LLM và tự động ghi gap vào `unresolved_queries`.
- [x] **t4.3.3:** Xây dựng Extractive Grounded Fallback: Tự động trích xuất nguyên văn điều luật từ Database khi LLM gặp sự cố (429 Hết quota / 503 / Lỗi mạng), chống crash và chống trả lời vớ vẩn.
- [x] **t4.3.4:** Viết bộ kiểm thử trong `specs/004-grounded-rag-citation/tests/rag-pipeline.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/004-grounded-rag-citation/tests/rag-pipeline.test.ts
    ```

---

### Lát 4: Gemini LLM Client, Bộ Kiểm Thử BDD & Nghiệm Thu Code Review (Production Slice)
- [x] **t4.4.1:** Xây dựng `src/rag/gemini-llm-provider.ts` hỗ trợ kết nối Gemini API qua `GEMINI_API_KEY`.
- [x] **t4.4.2:** Viết bộ kiểm thử BDD toàn diện `specs/004-grounded-rag-citation/tests/mockup-bdd.test.ts` kiểm chứng 4 kịch bản nghiệm thu từ `spec.md`.
- [x] **t4.4.3:** Chạy toàn bộ test suite dự án (`npm test`) và biên dịch TypeScript (`npm run build`).
- [x] **t4.4.4:** Kích hoạt Chốt chặn Code Review (`/code-review` hoặc `/requesting-code-review`) và khắc phục triệt để các phát hiện.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npm test && npm run build
    ```
