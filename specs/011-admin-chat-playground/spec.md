# Bước 1: Product Review — Sân Thử Nghiệm Hỏi Đáp Pháp Lý AI (Admin Chatbot Playground)

## 1. Vấn đề (Problem Statement)
- **Đối tượng gặp vấn đề:** Quản trị viên hệ thống, Chuyên viên pháp lý và Thẩm định viên kiểm toán AI.
- **Nỗi đau thực tế (Pain Point):**
  - Hiện tại, Web Admin chỉ có màn hình xem lại lịch sử phiên cũ (`/sessions`), nhưng **chưa có công cụ trực quan để thử nghiệm trực tiếp (Playground / Interactive Testbed)** xem Chatbot phản hồi thế nào trong thời gian thực.
  - Quản trị viên không thể nhập câu hỏi mới, không thấy được trạng thái "Bot đang suy nghĩ" (Thinking / Reasoning State), không kiểm soát được quá trình sinh từ ngữ (Streaming generation), và không test nhanh được phản xạ của AI với 5 bộ luật chính thống.
- **Hậu quả nếu không làm:**
  - Chuyên viên pháp lý không thể thẩm định nhanh chất lượng của AI trước khi phát hành ra môi trường cho công dân.
  - Khó phát hiện các trường hợp câu hỏi ngoài phạm vi hoặc câu hỏi thiếu dữ liệu dẫn đến khoảng trống tri thức.

---

## 2. Hành vi mong muốn (Desired Behavior)
1. **Giao diện Chatbot Tương tác Trực quan (Interactive Chatbot UI):**
   - Bố cục phong cách Enterprise Chatbot (tương tự Claude, ChatGPT, Gemini, Retool AI) với nền tối luxury `#090D16`, bề mặt card `#131B2E`.
   - Vùng hiển thị tin nhắn dạng cuộn mượt (Auto-scroll), phân định rõ bong bóng Người dùng (User Bubble - Deep Indigo) và Trợ lý AI (Assistant Bubble - Neutral Dark kèm viền xanh Emerald).
2. **Hiệu ứng "Bot Đang Suy Nghĩ" (Thinking / Reasoning Pulse):**
   - Khi người dùng gửi câu hỏi, hiển thị chỉ báo trạng thái suy nghĩ đa tầng:
     * `Đang phân tích & tái tạo ngữ cảnh câu hỏi...`
     * `Đang đối soát kho dữ liệu 4.715 chunks trên pgvector...`
     * `Đang tổng hợp câu trả lời & xác thực trích dẫn...`
   - Hiệu ứng nhấp nháy tinh tế (Pulsing micro-dot) tạo cảm giác AI đang suy luận chủ động.
3. **Sinh Câu Trả Lời Thời Gian Thực (Token Generation / Typing Animation):**
   - Câu trả lời được hiển thị dần theo từng cụm từ (streaming token) mượt mà, không bị khựng hoặc giật trang.
4. **Huy hiệu Độ Chuẩn Xác & Căn Cứ Trích Dẫn (Grounded Citations Drawer):**
   - Mỗi câu trả lời của AI đều gắn nhãn `✓ 100% Grounded` (xác nhận trích dẫn chính xác nguồn luật).
   - Danh sách thẻ căn cứ pháp lý đính kèm ngay dưới câu trả lời (gồm Số hiệu văn bản, Điều, Khoản, Điểm, và toàn văn trích dẫn).
5. **Bộ Preset Câu Hỏi Thử Nghiệm Nhanh (Quick Presets):**
   - Cung cấp các câu hỏi mẫu điển hình thuộc 5 lĩnh vực: Giao thông, Lao động, BHXH, Nhà ở, Dân sự để quản trị viên bấm thử trong 1 click.
6. **Bộ Điều Khiển Tham Số Kiểm Thử (Playground Inspector Controls):**
   - Lựa chọn Lĩnh vực trọng tâm (Domain Selector: Tất cả, Giao thông, Lao động, BHXH, Nhà ở, Dân sự).
   - Thanh trượt Ngưỡng tin cậy (Confidence Threshold: 0.60 - 0.95).
   - Nút "Tạo Phiên Mới" (Reset Conversation) để xóa sạch ngữ cảnh và thử nghiệm phiên độc lập.

---

## 3. Bản dựng Giao diện / Luồng tương tác (Mock-up)

