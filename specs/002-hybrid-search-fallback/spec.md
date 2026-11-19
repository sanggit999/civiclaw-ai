# Đặc tả Tính năng: 002 - Hybrid Search, Fallback Guard & Knowledge Gap Queue

## 1. Cái gì
- Cung cấp cơ chế **Tìm kiếm điều luật kết hợp (Hybrid Search)** trên kho 4.501 legal chunks đã bóc tách.
- **Bộ lọc Ngưỡng Tin cậy (Confidence Guard / Honest Fallback):** Khi người dùng hỏi một vấn đề không nằm trong 5 bộ luật hiện hành (độ tương đồng < ngưỡng tin cậy), hệ thống lập tức chặn ảo giác, từ chối suy đoán luật mới và trả về thông điệp trung thực minh bạch.
- **Hàng đợi Khoảng trống Tri thức (Knowledge Gap Queue):** Tự động ghi nhận câu hỏi chưa có lời giải vào danh sách `unresolved_queries` (lưu query, số lần lặp lại `hit_count`, lĩnh vực dự đoán) để phục vụ chuyên viên quản trị trên Web Admin rà soát và bổ sung văn bản luật trong tương lai.

## 2. Vì sao
- **Ngăn ngừa Nhiễm độc Dữ liệu (Prevent Data Poisoning):** Trong pháp luật, việc LLM tự bịa ra điều luật hoặc mức phạt không có thật là vi phạm nguyên tắc cốt lõi ("100% trích dẫn nguồn luật chính thống").
- **Tối ưu hóa Lộ trình Dữ liệu (Data-Driven Law Ingestion):** Thay vì suy đoán người dân cần luật gì, hàng đợi khoảng trống tri thức sẽ chỉ ra chính xác các văn bản luật nào đang được hỏi nhiều nhất mà hệ thống chưa có.

## 3. Clarify & Giả định (Đã làm rõ)
- [x] **Q1: Khi câu hỏi không có căn cứ pháp lý trong 5 bộ luật, hệ thống có cho phép LLM tự sinh câu trả lời để nạp vào DB không?**
  - *Trả lời:* Tuyệt đối KHÔNG. AI không có thẩm quyền lập pháp. Mọi dữ liệu nạp vào DB phải xuất phát từ văn bản luật gốc có mộc đỏ hoặc được Admin phê duyệt (Human-in-the-Loop).
- [x] **Q2: Ngưỡng tin cậy (Confidence Threshold) để kích hoạt Fallback là bao nhiêu?**
  - *Trả lời:* Mặc định là `0.65` (trên thang 0.0 - 1.0). Nếu điểm tìm kiếm cao nhất < 0.65 hoặc không có từ khóa pháp lý khớp, kích hoạt Fallback Guard.
- [x] **Q3: Cơ chế chống trùng lặp trong Knowledge Gap Queue hoạt động thế nào?**
  - *Trả lời:* Nếu người dùng hỏi câu hỏi có ý nghĩa tương tự hoặc từ khóa tương đương, tăng `hit_count += 1` thay vì tạo hàng loạt bản ghi trùng rác.

## 4. Tiêu chí Nghiệm thu (Acceptance Criteria)

### Kịch bản 1: Tìm kiếm chính xác có trích dẫn điều luật (Search Success)
* **Given (Cho trước):** Kho dữ liệu đã nạp 1.051 chunks của Nghị định 168/2024/NĐ-CP.
* **When (Khi):** Người dùng hỏi *"Lỗi chuyển làn đường không có tín hiệu phạt bao nhiêu tiền?"*.
* **Then (Thì):** Hệ thống trả về chunk có `fullReference = "Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP"`, điểm tin cậy >= 0.65, kèm nội dung mức phạt 600.000đ - 800.000đ. Không ghi vào `unresolved_queries`.

### Kịch bản 2: Kích hoạt Fallback Guard khi hỏi ngoài phạm vi (Honest Fallback)
* **Given (Cho trước):** Hệ thống chỉ có 5 bộ luật (Giao thông, Lao động, BHXH, Nhà ở).
* **When (Khi):** Người dùng hỏi câu hỏi ngoài phạm vi như: *"Quy định về thuế thu nhập cá nhân khi trúng xổ số kiến thiết"*.
* **Then (Thì):** 
  - Điểm tin cậy < 0.65 (không có chunk khớp).
  - Trả về thông báo thành thật: `"Hệ thống chưa tìm thấy căn cứ pháp lý trong 5 bộ luật hiện hành... Câu hỏi đã được ghi nhận."`
  - Tự động ghi 1 bản ghi mới vào `unresolved_queries` với trạng thái `'unreviewed'`.

### Kịch bản 3: Tăng lượt đếm (Hit Count) khi nhiều người cùng hỏi câu hỏi thiếu
* **Given (Cho trước):** Bảng `unresolved_queries` đã có bản ghi về *"thuế thu nhập cá nhân"*.
* **When (Khi):** Một người dùng khác tiếp tục hỏi *"cách tính thuế thu nhập cá nhân 2026"*.
* **Then (Thì):** Hệ thống tìm thấy khoảng trống tương đương, tăng `hit_count` lên 2 mà không tạo bản ghi trùng lặp.
