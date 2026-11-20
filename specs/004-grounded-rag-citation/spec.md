# SPEC-004: Grounded Legal RAG Pipeline & Strict Citation (Luồng Hỏi Đáp Pháp Luật Dẫn Chứng 100% Nguồn Luật & Chống Ảo Giác)

## BƯỚC 1: PRODUCT REVIEW (Đặc tả Sản phẩm)

### 1.1. Vấn đề (Problem Statement)
Sau khi hoàn thành 3 module nền tảng (`specs/001`, `specs/002`, `specs/003`), CivicLaw AI đã có kho dữ liệu 4.715 điều luật sạch lưu trên Supabase Cloud và bộ máy tìm kiếm hybrid (Full-Text Search + pgvector HNSW). Tuy nhiên:
1. **Người dùng không muốn đọc văn bản thô:** Công dân khi đặt câu hỏi (ví dụ: *"Tôi lỡ vượt đèn vàng thì bị phạt bao nhiêu tiền và có bị trừ điểm bằng lái không?"*) cần một câu trả lời tổng hợp dễ hiểu, có phân tích hành vi cụ thể, chứ không phải một danh sách các đoạn trích dẫn luật thô cứng.
2. **Nguy cơ ảo giác chí mạng của LLM (LLM Hallucination):**
   - Các mô hình ngôn ngữ lớn (Gemini, GPT) thường có xu hướng "tự tin bịa đặt" số tiền phạt, tự sáng tác điều khoản, hoặc nhầm lẫn giữa văn bản cũ đã hết hiệu lực (Nghị định 100/2019) với quy định mới nhất có hiệu lực từ 2025 (Nghị định 168/2024 và Luật TTATGTĐB 2024).
   - Trong lĩnh vực pháp lý, **ảo giác thông tin là điều tối kỵ** vì có thể dẫn đến hậu quả pháp lý nghiêm trọng cho công dân.
3. **Thiếu cơ chế kiểm chứng trích dẫn chéo (Post-Generation Verification):** Ngay cả khi đã cung cấp context cho LLM, mô hình vẫn có thể suy diễn và trích dẫn những điều luật không hề có trong ngữ cảnh đã cấp ("Trích dẫn ma").
4. **Lãng phí chi phí token khi không có căn cứ:** Nếu câu hỏi nằm ngoài kho luật hiện có mà vẫn gọi LLM để sinh câu trả lời thì vừa tốn kém quota API, vừa tăng nguy cơ LLM trả lời bừa.

### 1.2. Hành vi Mong muốn (Desired Behavior)
1. **Trả lời Dẫn chứng 100% Nguồn Luật (100% Grounded Answer):**
   - Mọi kết luận tư vấn pháp luật bắt buộc phải trích dẫn đích danh: `[Điểm... Khoản... Điều... Số hiệu văn bản quy phạm pháp luật...]`.
   - Cung cấp danh mục nguồn tham khảo minh bạch ở cuối câu trả lời.
2. **Cơ chế Chặn Ảo Giác 3 Lớp (Triple-Layer Anti-Hallucination Guard):**
   - **Lớp 1 (Pre-LLM Confidence Gate):** Nếu điểm tìm kiếm của kho luật `topScore < 0.65`, hệ thống lập tức từ chối trả lời một cách trung thực ("Honest Fallback Guard"), ghi nhận câu hỏi vào bảng `unresolved_queries`, **tuyệt đối không gọi LLM để tiết kiệm chi phí và chống suy diễn**.
   - **Lớp 2 (Strict Grounding Prompt):** System Prompt được thiết kế nghiêm ngặt: Yêu cầu LLM chỉ được phép trả lời dựa trên thông tin có trong ngữ cảnh được cung cấp; cấm sử dụng kiến thức ngoài để khẳng định.
   - **Lớp 3 (Post-LLM Citation Verification):** Bộ kiểm chứng tự động quét toàn bộ các trích dẫn trong câu trả lời của LLM và đối chiếu với danh sách chunks đã cấp. Nếu phát hiện trích dẫn không có nguồn trong context, hệ thống gắn cờ cảnh báo hoặc hiệu chỉnh lại.
3. **Kiến trúc LLM Provider Trừu tượng (Abstract LLM Provider):**
   - Hỗ trợ kết nối Gemini API (Google GenAI) qua biến môi trường `GEMINI_API_KEY`.
   - Cung cấp `MockLlmProvider` phục vụ kiểm thử Unit/BDD 100% offline, chạy siêu tốc mà không tốn token hay phụ thuộc kết nối internet.
4. **Định dạng Câu trả lời Chuẩn hóa (Structured Output):**
   - Câu trả lời có cấu trúc rõ ràng:
     1. **Kết luận nhanh (Executive Summary):** Có vi phạm không? Khung phạt bao nhiêu?
     2. **Phân tích chi tiết (Detailed Analysis):** Hành vi, đối tượng, hình thức phạt bổ sung (trừ điểm GPLX).
     3. **Căn cứ pháp lý trích dẫn (Legal Citations):** Trích dẫn nguyên văn điều luật tương ứng.

### 1.3. Mock-up Giao diện Hội thoại (User - Assistant Dialogue)

