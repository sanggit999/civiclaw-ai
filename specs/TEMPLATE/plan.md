# Kế hoạch Kỹ thuật: [Tên tính năng]

## 1. Thế nào (Mục tiêu kiến trúc & Giải pháp)
- Tóm tắt cách tiếp cận kỹ thuật để hiện thực hóa các yêu cầu trong `spec.md`.

## 2. Mô hình Dữ liệu & Interfaces (Types)
```typescript
// Định nghĩa interface, input/output
```

## 3. Luồng xử lý (Data Flow / Algorithm)
1. Nhận input và validate cơ bản.
2. Kiểm tra điều kiện áp dụng trong database / memory.
3. Tính toán kết quả theo công thức đã xác định trong `spec.md`.
4. Trả về kết quả hoặc ném lỗi có cấu trúc.

## 4. Xử lý Lỗi & Edge Cases
- Lỗi mã không tồn tại -> `COUPON_NOT_FOUND`
- Lỗi mã hết hạn -> `COUPON_EXPIRED`
- Lỗi đơn hàng chưa đạt giá trị tối thiểu -> `MINIMUM_ORDER_NOT_MET`
