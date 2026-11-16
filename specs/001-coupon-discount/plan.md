# Kế hoạch Kỹ thuật: Hệ thống Áp dụng Coupon (Coupon Engine)

## 1. Thế nào (Mục tiêu kiến trúc & Giải pháp)
Xây dựng một pure function (hàm thuần khiết) `applyCoupon(cart, coupon, currentTime)`:
- Tính độc lập: Không phụ thuộc trực tiếp vào DB, dễ dàng unit test với tốc độ mili-giây.
- Phù hợp nguyên tắc Deterministic: Cho phép truyền `currentTime` từ ngoài vào để test chính xác các trường hợp hết hạn mà không cần mock đồng hồ hệ thống.

## 2. Mô hình Dữ liệu (Interfaces / Types)
```typescript
export type CouponType = 'percentage' | 'fixed';

export interface Coupon {
  code: string;
  type: CouponType;
  value: number; // Tỷ lệ % (1-100) hoặc số tiền cố định (>= 0)
  minOrderValue?: number;
  maxDiscountAmount?: number; // Mức trần giảm giá cho loại percentage
  expiresAt?: Date;
}

export interface Cart {
  subtotal: number; // Tổng giá trị hàng trước giảm
}

export interface CouponCalculationResult {
  originalSubtotal: number;
  discountAmount: number;
  finalTotal: number;
  appliedCouponCode: string;
}
```

## 3. Luồng xử lý thuật toán (Algorithm Flow)
1. **Kiểm tra Hạn sử dụng:** Nếu `coupon.expiresAt` tồn tại và `currentTime > coupon.expiresAt` -> Ném `CouponExpiredError`.
2. **Kiểm tra Đơn tối thiểu:** Nếu `cart.subtotal < (coupon.minOrderValue || 0)` -> Ném `MinimumOrderNotMetError`.
3. **Tính Discount Amount:**
   - Nếu `percentage`: `discount = cart.subtotal * (coupon.value / 100)`. Nếu có `maxDiscountAmount`, lấy `Math.min(discount, maxDiscountAmount)`.
   - Nếu `fixed`: `discount = coupon.value`.
4. **Chống âm tiền:** `actualDiscount = Math.min(discount, cart.subtotal)`.
5. **Tính Final Total:** `finalTotal = cart.subtotal - actualDiscount`.
6. Trả về object `CouponCalculationResult`.
