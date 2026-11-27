# Bước 4: Chia Lát Dọc (Vertical Slicing Tasks) — Conversational Agentic RAG (`015`)

---

### Lát cắt 1: Persona Mirroring & Xưng hô Tự nhiên (`persona.ts`, `intent-router.ts`, `prompt-builder.ts`)
*Mục tiêu: Tự động nhận diện và giữ cặp xưng hô (Em–Anh, Anh/Chị–Em, Mình–Bạn) xuyên suốt phiên chat và bỏ khung 3 mục cứng nhắc trong Prompt.*
- [x] `t1.1: Viết Unit Test TDD cho detectVietnamesePersona, resolveSessionPersona, classifyIntent xưng hô và buildGroundedPrompt văn phong tự nhiên`
- [x] `t1.2: Tạo src/session/persona.ts, cập nhật src/session/intent-router.ts và src/rag/prompt-builder.ts (giữ tương thích ngược Spec 004/005)`
*👉 Lệnh kiểm tra Lát 1:* `npm test -- specs/015-conversational-agentic-rag/tests/conversational-rag.test.ts`

---

### Lát cắt 2: Topic-Shift Detection & Bảo toàn Ngữ cảnh Đa lượt (`query-condenser.ts`, `session/pipeline.ts`)
*Mục tiêu: Phân biệt chính xác hỏi nối tiếp vs chuyển sang ý khác (ngắn hoặc dài) để không trộn nhầm chủ đề cũ.*
- [x] `t2.1: Viết Unit Test TDD cho Topic Shift ngắn ('Lương thử việc', 'Rút BHXH 1 lần'), câu chuyển ý rõ ràng ('Thôi bỏ qua vụ xe...') và Session-sticky Persona`
- [x] `t2.2: Chuyển src/session/query-condenser.ts sang Pure LLM-only (gỡ bỏ regex hardcode & isDependentQuery) và kết nối persona vào src/session/pipeline.ts`
*👉 Lệnh kiểm tra Lát 2:* `npm test -- specs/015-conversational-agentic-rag/tests/conversational-rag.test.ts`

---

### Lát cắt 3: Hermes-style Agentic Query Rewrite Retry & Direct Clarification (`civic-law-agent.ts`, `rag/pipeline.ts`)
*Mục tiêu: Khi vòng 1 tìm dưới ngưỡng vì ngôn ngữ đời thường, Agent tự dùng LLM viết lại từ khóa pháp lý và tìm lại vòng 2; hỗ trợ điều hướng khi user muốn tìm ý khác.*
- [x] `t3.1: Viết Unit Test TDD cho vòng 2 Query Rewrite Retry (vòng 1 miss -> LLM rewrite -> vòng 2 hit grounded), direct_clarification khi xin đổi chủ đề mở, và bảo toàn CitationVerifier`
- [x] `t3.2: Nâng cấp src/agent/civic-law-agent.ts, src/agent/types.ts, src/rag/types.ts, src/rag/pipeline.ts và config-loader (tùy chọn chat_persona)`
*👉 Lệnh kiểm tra Lát 3:* `npm test -- specs/015-conversational-agentic-rag/tests/conversational-rag.test.ts`

---

### Lát cắt 4: Kiểm chứng Toàn bộ & Chạy thử trên Gateway Thực tế
*Mục tiêu: Đảm bảo 0 regression toàn repo, build sạch và kiểm thử hội thoại đa lượt thực tế qua `/api/v1/chat`.*
- [x] `t4.1: Chạy npm run build, npx --prefix admin tsc --noEmit, và full npm test`
- [x] `t4.2: Restart Gateway và kiểm tra luồng hội thoại đa lượt (Chào Em-Anh -> Hỏi Giao thông đời thường -> Đổi ý sang Lao động) qua POST /api/v1/chat`
- [x] `t4.3: Kích hoạt Code Review Gate (/code-review)`
*👉 Lệnh kiểm tra Lát 4:* `npm run build && npm test && npx --prefix admin tsc --noEmit`

---

## 🛡️ Chốt chặn Thẩm định (Code Review Gate)
- [x] Không hardcode secrets, credentials, hoặc phá vỡ chốt chặn CitationVerifier / Confidence Gate.
- [x] Tương thích 100% các bộ test cũ (Spec 004, 005, 012, 013, 014).
- [x] Reviewer xác nhận: **PASS**.
