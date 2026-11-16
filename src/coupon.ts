/**
 * Định nghĩa các loại hình mã giảm giá hỗ trợ
 * - percentage: Giảm theo tỷ lệ %
 * - fixed: Giảm theo số tiền cố định (VND)
 */
export type CouponType = 'percentage' | 'fixed';

/**
 * Interface cấu trúc dữ liệu của Coupon
 */
export interface Coupon {
  code: string;
  type: CouponType;
  value: number; // Ví dụ: 10 nghĩa là 10% nếu type='percentage', hoặc 50,000 VND nếu type='fixed'
  minOrderValue?: number; // Giá trị đơn hàng tối thiểu cần đạt
  maxDiscountAmount?: number; // Mức trần giảm giá tối đa (dành cho percentage)
  expiresAt?: Date; // Hạn sử dụng của mã
}

/**
 * Interface đại diện cho giỏ hàng
 */
export interface Cart {
  subtotal: number; // Tổng giá trị các mặt hàng trước khi tính chiết khấu
}

/**
 * Kết quả sau khi áp dụng coupon
 */
export interface CouponCalculationResult {
  originalSubtotal: number; // Giá trị gốc của giỏ hàng
  discountAmount: number;   // Số tiền thực tế được giảm
  finalTotal: number;       // Số tiền cuối cùng khách phải thanh toán
  appliedCouponCode: string;// Mã coupon đã áp dụng thành công
}

/**
 * Lỗi phát sinh khi coupon đã hết hạn sử dụng
 */
export class CouponExpiredError extends Error {
  constructor(message = 'Mã giảm giá đã hết hạn sử dụng') {
    super(message);
    this.name = 'CouponExpiredError';
  }
}

/**
 * Lỗi phát sinh khi giỏ hàng chưa đạt giá trị tối thiểu
 */
export class MinimumOrderNotMetError extends Error {
  constructor(message = 'Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã') {
    super(message);
    this.name = 'MinimumOrderNotMetError';
  }
}

/**
 * Hàm thuần khiết (Pure Function) tính toán áp dụng coupon vào giỏ hàng
 * 
 * @param cart Giỏ hàng của người dùng
 * @param coupon Mã giảm giá cần áp dụng
 * @param currentTime Thời điểm hiện tại (mặc định lấy thời gian hệ thống, hỗ trợ inject để test)
 * @returns CouponCalculationResult Kết quả tính toán chi tiết
 */
export function applyCoupon(
  cart: Cart,
  coupon: Coupon,
  currentTime: Date = new Date()
): CouponCalculationResult {
  // 1. Kiểm tra hạn sử dụng (Edge case: Mã đã hết hạn)
  if (coupon.expiresAt && currentTime.getTime() > coupon.expiresAt.getTime()) {
    throw new CouponExpiredError(`Mã giảm giá ${coupon.code} đã hết hạn vào ${coupon.expiresAt.toISOString()}`);
  }

  // 2. Kiểm tra điều kiện đơn hàng tối thiểu
  if (coupon.minOrderValue && cart.subtotal < coupon.minOrderValue) {
    throw new MinimumOrderNotMetError(
      `Đơn hàng cần đạt tối thiểu ${coupon.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã này.`
    );
  }

  // 3. Tính toán số tiền giảm danh định theo loại coupon
  let nominalDiscount = 0;
  if (coupon.type === 'percentage') {
    nominalDiscount = cart.subtotal * (coupon.value / 100);

    // Nếu có mức giảm trần tối đa (cap)
    if (coupon.maxDiscountAmount && nominalDiscount > coupon.maxDiscountAmount) {
      nominalDiscount = coupon.maxDiscountAmount;
    }
  } else if (coupon.type === 'fixed') {
    nominalDiscount = coupon.value;
  }

  // 4. Nguyên tắc chống âm tiền: Số tiền giảm tối đa chỉ bằng giá trị giỏ hàng
  const actualDiscount = Math.min(nominalDiscount, cart.subtotal);

  // 5. Tính tổng tiền thanh toán sau giảm
  const finalTotal = cart.subtotal - actualDiscount;

  return {
    originalSubtotal: cart.subtotal,
    discountAmount: actualDiscount,
    finalTotal,
    appliedCouponCode: coupon.code,
  };
}
