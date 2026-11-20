import { describe, it, expect } from 'vitest';
import { ClauseLegalityVerifier } from '../../../src/contract/clause-verifier.js';
import { ContractClause } from '../../../src/contract/types.js';

describe('ClauseLegalityVerifier (Lát 3: Đánh giá Tính Pháp lý & Rủi ro 3 Mức)', () => {
  it('phát hiện điều khoản giữ bằng cấp gốc là TRÁI LUẬT (RED_ILLEGAL) theo Điều 17 BLLĐ', () => {
    const clause: ContractClause = {
      id: 'dieu-4',
      title: 'Điều 4: Nghĩa vụ nộp giấy tờ tùy thân và văn bằng',
      text: 'Người lao động phải nộp giữ bản chính Bằng tốt nghiệp Đại học cho Công ty để làm tin trong suốt thời gian làm việc.',
      category: 'GENERAL',
      orderIndex: 3,
    };

    const finding = ClauseLegalityVerifier.verifyClause(clause, 'labor');
    expect(finding.riskLevel).toBe('RED_ILLEGAL');
    expect(finding.statutoryViolations).toContain('Khoản 1 Điều 17 Bộ luật Lao động 2019');
    expect(finding.reason).toContain('nghiêm cấm người sử dụng lao động giữ bản chính giấy tờ tùy thân, văn bằng');
    expect(finding.renegotiationWording).toContain('bản sao công chứng');
  });

  it('phát hiện điều khoản trừ lương khi vi phạm nội quy là TRÁI LUẬT (RED_ILLEGAL)', () => {
    const clause: ContractClause = {
      id: 'dieu-6',
      title: 'Điều 6: Xử lý vi phạm nội quy',
      text: 'Mỗi lần đi muộn hoặc không hoàn thành KPI sẽ bị trừ 500.000 VNĐ trực tiếp vào lương.',
      category: 'DISCIPLINE_PENALTY',
      orderIndex: 5,
    };

    const finding = ClauseLegalityVerifier.verifyClause(clause, 'labor');
    expect(finding.riskLevel).toBe('RED_ILLEGAL');
    expect(finding.statutoryViolations).toContain('Khoản 2 Điều 127 Bộ luật Lao động 2019');
    expect(finding.reason).toContain('cắt lương thay việc xử lý kỷ luật');
  });

  it('phát hiện điều khoản chủ trọ tăng giá tùy ý là BẤT LỢI CẦN ĐÀM PHÁN (YELLOW_WARNING)', () => {
    const clause: ContractClause = {
      id: 'dieu-3',
      title: 'Điều 3: Điều chỉnh giá thuê',
      text: 'Bên cho thuê có quyền tự ý tăng tiền thuê nhà bất kỳ lúc nào nếu thấy chi phí thị trường gia tăng.',
      category: 'RENTAL_PRICE',
      orderIndex: 2,
    };

    const finding = ClauseLegalityVerifier.verifyClause(clause, 'rental');
    expect(finding.riskLevel).toBe('YELLOW_WARNING');
    expect(finding.statutoryViolations).toContain('Điều 165 Luật Nhà ở 2023');
    expect(finding.renegotiationWording).toContain('Giá thuê nhà ổn định trong suốt thời hạn hợp đồng');
  });

  it('phát hiện điều khoản cấm cạnh tranh 2 năm không có hỗ trợ tài chính là BẤT LỢI CẦN ĐÀM PHÁN (YELLOW_WARNING)', () => {
    const clause: ContractClause = {
      id: 'dieu-7',
      title: 'Điều 7: Cam kết không cạnh tranh',
      text: 'Sau khi nghỉ việc, người lao động cam kết không làm việc cho bất kỳ công ty nào cùng ngành trong vòng 02 năm.',
      category: 'CONFIDENTIALITY',
      orderIndex: 6,
    };

    const finding = ClauseLegalityVerifier.verifyClause(clause, 'labor');
    expect(finding.riskLevel).toBe('YELLOW_WARNING');
    expect(finding.reason).toContain('tự do làm việc');
    expect(finding.renegotiationWording).toContain('khoản hỗ trợ tài chính');
  });

  it('xác nhận điều khoản trả lương rõ ràng, đúng luật là HỢP PHÁP VÀ AN TOÀN (GREEN_SAFE)', () => {
    const clause: ContractClause = {
      id: 'dieu-3',
      title: 'Điều 3: Tiền lương và hình thức chi trả',
      text: 'Mức lương chính thức là 18.000.000 VNĐ / tháng, chuyển khoản vào ngày 05 hàng tháng.',
      category: 'COMPENSATION_SALARY',
      orderIndex: 2,
    };

    const finding = ClauseLegalityVerifier.verifyClause(clause, 'labor');
    expect(finding.riskLevel).toBe('GREEN_SAFE');
    expect(finding.statutoryViolations).toHaveLength(0);
  });

  it('Hồi quy Ca Biên C1: không gắn cờ trái luật khi điều khoản ghi người lao động tự lưu giữ bản chính (Negation Guard)', () => {
    const clause: ContractClause = {
      id: 'dieu-4',
      title: 'Điều 4: Hồ sơ nhân sự',
      text: 'Người lao động tự lưu giữ bản chính bằng tốt nghiệp, Công ty chỉ thu bản sao công chứng để lưu hồ sơ.',
      category: 'GENERAL',
      orderIndex: 3,
    };

    const finding = ClauseLegalityVerifier.verifyClause(clause, 'labor');
    expect(finding.riskLevel).toBe('GREEN_SAFE');
    expect(finding.statutoryViolations).toHaveLength(0);
  });

  it('Hồi quy Ca Biên I1: thu thập đầy đủ cả 2 vi phạm trong cùng 1 điều khoản (Multi-violation Accumulation)', () => {
    const clause: ContractClause = {
      id: 'dieu-2',
      title: 'Điều 2: Thử việc và hồ sơ nhận việc',
      text: 'Thời gian thử việc là 120 ngày. Người lao động nộp bản chính bằng tốt nghiệp đại học để Công ty lưu giữ.',
      category: 'PROBATION',
      orderIndex: 1,
    };

    const finding = ClauseLegalityVerifier.verifyClause(clause, 'labor');
    expect(finding.riskLevel).toBe('RED_ILLEGAL');
    expect(finding.statutoryViolations).toHaveLength(2);
    expect(finding.statutoryViolations.some((v) => v.includes('Điều 25'))).toBe(true);
    expect(finding.statutoryViolations.some((v) => v.includes('Điều 17'))).toBe(true);
    expect(finding.reason).toContain('thử việc');
    expect(finding.reason).toContain('văn bằng');
  });
});