```text
+-------------------------------------------------------------------------------------------------------+
| 🏛️ CivicLaw AI [v1.0] | CỔNG QUẢN TRỊ NỘI BỘ  |  CivicLaw AI / Trợ Lý Hỏi Đáp (Playground)             |
+-------------------------------------------------------------------------------------------------------+
|  SIDEBAR           |  SÂN THỬ NGHIỆM HỎI ĐÁP PHÁP LÝ AI (CHATBOT PLAYGROUND)           [Tạo Phiên Mới] |
|                    |  Thử nghiệm trực quan luồng suy luận, sinh phản hồi và trích dẫn 5 bộ luật.      |
|  ⚡ Gateway        +-----------------------------------------------------------------------------------+
|  💬 Kiểm toán      |  Lĩnh vực: [ Tất cả (5 Bộ luật) ▾ ]  |  Ngưỡng tin cậy: [===●===] 0.85  | Uptime: 99.9% |
|  📚 Kho Luật       +-----------------------------------------------------------------------------------+
|  ⚠️ Khoảng trống   |  PRESETS: [🚦 Vượt đèn đỏ xe máy] [💼 Thử việc 90 ngày] [🏠 Đặt cọc thuê nhà]    |
|  ⚖️ Hợp đồng       +-----------------------------------------------------------------------------------+
|  🤖 Trợ lý Chat *  |                                                                                   |
|  ⚙️ Cấu hình       |  [User] 14:20:15                                                                  |
|                    |  Vượt đèn đỏ xe máy bị xử phạt bao nhiêu tiền theo quy định mới nhất?             |
|                    |                                                                                   |
|                    |  [CivicLaw Assistant] 14:20:18  [✓ 100% Grounded] [Độ tự tin: 95%]               |
|                    |  Theo quy định tại Nghị định 168/2024/NĐ-CP, người điều khiển xe mô tô, xe gắn   |
|                    |  máy thực hiện hành vi không chấp hành hiệu lệnh của đèn tín hiệu giao thông      |
|                    |  (vượt đèn đỏ) sẽ bị xử phạt tiền từ 400.000 đồng đến 600.000 đồng...             |
|                    |                                                                                   |
|                    |  ┌─ CĂN CỨ PHÁP LUẬT ĐỐI SOÁT (1 nguồn chính thống) ───────────────────────────┐  |
|                    |  │ 📜 Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP [Đã kiểm chứng ✓]         │  |
|                    |  └─────────────────────────────────────────────────────────────────────────────┘  |
|                    |                                                                                   |
|                    |  [User] 14:21:02                                                                  |
|                    |  Thế nếu là xe ô tô thì mức phạt như thế nào?                                     |
|                    |                                                                                   |
|                    |  [CivicLaw Assistant]                                                             |
|                    |  ● Đang suy nghĩ: Phân tích ngữ cảnh liên kết câu hỏi trước ("vượt đèn đỏ ô tô")… |
|                    |                                                                                   |
|                    +-----------------------------------------------------------------------------------+
|                    | [ Nhập câu hỏi pháp lý để thử nghiệm phản xạ của AI... (Enter để gửi)      ] [Gửi]|
+--------------------+-----------------------------------------------------------------------------------+
```

---

## 4. Làm rõ & Giả định (Clarify)
- [x] **Q1: Giao diện Chat này kết nối vào Gateway nào?**
  - *Trả lời:* Kết nối trực tiếp vào Central API Gateway (`http://localhost:3001` hoặc proxy `/api/gateway/chat`) thông qua `api-client.ts` đã được chuẩn hóa `httpClient`.
- [x] **Q2: Cơ chế suy nghĩ và sinh câu trả lời hoạt động như thế nào?**
  - *Trả lời:* Sử dụng trạng thái `thinking` kèm thông báo phân tích ngữ cảnh (Context Condensing), sau đó sinh câu trả lời theo thời gian thực (hỗ trợ stream từng token hoặc mô phỏng typing animation mượt mà khi nhận response đầy đủ từ Gateway).
- [x] **Q3: Có lưu lịch sử hội thoại nhiều lượt (Multi-turn Context) không?**
  - *Trả lời:* Có. Sử dụng `sessionId` xuyên suốt trong một phiên làm việc để kiểm tra khả năng tái tạo câu hỏi độc lập (Query Condenser) của AI. Khi bấm "Tạo phiên mới", `sessionId` sẽ được sinh mới (UUID).

---

## 5. Tiêu chí Nghiệm thu (Acceptance Criteria / BDD)

### Kịch bản 1: Gửi câu hỏi thành công & Hiển thị Thinking -> Câu trả lời Grounded (Happy Path)
* **Given (Cho trước):** Quản trị viên đang ở màn hình `/chat` với phiên làm việc mới.
* **When (Khi):** Nhập câu hỏi "Vượt đèn đỏ xe máy phạt bao nhiêu?" và nhấn Enter hoặc nút "Gửi".
* **Then (Thì):**
  1. Tin nhắn của User hiển thị ngay lập tức ở phía bên phải.
  2. Tin nhắn của Bot hiển thị trạng thái "Đang suy nghĩ..." với thanh tiến trình vi mô.
  3. Khi nhận được phản hồi từ Gateway, bot hiển thị nội dung câu trả lời chuẩn xác.
  4. Hiển thị huy hiệu `✓ 100% Grounded` và danh sách căn cứ trích dẫn (Nghị định 168/2024/NĐ-CP).

### Kịch bản 2: Bấm chọn câu hỏi mẫu (Quick Presets)
* **Given (Cho trước):** Người dùng đang ở màn hình Chat Playground.
* **When (Khi):** Người dùng nhấp vào một thẻ Preset mẫu (ví dụ: `[💼 Thử việc 90 ngày]`).
* **Then (Thì):** Hệ thống tự động điền câu hỏi vào ô nhập liệu và gửi ngay lập tức, chuyển trạng thái sang `thinking` và nhận phản hồi.

### Kịch bản 3: Xử lý ngoại lệ khi Gateway ngoại tuyến hoặc lỗi mạng (Resilience Fallback)
* **Given (Cho trước):** Gateway bị gián đoạn kết nối hoặc trả về lỗi 500.
* **When (Khi):** Người dùng gửi câu hỏi.
* **Then (Thì):** Giao diện hiển thị thông báo lỗi rõ ràng bên trong bong bóng bot hoặc banner cảnh báo mà không làm sập trang (no page crash), cho phép bấm nút "Thử lại".

### Kịch bản 4: Tạo phiên mới (Reset Session)
* **Given (Cho trước):** Phiên chat hiện tại đã có 2 tin nhắn hỏi đáp qua lại.
* **When (Khi):** Người dùng nhấp vào nút "Tạo phiên mới".
* **Then (Thì):** Toàn bộ lịch sử tin nhắn trong khung chat được làm mới về trạng thái ban đầu kèm lời chào mặc định, và một `sessionId` mới được khởi tạo.
