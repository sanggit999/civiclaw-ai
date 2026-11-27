# Bước 1: Product Review — Conversational Agentic RAG (`015-conversational-agentic-rag`)

## 1. Vấn đề (Problem Statement)
- **Đối tượng gặp vấn đề:** Công dân sử dụng màn hình `/chat` và Quản trị viên kiểm thử trợ lý pháp lý.
- **Nỗi đau thực tế (Pain Point):**
  1. **Giọng điệu hành chính, cứng nhắc:** `PromptBuilder` và `IntentRouter` cố định xưng hô `"Tôi – Bạn"` và ép mọi câu trả lời vào đúng 3 đầu mục khuôn mẫu, thiếu tự nhiên khi người dân chat đời thường (*"Anh ơi cho em hỏi..."*).
  2. **Nhầm lẫn khi chuyển sang ý khác (Topic Shift):** Logic tách ngữ cảnh bằng heuristic tĩnh dễ trộn ngữ cảnh cũ vào chủ đề mới (*"lương thử việc"* bị dính *"vượt đèn đỏ"*), cần giao toàn quyền hiểu ngữ cảnh và tách Topic Shift cho LLM (`Pure LLM-only` như ChatGPT/Hermes).
  3. **Chưa tự viết lại từ khóa nhiều vòng kiểu Hermes Agent:** Khi công dân dùng ngôn ngữ đời thường lệch thuật ngữ luật (*"quên đội nón"* thay vì *"đội mũ bảo hiểm"*), `CivicLawAgent` chỉ gọi `search_legal_code` đúng 1 lần rồi fallback thay vì tự rút trích thuật ngữ chuẩn luật để thử lại vòng 2.
- **Hậu quả nếu không làm:** Trải nghiệm `/chat` kém tự nhiên so với ChatGPT, hay mất mạch hội thoại khi người dùng đổi ý, và tỷ lệ rơi vào fallback cao đối với câu kể chuyện đời thường.

## 2. Hành vi mong muốn (Desired Behavior)
1. **Xưng hô tự nhiên & bám phiên (Dynamic Pronoun Mirroring):**
   - Tự động bắt cặp đại từ tiếng Việt theo người dùng (*Em – Anh*, *Em – Chị*, *Anh/Chị – Em*, *Cháu – Chú/Cô*; mặc định lịch sự *Mình – Bạn* hoặc cấu hình động) ở cả câu chào hỏi (`IntentRouter`) lẫn câu trả lời pháp lý (`PromptBuilder`), đồng thời giữ mạch xưng hô xuyên suốt phiên chat.
2. **Hiểu nối tiếp & Nhận biết đổi ý (Topic-Shift Detection):**
   - Nhận biết rõ câu hỏi nối tiếp (*"Thế còn ô tô?"*, *"Lỗi đó..."*) so với câu chuyển ý mới (*"Lương thử việc"*, *"Thôi bỏ qua vụ xe, cho em hỏi về BHXH"*), tuyệt đối không làm rò rỉ ngữ cảnh cũ sang ý mới.
   - Khi người dùng bày tỏ muốn tìm ý khác một cách mở (*"Em muốn hỏi chủ đề khác"*), điều hướng nhẹ nhàng về các nhóm lĩnh vực pháp luật cốt lõi kèm gợi ý.
3. **Truy xuất Agentic kiểu Hermes (Bounded Query Rewrite Retry):**
   - Nếu vòng tìm kiếm đầu tiên dưới ngưỡng tin cậy (`fallbackTriggered: true`) và có `ILlmProvider`, `CivicLawAgent` dùng LLM viết lại truy vấn sang thuật ngữ quy phạm pháp luật Việt Nam để tìm lại tối đa thêm 1 vòng trước khi kết luận thiếu căn cứ.
4. **An toàn pháp lý tuyệt đối (Non-Negotiable Red Line):**
   - Văn phong tự nhiên như ChatGPT (bỏ khung 3 mục cứng nhắc), có câu gợi ý chuyển ý ở cuối, **nhưng mọi mức phạt, Điều/Khoản luật vẫn bắt buộc trích đích danh `[Điểm... Khoản... Điều... Số hiệu]` và đi qua `CitationVerifier` (100% Grounded, 0% ảo giác)**.

## 3. Bản dựng Hội thoại Mẫu (Mock-up)

