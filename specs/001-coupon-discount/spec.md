# Đặc tả Tính năng: Áp dụng Mã Giảm Giá (Coupon Discount)

## 1. Cái gì
Khách hàng nhập mã giảm giá (coupon code) hợp lệ tại bước thanh toán để được giảm giá trên tổng giá trị giỏ hàng (theo phần trăm `%` hoặc số tiền cố định `VND`).

## 2. Vì sao
Thực hiện các chiến dịch marketing (ví dụ: kích cầu mua sắm cuối tuần, tri ân khách hàng thân thiết), giúp tăng tỷ lệ hoàn tất đơn hàng và giảm tỷ lệ bỏ rơi giỏ hàng.

## 3. Clarify & Giả định (Không đoán mò)
> [!IMPORTANT]
> Bước làm rõ trước khi thiết kế giải pháp:

- [x] **Q1: Mã giảm giá áp dụng theo tỷ lệ % hay số tiền cố định?**
  - *Trả lời:* Hỗ trợ cả 2 loại: `percentage` (phần trăm, ví dụ 10%) và `fixed` (số tiền cố định, ví dụ 50,000đ).
- [x] **Q2: Có thể giảm âm giá trị giỏ hàng không?**
  - *Trả lời:* Không. Nếu số tiền giảm lớn hơn tổng giá trị giỏ hàng, tổng tiền sau giảm tối thiểu là `0đ`.
- [x] **Q3: Điều kiện hết hạn xử lý ra sao?**
  - *Trả lời:* Mỗi coupon có trường `expiresAt`. Nếu thời điểm áp dụng sau `expiresAt`, từ chối áp dụng và ném lỗi rõ ràng (`COUPON_EXPIRED`).
- [x] **Q4: Có điều kiện đơn hàng tối thiểu (minOrderValue) không?**
  - *Trả lời:* Có thể tùy chọn cấu hình `minOrderValue`. Nếu giỏ hàng chưa đạt, từ chối áp dụng.

## 4. Tiêu chí nghiệm thu (Acceptance Criteria)

### Kịch bản 1: Áp dụng mã giảm theo phần trăm (-10%)
* **Given (Cho trước):** Giỏ hàng có tổng giá trị là `300,000đ`.
* **When (Khi):** Khách hàng áp dụng mã giảm giá 10%.
* **Then (Thì):** Số tiền được giảm là `30,000đ`, tổng tiền cần thanh toán còn `270,000đ`.

### Kịch bản 2: Áp dụng mã giảm tiền cố định (50,000đ)
* **Given (Cho trước):** Giỏ hàng có tổng giá trị là `300,000đ`.
* **When (Khi):** Khách hàng áp dụng mã giảm `50,000đ`.
* **Then (Thì):** Số tiền được giảm là `50,000đ`, tổng thanh toán còn `250,000đ`.

### Kịch bản 3: Giảm giá vượt quá giá trị giỏ hàng (Không âm tiền)
* **Given (Cho trước):** Giỏ hàng có giá trị là `40,000đ`.
* **When (Khi):** Khách hàng áp dụng mã giảm `50,000đ`.
* **Then (Thì):** Số tiền giảm tối đa là `40,000đ`, tổng thanh toán là `0đ` (không âm).

### Kịch bản 4: Mã giảm giá đã hết hạn
* **Given (Cho trước):** Mã giảm giá có hạn sử dụng trong quá khứ.
* **When (Khi):** Khách hàng áp dụng mã.
* **Then (Thì):** Hệ thống từ chối áp dụng, báo lỗi `"Mã giảm giá đã hết hạn"` và giá giỏ hàng giữ nguyên `300,000đ`.
