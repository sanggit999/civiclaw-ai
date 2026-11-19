# Bước 1: Product Review — [Tên tính năng]

## 1. Vấn đề (Problem Statement)
- **Đối tượng gặp vấn đề:** (Người tham gia giao thông / Người lao động / Quản trị viên...)
- **Nỗi đau thực tế (Pain Point):** Hiện tại người dùng gặp rắc rối gì hoặc hệ thống đang thiếu hụt gì?
- **Hậu quả nếu không làm:** (Ví dụ: AI suy diễn sai mức phạt, dữ liệu bị nhiễm độc, người dùng bị phạt oan...)

## 2. Hành vi mong muốn (Desired Behavior)
- Mô tả cách người dùng/hệ thống tương tác sau khi tính năng hoàn thành.
- Kết quả mong đợi cuối cùng mang lại giá trị gì?

## 3. Bản dựng Giao diện / Luồng tương tác (Mock-up)

```text
+-------------------------------------------------------------------+
| CIVICLAW AI - GIAO DIỆN TRUY VẤN / TƯƠNG TÁC                     |
+-------------------------------------------------------------------+
| User: [Nhập câu hỏi hoặc thao tác]                                |
|                                                                   |
| Assistant:                                                        |
| [Nội dung phản hồi có cấu trúc, trích dẫn số hiệu, điều, khoản]   |
| [Nút hành động: Xem văn bản gốc PDF | Gửi góp ý | Báo sai]        |
+-------------------------------------------------------------------+
```

> [!NOTE]
> **Quy định về dữ liệu Mock-up:**
> Dữ liệu hiển thị trong Mock-up là giả lập tạm thời phục vụ đặc tả UX. Tuyệt đối không chuyển dữ liệu mock-up này thành chuỗi/logic fix cứng trong mã nguồn.

## 4. Làm rõ & Giả định (Clarify - Cấm đoán mò)
> [!IMPORTANT]
> Chỉ bắt đầu lập trình khi mọi nghi vấn nghiệp vụ đã được xác nhận.

- [x] **Q1:** [Điểm mơ hồ 1 cần làm rõ]?
  - *Trả lời:* [Câu trả lời chính thức từ PO/Khách hàng]
- [x] **Q2:** [Điểm mơ hồ 2 cần làm rõ]?
  - *Trả lời:* [Câu trả lời chính thức]

## 5. Tiêu chí Nghiệm thu (Acceptance Criteria / BDD)

### Kịch bản 1: [Luồng thành công chính - Happy Path]
* **Given (Cho trước):** [Trạng thái ban đầu của hệ thống]
* **When (Khi):** [Người dùng thực hiện hành động]
* **Then (Thì):** [Kết quả kỳ vọng cụ thể đo lường được]

### Kịch bản 2: [Luồng xử lý ngoại lệ / Ranh giới sự cố]
* **Given (Cho trước):** [Trạng thái ban đầu]
* **When (Khi):** [Dữ liệu thiếu / Lỗi kết nối / Ngoài phạm vi]
* **Then (Thì):** [Phản hồi an toàn, kích hoạt fallback và không làm sập hệ thống]

### Kịch bản 3: [Cấu hình Linh hoạt — Không Hardcode]
* **Given (Cho trước):** Module được khởi tạo với cấu hình tùy biến (custom options/config).
* **When (Khi):** Module thực thi nghiệp vụ.
* **Then (Thì):** Hệ thống tôn trọng cấu hình truyền vào thay vì sử dụng giá trị fix cứng trong mã nguồn.
