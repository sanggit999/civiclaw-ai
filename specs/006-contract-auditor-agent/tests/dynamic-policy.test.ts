import { describe, it, expect } from 'vitest';
import { ContractAuditorAgent } from '../../../src/contract/contract-auditor-agent.js';
import { DefaultContractPolicyProvider } from '../../../src/contract/policy-provider.js';
import { ContractPolicy } from '../../../src/contract/policy-types.js';

describe('Dynamic Contract Policy Provider (Kiểm chứng Chống Hardcode Quy tắc Pháp lý)', () => {
  it('cho phép nạp quy tắc tùy chỉnh động từ bên ngoài mà không sửa một dòng code nào', async () => {
    // Giả lập tình huống: Doanh nghiệp hoặc Quốc hội thay đổi quy định:
    // Thời gian thử việc rút ngắn xuống tối đa 45 ngày (thay vì 60 ngày)
    // Và thêm điều khoản cấm giữ CCCD với mức phạt riêng
    const customLaborPolicy: ContractPolicy = {
      category: 'labor',
      title: 'Chính sách Lao động Tùy biến Mới 2026',
      limits: [
        {
          metric: 'probation_days',
          threshold: 45, // Ngưỡng tùy biến mới 45 ngày
          unit: 'days',
          statutoryCitation: 'Nghị định Sửa đổi 2026',
          reasonTemplate: 'Thời gian thử việc phát hiện ({value} ngày) vượt quá ngưỡng tùy biến {threshold} ngày theo {citation}.',
          suggestedWordingTemplate: 'Đề nghị sửa đổi thời gian thử việc tối đa {threshold} ngày theo {citation}.',
        },
      ],
      prohibitions: [],
      mandatoryClauses: [],
    };

    const policyProvider = new DefaultContractPolicyProvider({
      labor: customLaborPolicy,
    });

    const agent = new ContractAuditorAgent(undefined, { policyProvider });

    // Hợp đồng có thời gian thử việc 50 ngày (trước đây <= 60 ngày là GREEN, nhưng với chính sách mới 45 ngày thì phải là RED!)
    const contractText = `
HỢP ĐỒNG LAO ĐỘNG
Điều 1: Vị trí lập trình viên.
Điều 2: Thời gian thử việc là 50 ngày kể từ ngày nhận việc.
`;

    const report = await agent.auditContract(contractText, 'labor');

    // Kiểm chứng hệ thống tự động áp dụng ngưỡng động 45 ngày
    expect(report.stats.redCount).toBe(1);
    expect(report.findings[1].riskLevel).toBe('RED_ILLEGAL');
    expect(report.findings[1].statutoryViolations).toContain('Nghị định Sửa đổi 2026');
    expect(report.findings[1].reason).toContain('vượt quá ngưỡng tùy biến 45 ngày');
    expect(report.findings[1].renegotiationWording).toContain('tối đa 45 ngày');
  });

  it('xác nhận hệ thống mặc định nạp đầy đủ các chính sách chuẩn mực an toàn khi không truyền tùy biến', async () => {
    const policyProvider = new DefaultContractPolicyProvider();
    const laborPolicy = await policyProvider.getPolicy('labor');

    expect(laborPolicy.category).toBe('labor');
    expect(laborPolicy.mandatoryClauses.length).toBeGreaterThan(0);
    expect(laborPolicy.limits.length).toBeGreaterThan(0);
    expect(laborPolicy.prohibitions.length).toBeGreaterThan(0);

    const rentalPolicy = await policyProvider.getPolicy('rental');
    expect(rentalPolicy.category).toBe('rental');
    expect(rentalPolicy.mandatoryClauses.length).toBeGreaterThan(0);
  });
});
