import { describe, it, expect } from 'vitest';
import { StatutoryLimitChecker } from '../../../src/contract/statutory-limit-checker.js';
import { MandatoryClauseChecker } from '../../../src/contract/mandatory-clause-checker.js';
import { ContractClause } from '../../../src/contract/types.js';

describe('StatutoryLimitChecker (Lát 2: Kiểm tra Ngưỡng Giới hạn Luật định)', () => {
  it('phát hiện thử việc 120 ngày (4 tháng) là TRÁI LUẬT (RED_ILLEGAL)', () => {
    const text = 'Thời gian thử việc là 120 ngày kể từ ngày người lao động nhận việc.';
    const result = StatutoryLimitChecker.checkLaborProbation(text);

    expect(result.isViolation).toBe(true);
    expect(result.riskLevel).toBe('RED_ILLEGAL');
    expect(result.statutoryCitation).toContain('Điều 25 Bộ luật Lao động 2019');
    expect(result.reason).toContain('tối đa không quá 60 ngày');
    expect(result.suggestedWording).toContain('60 ngày');
  });

  it('xác nhận thử việc 30 ngày hoặc 60 ngày là AN TOÀN (GREEN_SAFE)', () => {
    const text = 'Thời gian thử việc là 30 ngày đối với vị trí chuyên viên.';
    const result = StatutoryLimitChecker.checkLaborProbation(text);

    expect(result.isViolation).toBe(false);
    expect(result.riskLevel).toBe('GREEN_SAFE');
  });

  it('phát hiện lãi suất vay 25%/năm là TRÁI LUẬT (RED_ILLEGAL)', () => {
    const text = 'Bên vay chịu mức lãi suất 25%/năm tính trên dư nợ gốc.';
    const result = StatutoryLimitChecker.checkCivilLoanInterest(text);

    expect(result.isViolation).toBe(true);
    expect(result.riskLevel).toBe('RED_ILLEGAL');
    expect(result.statutoryCitation).toContain('Điều 468 Bộ luật Dân sự 2015');
    expect(result.reason).toContain('không được vượt quá 20%/năm');
  });

  it('phát hiện lãi suất tính theo tháng vượt trần (3%/tháng = 36%/năm)', () => {
    const text = 'Mức lãi suất là 3%/tháng trả vào ngày 15 hàng tháng.';
    const result = StatutoryLimitChecker.checkCivilLoanInterest(text);

    expect(result.isViolation).toBe(true);
    expect(result.riskLevel).toBe('RED_ILLEGAL');
  });

  it('phát hiện phạt nghỉ việc dù báo trước là TRÁI LUẬT', () => {
    const text = 'Nếu người lao động nghỉ việc trước hạn hợp đồng phải bồi thường 06 tháng tiền lương.';
    const result = StatutoryLimitChecker.checkAdvanceNotice(text);

    expect(result.isViolation).toBe(true);
    expect(result.riskLevel).toBe('RED_ILLEGAL');
    expect(result.statutoryCitation).toContain('Điều 35');
  });

  it('Hồi quy Ca Biên C1: không bắt nhầm thời hạn hợp đồng 12 tháng thành thử việc (False Positive Guard)', () => {
    const text = 'Sau thời gian thử việc đạt yêu cầu, hai bên ký hợp đồng lao động chính thức thời hạn 12 tháng.';
    const result = StatutoryLimitChecker.checkLaborProbation(text);

    expect(result.isViolation).toBe(false);
    expect(result.riskLevel).toBe('GREEN_SAFE');
  });

  it('Hồi quy Ca Biên C1: bắt chính xác thử việc 120 ngày khi xuất hiện sau thời hạn báo trước (False Negative Guard)', () => {
    const text = 'Thời hạn báo trước là 15 ngày. Thời gian thử việc là 120 ngày kể từ ngày nhận việc.';
    const result = StatutoryLimitChecker.checkLaborProbation(text);

    expect(result.isViolation).toBe(true);
    expect(result.riskLevel).toBe('RED_ILLEGAL');
  });

  it('Hồi quy Ca Biên C1: không bắt nhầm tỷ lệ tạm ứng 30% thành lãi suất vay (False Positive Guard)', () => {
    const text = 'Bên vay thanh toán tạm ứng 30% giá trị hợp đồng khi ký kết.';
    const result = StatutoryLimitChecker.checkCivilLoanInterest(text);

    expect(result.isViolation).toBe(false);
    expect(result.riskLevel).toBe('GREEN_SAFE');
  });

  it('Hồi quy Ca Biên C1: nhận diện chính xác lãi suất vay 25%/năm khi đứng sau đặt cọc 10%', () => {
    const text = 'Khoản đặt cọc bằng 10% giá trị. Lãi suất vay là 25%/năm tính trên dư nợ gốc.';
    const result = StatutoryLimitChecker.checkCivilLoanInterest(text);

    expect(result.isViolation).toBe(true);
    expect(result.riskLevel).toBe('RED_ILLEGAL');
  });

  it('Hồi quy Ca Biên I3: bồi thường tương ứng tiền lương những ngày không báo trước là HỢP PHÁP (Điều 40 BLLĐ)', () => {
    const text = 'Trường hợp người lao động đơn phương chấm dứt hợp đồng mà không báo trước thì phải bồi thường cho người sử dụng lao động khoản tiền tương ứng với tiền lương trong những ngày không báo trước.';
    const result = StatutoryLimitChecker.checkAdvanceNotice(text);

    expect(result.isViolation).toBe(false);
    expect(result.riskLevel).toBe('GREEN_SAFE');
  });
});

