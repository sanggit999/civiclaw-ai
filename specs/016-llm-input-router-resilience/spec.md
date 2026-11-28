# Bước 1: Product Review — Single-Pass LLM Input Router & Maintenance Resilience (`016-llm-input-router-resilience`)

## 1. Vấn đề (Problem Statement)
- **Đối tượng gặp vấn đề:** Công dân chat tự do (tiếng Việt không dấu, viết tắt, tiếng lóng) và người vận hành khi dùng Free Quota API Key hoặc khi gặp sự cố mạng/server.
- **Nỗi đau thực tế (Pain Point):**
  1. Nếu chỉ dùng regex ở cửa vào (`IntentRouter`, `QueryCondenser`, `Persona`), các câu chat không dấu/viết tắt như `"em chao a"`, `"hom qua quen doi non ko biet phat bn"`, `"thoi ko hoi xe nua qua thu viec di"` vẫn có thể lọt hoặc tốn tới 2 lượt tìm kiếm + 2–3 lượt gọi LLM.
  2. Khi dùng **Gemini Free Quota API Key** (chưa nạp credit) rất dễ chạm ngưỡng `429 Rate Limit / Resource Exhausted`, hoặc khi server Gateway/mạng sập thì giao diện `/chat` hiển thị thông báo lỗi kỹ thuật thô thay vì màn hình bảo trì thân thiện.
- **Hậu quả nếu không làm:** Trải nghiệm không tự nhiên với câu không dấu/teencode; và khi hết quota miễn phí hoặc mất mạng, người dùng gặp lỗi khó hiểu hoặc hệ thống bị gián đoạn.

## 2. Hành vi mong muốn (Desired Behavior)
1. **Single-Pass LLM Input Router đứng ngay đầu luồng xử lý (`ContextualRagPipeline`):**
   - Fast-path `< 1ms` chỉ giữ cho vài câu chào/cảm ơn siêu ngắn phổ biến (kể cả không dấu như `"hi"`, `"hello"`, `"cam on"`, `"ok"`) để tiết kiệm quota miễn phí.
   - Mọi input tự nhiên khác đi qua **1 lần gọi LLM nhẹ** (`gemini-3.5-flash-lite`) để đồng thời:
     - Phân loại ý định (`GREETING`, `THANKS`, `BOT_IDENTITY`, `TOPIC_SWITCH_OPEN`, `OUT_OF_SCOPE`, `LEGAL_QUERY`).
     - Nhận diện xưng hô tự nhiên (`Anh – em`, `Em – anh`, ...).
     - Phát hiện `Topic Shift` vs `Follow-up`, **khôi phục dấu tiếng Việt**, lược bỏ từ thừa, và viết lại `standaloneQuery` bằng thuật ngữ chuẩn luật ngay trước Vòng 1 tìm kiếm.
     - Tuyệt đối không cho Input Router tự bịa câu trả lời pháp lý; mọi `LEGAL_QUERY` vẫn bắt buộc đi qua `GroundedRagPipeline` + `CitationVerifier`.
2. **Phòng vệ 3 cấp khi Hết Free Quota (`429`), Mất mạng hoặc Server sập:**
   - **Cấp 1 (Model Failover cho Free Quota):** Khi gặp `429` (hoặc `503`/`404`), `GeminiLlmProvider` tự động thử chuyển sang `fallbackModel` (tận dụng bucket quota riêng của model phụ).
   - **Cấp 2 (Graceful Degradation khi LLM hết sạch quota):**
     - `InputRouter` tự rơi về bộ Fast Rule (đã bổ sung `removeVietnameseDiacritics()` để hiểu được câu xã giao không dấu), còn `RuleAndLlmQueryCondenser` giữ nguyên câu gốc an toàn (`isCondensed: false`) thay vì đoán regex.
     - `GroundedRagPipeline` kích hoạt **Extractive Grounded Fallback** trích xuất nguyên văn điều luật từ kho 4.715 chunks cục bộ (vẫn trả được căn cứ đúng cho người dùng mà 0% bịa đặt).
   - **Cấp 3 (Maintenance UX khi Server sập / Mất mạng hoàn toàn):**
     - Khi backend gặp lỗi nghiêm trọng hoặc `/chat` trên trình duyệt mất kết nối tới Gateway (`ECONNREFUSED`, timeout, HTTP 5xx), hiển thị thống nhất thông điệp **`🔧 THÔNG BÁO VẬN HÀNH HỆ THỐNG`** (*Hệ thống đang bảo trì / tạm gián đoạn kết nối, vui lòng thử lại sau ít phút*).

## 3. Tiêu chí Nghiệm thu (Acceptance Criteria / BDD)

### Kịch bản 1: LLM Input Router xử lý trọn gói câu không dấu, teencode, xưng hô & Topic Shift trong 1 lượt
* **Given:** `SinglePassLlmInputRouter` được cấu hình với `ILlmProvider` và gắn vào `ContextualRagPipeline`.
* **When:** Người dùng gửi câu không dấu/viết tắt (*"hom qua em di xe may ko doi mu bh bi thoi phat bn a"*) hoặc câu đổi ý không dấu (*"thoi bo qua vu xe qua hoi thu viec di a"*).
* **Then:** Router trả về cấu trúc JSON hợp lệ với `standaloneQuery` tiếng Việt có dấu chuẩn luật, đúng `persona` (`Anh – em`), đúng cờ `isTopicShift`, và `usedLlm: true`.

### Kịch bản 2: Fallback an toàn khi Free Quota API hết (`429`) hoặc LLM trả JSON lỗi
* **Given:** `ILlmProvider` ném lỗi `Gemini API Error (429): Resource has been exhausted` hoặc trả chuỗi không phải JSON.
* **When:** `SinglePassLlmInputRouter` hoặc `GeminiLlmProvider` thực thi.
* **Then:** `GeminiLlmProvider` thử `fallbackModel` khi gặp `429`; nếu vẫn lỗi, `InputRouter` rơi êm về Fast Rule hỗ trợ không dấu (`"em chao anh"` -> chào theo vai `Anh – em`) với `usedLlm: false` và `RuleAndLlmQueryCondenser` giữ nguyên truy vấn gốc an toàn (`isCondensed: false`), không làm sập phiên chat.

### Kịch bản 3: Thông điệp Bảo trì chuẩn khi Mất mạng / Server sập
* **Given:** Gateway (`:3001`) dừng hoạt động hoặc mất kết nối mạng từ UI `/chat` (`admin/app/chat/page.tsx`).
* **When:** Người dùng gửi tin nhắn từ giao diện `/chat`.
* **Then:** Giao diện hiển thị thông báo bảo trì thân thiện (`THÔNG BÁO VẬN HÀNH HỆ THỐNG`), không hiển thị lỗi stacktrace kỹ thuật thô.