#### Trường hợp 1: Có căn cứ pháp lý trong kho luật (Confidence >= 0.65)
```text
[Người dùng]: Tôi đi xe máy lỡ vượt đèn vàng thì bị phạt bao nhiêu tiền và có bị trừ điểm bằng lái xe không?

[Trợ lý CivicLaw AI]:
📌 KẾT LUẬN NHANH:
Hành vi điều khiển xe mô tô, xe gắn máy không chấp hành hiệu lệnh của đèn tín hiệu giao thông (bao gồm cả vượt đèn vàng khi không thuộc trường hợp được phép đi tiếp) bị phạt tiền từ 400.000 đồng đến 600.000 đồng và bị TRỪ 02 ĐIỂM giấy phép lái xe.

⚖️ PHÂN TÍCH CHI TIẾT:
1. Mức phạt tiền: Người điều khiển xe mô tô, xe gắn máy không chấp hành hiệu lệnh của đèn tín hiệu giao thông sẽ bị phạt tiền từ 400.000 đồng đến 600.000 đồng.
2. Trừ điểm giấy phép lái xe: Thực hiện hành vi vi phạm này còn bị áp dụng hình thức trừ 02 điểm giấy phép lái xe.

📚 CĂN CỨ PHÁP LÝ CHÍNH THỨC:
1. Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP (Xử phạt vi phạm giao thông đường bộ và trừ điểm GPLX)
2. Điểm a Khoản 1 Điều 47 Luật Trật tự, an toàn giao thông đường bộ 2024
```

#### Trường hợp 2: Không có căn cứ trong kho luật (Honest Fallback Guard)
```text
[Người dùng]: Mức phạt khi nuôi động vật ngoại lai nguy hiểm tại nhà riêng năm 2026 là bao nhiêu?

[Trợ lý CivicLaw AI]:
⚠️ THÔNG BÁO VỀ CĂN CỨ PHÁP LÝ:
Hiện tại CivicLaw AI chưa có dữ liệu chính thức về mức xử phạt đối với hành vi "nuôi động vật ngoại lai nguy hiểm tại nhà riêng" trong 5 bộ luật cốt lõi hiện có.

Để bảo đảm tính chính xác tuyệt đối và tránh cung cấp thông tin sai lệch, hệ thống đã ghi nhận câu hỏi của Bạn vào Hàng đợi tri thức để Quản trị viên cập nhật văn bản quy phạm pháp luật tương ứng.
```

---

### 1.4. Tiêu chí Nghiệm thu BDD (Given - When - Then)

#### Kịch bản 1: Hỏi đáp thành công có trích dẫn nguồn luật chính xác (Happy Path)
- **Given:** Người dùng hỏi câu hỏi về vi phạm giao thông có trong kho luật (ví dụ: *"vượt đèn đỏ xe máy"*).
- **When:** RAG Pipeline thực hiện tìm kiếm context và gửi prompt tới LLM Provider.
- **Then:** Câu trả lời trả về có điểm tin cậy `>= 0.65`, chứa trích dẫn chính xác Điều 6 Nghị định 168/2024/NĐ-CP và không bị từ chối.

#### Kịch bản 2: Kích hoạt Honest Fallback Guard khi thiếu căn cứ
- **Given:** Người dùng hỏi câu hỏi không có trong kho luật hoặc câu hỏi rác (ví dụ: *"cách làm bánh bao ngon"*).
- **When:** RAG Pipeline tìm kiếm và thấy `topScore < 0.65`.
- **Then:** Hệ thống **KHÔNG GỌI LLM**, lập tức trả lời thông báo từ chối trung thực, và tự động gọi `recordQuery()` ghi nhận vào bảng `unresolved_queries`.

#### Kịch bản 3: Chốt chặn phát hiện và ngăn ngừa trích dẫn ma (Citation Verification)
- **Given:** LLM Provider sinh ra câu trả lời chứa một trích dẫn không có trong danh sách context chunks đã cấp (ví dụ bịa ra "Điều 999 Nghị định 999").
- **When:** Bộ `CitationVerifier` quét qua câu trả lời.
- **Then:** Hệ thống phát hiện trích dẫn không hợp lệ, gắn cờ `hasUnverifiedCitations = true` và loại bỏ trích dẫn ma khỏi danh mục căn cứ pháp lý tin cậy.

#### Kịch bản 4: Chạy kiểm thử độc lập 100% Offline với Mock LLM Provider
- **Given:** Máy không có kết nối internet hoặc không cấu hình `GEMINI_API_KEY`.
- **When:** Bộ test BDD chạy với `MockLlmProvider`.
- **Then:** Toàn bộ test suite vượt qua với tốc độ dưới 50ms, không phụ thuộc mạng, không tốn quota API.

#### Kịch bản 5: Tự động trích xuất nguyên văn từ CSDL khi LLM gặp sự cố (Extractive Grounded Fallback)
- **Given:** CSDL đã tìm thấy căn cứ pháp lý (`topScore >= 0.65`), nhưng LLM Provider gặp sự cố (HTTP 429 Quota Exceeded, 503 Quá tải, hoặc mất kết nối mạng).
- **When:** RAG Pipeline phát hiện ngoại lệ từ LLM.
- **Then:** Hệ thống không bị crash, tự động chuyển sang chế độ suy giảm mềm dẻo (`degradedMode = true`), trả về thông báo chuyển đổi và trích xuất nguyên văn các điều luật tìm thấy từ CSDL kèm `isGrounded = true` và danh mục trích dẫn đã được kiểm chứng.
