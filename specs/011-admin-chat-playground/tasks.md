# Bước 4: Danh Sách Công Việc Theo Lát Cắt Dọc (Vertical Slicing) — Admin Chatbot Playground

> **Nguyên tắc SDD:** Mỗi lát cắt đi xuyên từ Input -> Logic -> Output và bắt buộc có lệnh kiểm thử độc lập. Chỉ tick `[x]` khi test pass 100% và không vi phạm quy chuẩn Ponytail / Anti-Hardcode.

---

### Lát 1: Tầng Giao Tiếp API & Bộ Kiểm Thử Core (API Service & Unit Tests)
- [x] **T1.1:** Định nghĩa TypeScript interfaces (`ChatApiRequest`, `ChatApiResponse`, `ChatCitation`, `ChatPlaygroundMessage`) trong `admin/lib/api-client.ts`.
- [x] **T1.2:** Triển khai hàm `sendChatMessage(request)` và `streamChatMessage(request, onToken, ...)` trong `admin/lib/api-client.ts` sử dụng `httpClient` (hỗ trợ cả REST và SSE Streaming).
- [x] **T1.3:** Viết bộ kiểm thử `specs/011-admin-chat-playground/tests/chat-playground.test.ts` kiểm chứng:
  * Gửi câu hỏi thành công nhận đủ `answer`, `citations`, `isGrounded: true`.
  * Xử lý ngoại lệ an toàn khi Gateway trả về 400 hoặc 500.
  * Tùy biến `sessionId`, `domain` và `confidenceThreshold` không bị hardcode.
* **Lệnh kiểm chứng Lát 1:** `npx vitest run specs/011-admin-chat-playground/tests/chat-playground.test.ts`

---

### Lát 2: Giao Diện Chatbot Playground & Trạng Thái Thinking (UI/UX Playground)
- [x] **T2.1:** Khởi tạo trang `admin/app/chat/page.tsx` với chuẩn Astryx Design System và font chữ `Inter`.
- [x] **T2.2:** Xây dựng thanh công cụ điều khiển trên cùng (Inspector Header): Domain Filter, Confidence Threshold Slider, Nút "Tạo phiên mới" (Reset Conversation).
- [x] **T2.3:** Xây dựng thanh Quick Presets cho 5 bộ luật: Giao thông, Lao động, BHXH, Nhà ở, Dân sự.
- [x] **T2.4:** Xây dựng khung hiển thị tin nhắn (Chat Message Feed):
  * Bong bóng người dùng (User Bubble - Deep Indigo `#2563EB`).
  * Bong bóng trợ lý AI (Assistant Bubble - Dark Surface `#131B2E` kèm viền Emerald).
  * Chỉ báo trạng thái "Bot đang suy nghĩ" (Thinking / Reasoning Pulse Indicator đa tầng).
  * Hiệu ứng sinh câu trả lời mượt mà (Streaming Token / Typing Animation).
  * Thẻ căn cứ trích dẫn nguồn luật (Citations Card) có nút sao chép trích dẫn.
- [x] **T2.5:** Xây dựng thanh nhập liệu đáy (Bottom Input Area) hỗ trợ phím Enter để gửi và Shift+Enter để xuống dòng.
* **Lệnh kiểm chứng Lát 2:** `npm --prefix admin run build`

---

### Lát 3: Tích Hợp Điều Hướng Sidebar & Kiểm Thử E2E Playwright
- [x] **T3.1:** Bổ sung mục điều hướng `🤖 Trợ lý Hỏi đáp (Playground)` tại route `/chat` vào Sidebar trong `admin/components/AdminShell.tsx`.
- [x] **T3.2:** Khởi tạo kịch bản kiểm thử E2E Playwright `scripts/test-chat-playwright.mjs`:
  * Mở trình duyệt Chrome truy cập `/chat`.
  * Nhấp vào câu hỏi mẫu Preset hoặc nhập câu hỏi thực tế.
  * Kiểm chứng xuất hiện trạng thái Thinking Pulse.
  * Kiểm chứng hiển thị câu trả lời có trích dẫn điều luật và huy hiệu `✓ 100% Grounded`.
  * Bấm nút "Tạo phiên mới" kiểm chứng reset lịch sử chat thành công.
- [x] **T3.3:** Chạy toàn bộ test suites (`npm test`) và chụp ảnh kiểm chứng thực tế.
* **Lệnh kiểm chứng Lát 3:** `node scripts/test-chat-playwright.mjs && npm test` (ALL GREEN)