describe('MandatoryClauseChecker (Lát 2: Kiểm tra Điều khoản Bắt buộc Bị Bỏ Sót)', () => {
  it('phát hiện hợp đồng lao động thiếu Bảo hiểm xã hội và An toàn vệ sinh lao động', () => {
    const clauses: ContractClause[] = [
      { id: 'dieu-1', title: 'Điều 1: Công việc', text: 'Lập trình viên', category: 'GENERAL', orderIndex: 0 },
      { id: 'dieu-2', title: 'Điều 2: Tiền lương', text: 'Lương 20 triệu/tháng', category: 'COMPENSATION_SALARY', orderIndex: 1 },
      { id: 'dieu-3', title: 'Điều 3: Thời giờ làm việc', text: '8h/ngày', category: 'WORKING_HOURS', orderIndex: 2 },
    ];

    const missing = MandatoryClauseChecker.checkMissingClauses(clauses, 'labor');
    expect(missing.length).toBeGreaterThanOrEqual(1);

    const hasSocialInsurance = missing.some((m) => m.clauseType === 'SOCIAL_INSURANCE');
    expect(hasSocialInsurance).toBe(true);

    const missingItem = missing.find((m) => m.clauseType === 'SOCIAL_INSURANCE');
    expect(missingItem?.statutoryReference).toContain('Điều 21 Bộ luật Lao động 2019');
    expect(missingItem?.importance).toBe('MANDATORY');
  });

  it('xác nhận không cảnh báo thiếu sót nếu hợp đồng có đầy đủ các mục bắt buộc', () => {
    const fullClauses: ContractClause[] = [
      { id: 'dieu-1', title: 'Điều 1: Công việc', text: 'Lập trình viên', category: 'GENERAL', orderIndex: 0 },
      { id: 'dieu-2', title: 'Điều 2: Tiền lương', text: 'Lương 20 triệu/tháng', category: 'COMPENSATION_SALARY', orderIndex: 1 },
      { id: 'dieu-3', title: 'Điều 3: Thời giờ làm việc', text: '8h/ngày', category: 'WORKING_HOURS', orderIndex: 2 },
      { id: 'dieu-4', title: 'Điều 4: Bảo hiểm xã hội', text: 'Đóng đầy đủ BHXH, BHYT theo luật', category: 'SOCIAL_INSURANCE', orderIndex: 3 },
      { id: 'dieu-5', title: 'Điều 5: An toàn lao động', text: 'Trang bị bảo hộ theo quy chuẩn', category: 'LABOR_SAFETY', orderIndex: 4 },
    ];

    const missing = MandatoryClauseChecker.checkMissingClauses(fullClauses, 'labor');
    expect(missing).toHaveLength(0);
  });
});
