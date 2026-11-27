# Bước 4: Chia Lát Dọc (Vertical Slicing Tasks) — Spec 016

---

### Lát cắt 1: Chuẩn hóa Không dấu cho Fallback Rules (`persona.ts`, `intent-router.ts`, `query-condenser.ts`)
- [x] `t1.1: Viết Unit Test TDD cho chào hỏi/xưng hô/Topic Shift không dấu ('em chao anh', 'cam on chi', 'the con o to', 'thoi bo qua vu xe')`
- [x] `t1.2: Bổ sung removeVietnameseDiacritics() vào persona.ts, intent-router.ts, query-condenser.ts (giữ nguyên toàn bộ behavior có dấu cũ & chặn false-positive)`
*👉 Lệnh kiểm tra Lát 1:* `npm test -- specs/016-llm-input-router-resilience/tests/input-router-resilience.test.ts`

---

### Lát cắt 2: `SinglePassLlmInputRouter` & Tích hợp vào `ContextualRagPipeline`
- [x] `t2.1: Viết Unit Test TDD cho SinglePassLlmInputRouter (JSON valid không dấu/teencode, ultra-fast path 'hi', parse fallback khi LLM trả rác hoặc lỗi 429) và luồng ContextualRagPipeline`
- [x] `t2.2: Tạo src/session/input-router.ts, cập nhật src/session/types.ts, src/session/pipeline.ts và scripts/start-gateway.mjs`
*👉 Lệnh kiểm tra Lát 2:* `npm test -- specs/016-llm-input-router-resilience/tests/input-router-resilience.test.ts`

---

### Lát cắt 3: Free-Quota `429` Failover & Maintenance UX trên `/chat`
- [x] `t3.1: Viết Unit Test TDD kiểm chứng GeminiLlmProvider failover trên 429, Extractive Fallback khi cả 2 model hết quota & Maintenance UX`
- [x] `t3.2: Cập nhật src/rag/gemini-llm-provider.ts (thêm 429 failover) và admin/app/chat/page.tsx + admin/lib/api-client.ts (hiển thị Maintenance Notice khi mất mạng / sập server)`
*👉 Lệnh kiểm tra Lát 3:* `npm run build && npm test && npx --prefix admin tsc --noEmit`

---

### Lát cắt 4: Kiểm chứng Toàn bộ & Code Review Gate
- [x] `t4.1: Kiểm tra thực tế Gateway (:3001) với câu tiếng Việt không dấu/teencode và test luồng fallback`
- [x] `t4.2: Kích hoạt Code Review Gate (/code-review) và đạt PASS`