```text
Lượt 1 (User): Em chào anh, hôm qua em đi xe máy quên đội nón bị CSGT giữ lại thì phạt sao anh?
Lượt 1 (Bot):  Chào em! Theo quy định hiện hành, hành vi người điều khiển xe mô tô, xe gắn máy không đội mũ bảo hiểm bị phạt tiền từ 400.000 đồng đến 600.000 đồng theo [Điểm h Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP]...
               Nếu em cần xem thêm trường hợp chở người ngồi sau không đội mũ hoặc muốn hỏi sang vấn đề pháp lý khác, cứ nhắn anh nhé!

Lượt 2 (User): À thôi bỏ qua vụ xe, cho em hỏi lương thử việc 60 ngày có hợp lệ không?
Lượt 2 (Bot):  [Topic Shift -> tách sạch ngữ cảnh xe máy, giữ xưng hô Anh - Em]
               Về vấn đề thử việc, Bộ luật Lao động 2019 quy định... [Khoản 2 Điều 25 Bộ luật Lao động 2019].
               Em muốn tìm hiểu thêm về quyền lợi BHXH hay chuyển sang ý khác nữa không?
```

## 4. Làm rõ & Giả định (Clarify — Đã được User xác nhận)
- [x] **Q1 (Xưng hô):** Tự động bắt cặp theo người dùng + dự phòng cấu hình mặc định linh hoạt (VD: khách xưng Em/Anh thì Bot đáp Anh/Em; mặc định thân thiện).
- [x] **Q2 (Định dạng câu trả lời):** Văn phong hội thoại tự nhiên như ChatGPT (bỏ khung 3 mục cứng nhắc), kèm thẻ Căn cứ pháp lý xác thực và gợi ý chuyển ý ở cuối.
- [x] **Q3 (Phạm vi Spec 015):** Làm trọn Spec 015: Topic Shift + Query Rewriting kiểu Hermes (tối đa 2 vòng tìm kiếm trong ReAct) + Xưng hô tự nhiên + giữ nguyên 100% `CitationVerifier`.

## 5. Tiêu chí Nghiệm thu (Acceptance Criteria / BDD)

### Kịch bản 1: Xưng hô tự nhiên theo người dùng & giữ mạch trong phiên (Persona Mirroring)
* **Given:** Người dùng mở phiên chat mới và chào/hỏi có xưng hô rõ ràng (ví dụ `"Em chào anh"`, `"Anh ơi cho em hỏi..."`).
* **When:** Hệ thống xử lý qua `IntentRouter` và `ContextualRagPipeline` -> `PromptBuilder`.
* **Then:** Câu trả lời đáp lại đúng cặp đại từ tương ứng (`Anh – Em`), lưu giữ persona xuyên suốt các lượt kế tiếp trong phiên kể cả khi lượt sau người dùng gõ câu ngắn không nêu lại đại từ.

### Kịch bản 2: Phân biệt Đổi ý (Topic Shift) vs Hỏi nối tiếp (Follow-up)
* **Given:** Lịch sử phiên vừa trao đổi về `"vượt đèn đỏ xe máy"`.
* **When:** Người dùng chuyển sang ý mới bằng câu ngắn (`"Lương thử việc"`) hoặc câu chuyển ý rõ ràng (`"Thôi bỏ qua vụ xe, hỏi về bảo hiểm xã hội"`).
* **Then:** `RuleAndLlmQueryCondenser` trả `isCondensed = false`, tuyệt đối không ghép `"vượt đèn đỏ"` vào câu truy vấn mới; đồng thời vẫn giữ `isCondensed = true` cho các câu nối tiếp thực sự (*"Thế còn ô tô?"*, *"Lỗi đó..."*).

### Kịch bản 3: Agentic Query Rewriting kiểu Hermes khi vòng 1 điểm thấp
* **Given:** `CivicLawAgent` nhận câu nói đời thường lệch từ khóa luật khiến vòng tìm kiếm 1 dưới ngưỡng tin cậy (`fallbackTriggered: true`).
* **When:** `CivicLawAgent.process()` chạy với `ILlmProvider` khả dụng và `maxIterations >= 2`.
* **Then:** Agent tự gọi LLM viết lại truy vấn sang thuật ngữ chuẩn luật và thực hiện vòng tìm kiếm thứ 2; nếu vòng 2 tìm trúng căn cứ, trả kết quả `isGrounded: true` kèm `thoughtTrace` ghi nhận quá trình viết lại truy vấn, không rơi vào fallback oan.

### Kịch bản 4: Giữ nguyên Chốt chặn Kiểm chứng Trích dẫn & Fallback An toàn
* **Given:** Bất kỳ câu trả lời tự nhiên nào sinh ra bởi LLM ở `/chat`.
* **When:** Câu trả lời đi qua `GroundedRagPipeline`.
* **Then:** Vẫn bắt buộc qua `CitationVerifier` (100% trích dẫn đối chiếu được với `contextChunks`); khi LLM lỗi mạng/429 hoặc kho luật không có dữ liệu, vẫn kích hoạt extractive fallback / honest fallback an toàn.
