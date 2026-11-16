import { describe, it, expect } from 'vitest';
import { applyCoupon, Coupon, Cart, CouponExpiredError } from '../../../src/coupon';

describe('001 - Tính năng Áp dụng Mã Giảm Giá (Coupon Engine)', () => {
  // Mock thời gian cố định để test deterministic
  const NOW = new Date('2026-11-15T12:00:00Z');

  describe('Kịch bản 1: Áp dụng mã giảm theo phần trăm (-10%)', () => {
    it('Given giỏ hàng 300,000đ, When nhập mã -10%, Then giảm 30,000đ và còn 270,000đ', () => {
      // Given: Giỏ hàng 300,000đ và mã giảm giá 10%
      const cart: Cart = { subtotal: 300_000 };
      const coupon: Coupon = {
        code: 'SALE10',
        type: 'percentage',
        value: 10,
      };

      // When: Khách hàng áp dụng mã
      const result = applyCoupon(cart, coupon, NOW);

      // Then: Giảm 30,000đ, thanh toán còn 270,000đ
      expect(result.discountAmount).toBe(30_000);
      expect(result.finalTotal).toBe(270_000);
      expect(result.originalSubtotal).toBe(300_000);
    });
  });

  describe('Kịch bản 2: Áp dụng mã giảm tiền cố định (50,000đ)', () => {
    it('Given giỏ hàng 300,000đ, When nhập mã 50,000đ, Then thanh toán còn 250,000đ', () => {
      // Given: Giỏ hàng 300,000đ và mã giảm cố định 50,000đ
      const cart: Cart = { subtotal: 300_000 };
      const coupon: Coupon = {
        code: 'FIXED50K',
        type: 'fixed',
        value: 50_000,
      };

      // When: Áp dụng mã
      const result = applyCoupon(cart, coupon, NOW);

      // Then: Giảm đúng 50,000đ, còn 250,000đ
      expect(result.discountAmount).toBe(50_000);
      expect(result.finalTotal).toBe(250_000);
    });
  });

  describe('Kịch bản 3: Giảm giá vượt quá giá trị giỏ hàng (Không âm tiền)', () => {
    it('Given giỏ hàng 40,000đ, When nhập mã 50,000đ, Then giảm tối đa 40,000đ và tổng thanh toán là 0đ', () => {
      // Given: Giỏ hàng chỉ có 40,000đ
      const cart: Cart = { subtotal: 40_000 };
      const coupon: Coupon = {
        code: 'FIXED50K',
        type: 'fixed',
        value: 50_000,
      };

      // When: Áp dụng mã
      const result = applyCoupon(cart, coupon, NOW);

      // Then: Giảm tối đa bằng giá trị giỏ, không bị âm
      expect(result.discountAmount).toBe(40_000);
      expect(result.finalTotal).toBe(0);
    });
  });

  describe('Kịch bản 4: Mã giảm giá đã hết hạn', () => {
    it('Given mã có hạn trong quá khứ, When áp dụng, Then ném lỗi CouponExpiredError', () => {
      // Given: Mã đã hết hạn lúc 10:00 (trước thời điểm NOW = 12:00)
      const cart: Cart = { subtotal: 300_000 };
      const coupon: Coupon = {
        code: 'EXPIRED10',
        type: 'percentage',
        value: 10,
        expiresAt: new Date('2026-11-15T10:00:00Z'),
      };

      // When & Then: Phải ném lỗi CouponExpiredError
      expect(() => applyCoupon(cart, coupon, NOW)).toThrow(CouponExpiredError);
    });
  });
});
