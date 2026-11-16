# Đặc tả Tính năng: [Tên tính năng]

## 1. Cái gì
- Mô tả ngắn gọn tính năng làm gì dưới góc nhìn người dùng/hệ thống.
- Ví dụ: Người dùng nhập mã coupon tại bước thanh toán để được giảm giá đơn hàng.

## 2. Vì sao
- Lý do kinh doanh/nghiệp vụ hoặc mục tiêu sản phẩm cần giải quyết.
- Ví dụ: Khuyến khích người dùng hoàn tất giỏ hàng dịp cuối tuần, tăng tỷ lệ chuyển đổi đơn hàng (CR).

## 3. Clarify & Giả định (Không đoán mò)
> [!IMPORTANT]
> Mục này bắt buộc phải điền. Nếu chưa có câu trả lời rõ ràng từ người dùng/PO, hãy hỏi ngay thay vì tự ý giả định.

- [x] **Q1:** Mã giảm giá áp dụng trên tổng đơn hay từng sản phẩm?
  - *Trả lời:* Áp dụng trên tổng giá trị giỏ hàng trước phí vận chuyển.
- [x] **Q2:** Có giới hạn số tiền giảm tối đa (cap) không?
  - *Trả lời:* Không giới hạn (hoặc có giới hạn X đồng nếu có quy định).
- [x] **Q3:** Nếu mã giảm giá lớn hơn giá trị giỏ hàng thì tính sao?
  - *Trả lời:* Giỏ hàng giảm tối đa về 0đ, không thể có giá âm.
- [x] **Q4:** Xử lý thế nào khi mã hết hạn hoặc không tồn tại?
  - *Trả lời:* Trả về lỗi rõ ràng và giữ nguyên giá giỏ hàng gốc.

## 4. Tiêu chí nghiệm thu (Acceptance Criteria)

### Kịch bản 1: [Tên kịch bản thành công chính]
* **Given (Cho trước):** [Trạng thái ban đầu của hệ thống]
* **When (Khi):** [Hành động xảy ra]
* **Then (Thì):** [Kết quả kỳ vọng cụ thể đo lường được]

### Kịch bản 2: [Tên kịch bản xử lý ngoại lệ / Edge case]
* **Given (Cho trước):** [Trạng thái ban đầu]
* **When (Khi):** [Nhập mã không hợp lệ / hết hạn]
* **Then (Thì):** [Báo lỗi tương ứng và không thay đổi dữ liệu]
