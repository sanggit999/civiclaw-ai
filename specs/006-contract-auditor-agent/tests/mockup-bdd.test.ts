import { describe, it, expect } from 'vitest';
import { ContractAuditorAgent } from '../../../src/contract/contract-auditor-agent.js';

describe('ContractAuditorAgent (Lát 4: BDD Mockup & Kiểm chứng 5 Kịch bản Nghiệm thu)', () => {
  it('Kịch bản 1: Thẩm định HĐLĐ có điều khoản giữ bằng cấp gốc & thử việc 120 ngày (HIGH_RISK, 🔴 Đỏ)', async () => {
    const rawContract = `
HỢP ĐỒNG LAO ĐỘNG
Công ty Cổ phần Công nghệ XYZ và Ông Nguyễn Văn A

Điều 1: Vị trí công việc
- Nhân viên Kế toán tài chính.

Điều 2: Thời gian thử việc
- Thời gian thử việc là 120 ngày (4 tháng) kể từ ngày nhận việc.

Điều 3: Giữ văn bằng gốc
- Người lao động phải nộp giữ bản chính Bằng tốt nghiệp Đại học cho Công ty lưu giữ trong suốt thời hạn hợp đồng.

Điều 4: Tiền lương và hình thức thanh toán
- Lương chính thức: 15.000.000 VNĐ / tháng.

Điều 5: Bảo hiểm xã hội
- Tham gia đầy đủ BHXH, BHYT, BHTN theo quy định.

Điều 6: Trang bị bảo hộ lao động
- Trang bị đầy đủ bảo hộ theo chuẩn văn phòng.
`;

    const agent = new ContractAuditorAgent();
    const report = await agent.auditContract(rawContract, 'labor');

    expect(report.category).toBe('labor');
    expect(report.stats.redCount).toBe(2); // Thử việc 120 ngày + Giữ bằng gốc
    expect(report.riskTier).toBe('HIGH_RISK');
    expect(report.safetyScore).toBeLessThan(60); // 100 - 25*2 = 50

    // Kiểm chứng trích dẫn luật chính xác
    const citations = report.findings.flatMap((f) => f.statutoryViolations);
    expect(citations.some((c) => c.includes('Điều 17 Bộ luật Lao động 2019'))).toBe(true);
    expect(citations.some((c) => c.includes('Điều 25 Bộ luật Lao động 2019'))).toBe(true);
  });

  it('Kịch bản 2: Thẩm định Hợp đồng thuê nhà có điều khoản Tăng giá tùy ý & Tịch thu cọc (🟡 Vàng)', async () => {
    const rentalContract = `
HỢP ĐỒNG THUÊ NHÀ Ở
Bên cho thuê: Bà Hoàng Thị B.
Bên thuê: Ông Lê Văn C.

Điều 1: Giá thuê và phương thức thanh toán
- Giá thuê nhà: 5.000.000 VNĐ / tháng, thanh toán ngày 01 đầu tháng.

Điều 2: Điều chỉnh tiền thuê
- Bên cho thuê có quyền tự ý tăng tiền thuê bất kỳ lúc nào nếu thấy chi phí thị trường gia tăng.

Điều 3: Tiền đặt cọc và tịch thu cọc
- Bên thuê đặt cọc 5.000.000 VNĐ. Nếu bên thuê chuyển đi trước hạn 12 tháng sẽ bị tịch thu toàn bộ tiền cọc mà không được bồi hoàn.
`;

    const agent = new ContractAuditorAgent();
    const report = await agent.auditContract(rentalContract, 'rental');

    expect(report.category).toBe('rental');
    expect(report.stats.yellowCount).toBeGreaterThanOrEqual(1);

    // Có đề xuất đàm phán lại
    const findingsWithRenegotiation = report.findings.filter((f) => f.renegotiationWording);
    expect(findingsWithRenegotiation.length).toBeGreaterThan(0);
    expect(findingsWithRenegotiation[0].renegotiationWording).toContain('Kính đề nghị sửa đổi');
  });

  it('Kịch bản 3: Phát hiện hợp đồng lao động bị thiếu các điều khoản cốt lõi bắt buộc (Missing Clauses)', async () => {
    const incompleteContract = `
HỢP ĐỒNG LAO ĐỘNG RÚT GỌN
Điều 1: Công việc làm nhân viên kinh doanh.
Điều 2: Tiền lương 10 triệu/tháng.
`;

    const agent = new ContractAuditorAgent();
    const report = await agent.auditContract(incompleteContract, 'labor');

    expect(report.missingClauses.length).toBeGreaterThanOrEqual(2);
    const missingTypes = report.missingClauses.map((m) => m.clauseType);
    expect(missingTypes).toContain('SOCIAL_INSURANCE');
    expect(missingTypes).toContain('WORKING_HOURS');
    expect(report.stats.missingMandatoryCount).toBeGreaterThanOrEqual(2);
  });

  it('Kịch bản 4: Hợp đồng chuẩn mực, tuân thủ pháp luật (🟢 SAFE, Score >= 80)', async () => {
    const compliantContract = `
HỢP ĐỒNG LAO ĐỘNG CHUẨN MỰC
Điều 1: Công việc và chức danh chuyên môn kỹ sư phần mềm.
Điều 2: Thử việc 30 ngày hưởng 85% lương chính thức theo đúng luật.
Điều 3: Mức lương chính thức 25.000.000 VNĐ/tháng, thanh toán chuyển khoản ngày 05.
Điều 4: Thời giờ làm việc 40 giờ/tuần từ thứ 2 đến thứ 6, nghỉ thứ 7 và CN.
Điều 5: Đóng đầy đủ BHXH, BHYT, BHTN theo mức lương ký kết.
Điều 6: Trang bị máy tính xách tay và bảo hộ lao động theo quy chuẩn.
Điều 7: Chấm dứt hợp đồng khi báo trước 30 ngày theo quy định tại Điều 35 BLLĐ.
`;

    const agent = new ContractAuditorAgent();
    const report = await agent.auditContract(compliantContract, 'labor');

    expect(report.stats.redCount).toBe(0);
    expect(report.stats.yellowCount).toBe(0);
    expect(report.stats.missingMandatoryCount).toBe(0);
    expect(report.riskTier).toBe('SAFE');
    expect(report.safetyScore).toBe(100);
  });

  it('Kịch bản 5: Cấu hình linh hoạt không hardcode (Anti-Hardcode)', async () => {
    const contractWithOneRed = `
HỢP ĐỒNG LAO ĐỘNG
Điều 1: Vị trí làm việc.
Điều 2: Lương 10 triệu.
Điều 3: Thử việc 120 ngày.
Điều 4: Thời giờ làm việc 8h/ngày.
Điều 5: Đóng bảo hiểm xã hội đầy đủ.
Điều 6: Trang bị bảo hộ lao động.
`;

    // Cấu hình tùy chỉnh: redPenalty = 50 (thay vì mặc định 25)
    const customConfig = {
      redPenalty: 50,
      safeScoreThreshold: 90,
      cautionScoreThreshold: 70,
    };

    const agent = new ContractAuditorAgent(customConfig);
    const report = await agent.auditContract(contractWithOneRed, 'labor');

    // 100 - 50 = 50 điểm
    expect(report.safetyScore).toBe(50);
  });
});
