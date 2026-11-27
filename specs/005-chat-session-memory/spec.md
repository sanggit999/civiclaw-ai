# BƯỚC 1: PRODUCT REVIEW — QUẢN LÝ PHIÊN HỘI THOẠI & BỘ NHỚ NGỮ CẢNH HỎI ĐÁP PHÁP LÝ NHIỀU LƯỢT (MULTI-TURN LEGAL DIALOGUE)

## 1. Vấn đề (Problem Statement)
- **Đối tượng gặp vấn đề:** Công dân tra cứu pháp luật thường xuyên và Quản trị viên hệ thống.
- **Nỗi đau thực tế (Pain Point):**
  - Hiện tại ở `specs/004`, `GroundedRagPipeline` chỉ xử lý từng câu hỏi độc lập (Single-turn Stateless QA).
  - Trong thực tế tư vấn pháp luật, người dân luôn hỏi tiếp nối dạng hội thoại tự nhiên với đại từ thay thế hoặc tỉnh lược chủ ngữ:
    - *Lượt 1:* "Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?" -> Trả lời: Phạt 400.000 - 600.000đ.
    - *Lượt 2:* "Thế còn ô tô thì sao?" (Thiếu hoàn toàn hành vi "vượt đèn đỏ").
    - *Lượt 3:* "Lỗi đó có bị trừ điểm bằng lái không?" (Thiếu chủ ngữ, dùng đại từ "lỗi đó").
  - Nếu không có bộ nhớ ngữ cảnh và cơ chế tái tạo câu hỏi (Query Rewriting / Condensation), bộ máy tìm kiếm ở Lớp 1 sẽ nhận câu hỏi trơ trọi *"Thế còn ô tô thì sao?"*. Do thiếu từ khóa hành vi, điểm tương đồng sẽ rất thấp (`topScore < 0.65`), dẫn đến hệ thống từ chối trả lời dù trong luật có quy định rõ ràng!
  - Ngoài ra, người dùng không thể lưu lại lịch sử tư vấn, không có mã định danh phiên (`sessionId`) để tiếp tục cuộc trò chuyện sau đó.
- **Hậu quả nếu không làm:** Trải nghiệm người dùng bị đứt gãy nghiêm trọng; trợ lý AI bị coi là "ngô nghê, mau quên"; người dân phải gõ đi gõ lại toàn bộ câu hỏi dài dòng.

---

## 2. Hành vi Mong muốn (Desired Behavior)
1. **Quản lý Phiên hội thoại (`sessionId`):**
   - Hệ thống hỗ trợ tạo phiên mới, ghi nhận tin nhắn hai chiều (User - Assistant) kèm siêu dữ liệu trích dẫn pháp lý (`citations`) và trạng thái căn cứ (`isGrounded`).
2. **Tái tạo Câu hỏi theo Ngữ cảnh (Contextual Query Condensation / Rewriter):**
   - Khi nhận câu hỏi tiếp nối trong phiên, hệ thống kết hợp lịch sử gần nhất để tự động "làm rõ" câu hỏi thành dạng độc lập (Standalone Query) trước khi gửi vào RAG Search:
     - *"Thế còn ô tô thì sao?"* -> *"Hành vi vượt đèn đỏ đối với xe ô tô bị xử phạt bao nhiêu tiền?"*.
   - Nếu câu hỏi mới hoàn toàn chuyển chủ đề (ví dụ: *"Thời gian hưởng chế độ thai sản là bao lâu?"*), hệ thống giữ nguyên câu hỏi, không ép dính ngữ cảnh cũ.
3. **Cửa sổ Ngữ cảnh Trượt (Sliding Window Context):**
   - Duy trì `N` lượt trao đổi gần nhất (mặc định: 6 tin nhắn = 3 lượt hỏi đáp) để kiểm soát ngân sách token, tránh tràn context window của LLM và giảm chi phí API.
4. **Kiến trúc Kép (Hybrid Persistence & In-Memory):**
   - Hỗ trợ lưu trữ bền vững trên PostgreSQL Supabase (`chat_sessions`, `chat_messages`) với RLS.
   - Hỗ trợ `InMemorySessionStore` phục vụ kiểm thử offline siêu tốc và môi trường không có internet.

---

## 3. Bản Dựng Giao Diện & Luồng Tương Tác (Mock-up)

```text
+---------------------------------------------------------------------------------------------------+
| CIVICLAW AI - PHIÊN TƯ VẤN PHÁP LUẬT [Session: #c4a8...29f]                                      |
+---------------------------------------------------------------------------------------------------+
| 👤 Công dân (Lượt 1):                                                                             |
| "Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?"                                                      |
|                                                                                                   |
| 🤖 CivicLaw AI:                                                                                   |
| 📌 KẾT LUẬN NHANH: Phạt tiền từ 400.000 đồng đến 600.000 đồng.                                    |
| ⚖️ PHÂN TÍCH CHI TIẾT: Áp dụng đối với người điều khiển xe mô tô, xe gắn máy...                    |
| 📚 CĂN CỨ PHÁP LÝ: Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP.                               |
+---------------------------------------------------------------------------------------------------+
| 👤 Công dân (Lượt 2):                                                                             |
| "Thế còn ô tô thì sao?"                                                                           |
|                                                                                                   |
| ⚙️ [Hệ thống tự động tái tạo truy vấn]:                                                            |
| -> "Hành vi vượt đèn đỏ đối với xe ô tô bị xử phạt bao nhiêu tiền?"                               |
|                                                                                                   |
| 🤖 CivicLaw AI:                                                                                   |
| 📌 KẾT LUẬN NHANH: Phạt tiền từ 4.000.000 đồng đến 6.000.000 đồng và bị trừ điểm GPLX.            |
| ⚖️ PHÂN TÍCH CHI TIẾT: Người điều khiển xe ô tô không chấp hành đèn tín hiệu giao thông...         |
| 📚 CĂN CỨ PHÁP LÝ: Điểm a Khoản 5 Điều 6 Nghị định 168/2024/NĐ-CP.                               |
+---------------------------------------------------------------------------------------------------+
| 👤 Công dân (Lượt 3):                                                                             |
| "Lỗi đó có bị trừ điểm bằng lái không?"                                                           |
|                                                                                                   |
| ⚙️ [Hệ thống tự động tái tạo truy vấn]:                                                            |
| -> "Lỗi vượt đèn đỏ xe ô tô có bị trừ điểm giấy phép lái xe không?"                               |
|                                                                                                   |
| 🤖 CivicLaw AI:                                                                                   |
| 📌 KẾT LUẬN NHANH: Có, hành vi này bị trừ 02 điểm giấy phép lái xe theo quy định.                 |
| 📚 CĂN CỨ PHÁP LÝ: Điểm b Khoản 1 Điều 1 và Điều 6 Nghị định 168/2024/NĐ-CP.                      |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Làm Rõ & Ràng Buộc Nghiệp Vụ (Clarify - Cấm Đoán Mò)

- [x] **Q1: Tái tạo câu hỏi (Query Rewriting) có làm tăng độ trễ (latency) và chi phí token không?**
  - *Trả lời (Cập nhật Spec 016 — Pure LLM-only):* Bỏ qua bước gọi LLM ở lượt đầu tiên (`history.length === 0`). Từ lượt 2 trở đi khi có lịch sử, giao hoàn toàn cho LLM tái tạo ngữ cảnh (hoặc nhận diện Topic Shift giữ nguyên câu mới) mà không dùng regex heuristic cứng để tránh lỗi false-positive tiếng Việt. Khi mất LLM / hết quota `429`, giữ nguyên câu hỏi gốc an toàn.
- [x] **Q2: Cơ sở dữ liệu Supabase cần lưu những bảng nào?**
  - *Trả lời:*
    - Bảng `public.chat_sessions`: `id (uuid)`, `user_id (uuid, nullable)`, `title (text)`, `created_at`, `updated_at`.
    - Bảng `public.chat_messages`: `id (uuid)`, `session_id (uuid, fk)`, `role (text: user | assistant | system)`, `content (text)`, `standalone_query (text, nullable)`, `citations (jsonb)`, `is_grounded (boolean)`, `created_at`.
- [x] **Q3: Cơ chế bảo mật và phân quyền (RLS)?**
  - *Trả lời:* Tuân thủ `supabase-postgres-best-practices`. Bật Row Level Security (RLS) trên cả 2 bảng. Cho phép người dùng vô danh (anonymous) thao tác với session của chính họ qua cookie/header session token, hoặc liên kết với `auth.uid()` khi người dùng đăng nhập.

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria / BDD Scenarios)

### Kịch bản 1: Hỏi đáp tiếp nối tỉnh lược chủ ngữ thành công (Happy Path)
- **Given:** Người dùng đã có lịch sử hỏi về "Vượt đèn đỏ xe máy" trong phiên `session-123`.
- **When:** Người dùng gửi câu hỏi tiếp nối: *"Thế còn ô tô thì sao?"*.
- **Then:** Hệ thống tự động làm rõ câu hỏi thành *"Hành vi vượt đèn đỏ đối với xe ô tô bị xử phạt bao nhiêu tiền?"*, truy xuất đúng Điều 6 Nghị định 168/2024/NĐ-CP và trả lời chính xác mức phạt 4.000.000 - 6.000.000đ.

### Kịch bản 2: Tự động phát hiện chuyển đổi chủ đề (Topic Shift)
- **Given:** Người dùng đang hỏi dở về lĩnh vực Giao thông trong phiên.
- **When:** Người dùng đột ngột hỏi: *"Thời gian nghỉ thai sản của lao động nữ sinh một con là mấy tháng?"*.
- **Then:** Bộ Query Rewriter nhận diện câu hỏi đã độc lập và đầy đủ ý nghĩa, không ghép các từ khóa giao thông vào câu hỏi mới, truy xuất chính xác Bộ luật Lao động và Luật BHXH.

### Kịch bản 3: Giữ vững Cửa sổ Ngữ cảnh Trượt (Sliding Window Context)
- **Given:** Phiên hội thoại đã có 10 tin nhắn (vượt quá giới hạn cấu hình `maxHistoryTurns = 6`).
- **When:** Người dùng gửi câu hỏi tiếp theo.
- **Then:** Hệ thống chỉ nạp 6 tin nhắn gần nhất vào ngữ cảnh tái tạo, cắt tỉa các tin nhắn cũ để không gây tràn token và bảo đảm tốc độ xử lý.

### Kịch bản 4: Vận hành Offline 100% với InMemorySessionStore & Mock LLM
- **Given:** Môi trường kiểm thử không có mạng và không có Database Supabase kết nối trực tiếp.
- **When:** Chạy toàn bộ test suite của `specs/005`.
- **Then:** Hệ thống vận hành hoàn hảo với `InMemorySessionStore`, toàn bộ test pass trong thời gian dưới 100ms.

### Kịch bản 5: Chống Hardcode (Anti-Hardcode & Config Options)
- **Given:** Khởi tạo session pipeline với cấu hình tùy biến (`maxHistoryTurns: 4`, `sessionTtlMs: 3600000`).
- **When:** Hệ thống thực thi quản lý phiên.
- **Then:** Pipeline tuân thủ chính xác các tham số tùy biến thay vì dùng số ma thuật cố định trong mã nguồn.
