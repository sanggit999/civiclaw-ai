import { describe, it, expect, vi } from 'vitest';
import { ContractAuditorAgent } from '../../../src/contract/contract-auditor-agent.js';
import { ILlmProvider } from '../../../src/rag/types.js';
import { LegalSearchEngine } from '../../../src/search/engine.js';
import { LegalChunk } from '../../../src/ingestion/types.js';

describe('Agentic RAG Contract Auditor (Tích hợp Tra cứu Luật Thực Định & LLM Reasoner)', () => {
  it('tự động tra cứu kho luật và gọi LLM phân tích điều khoản làm việc 60h/tuần thành RED_ILLEGAL', async () => {
    // 1. Tạo chunk luật mẫu đại diện cho Điều 105 BLLĐ 2019
    const sampleChunk: LegalChunk = {
      id: 'bllđ_2019_dieu_105',
      docNumber: '45/2019/QH14',
      domain: 'LABOR',
      article: 'Điều 105',
      fullReference: 'Điều 105 Bộ luật Lao động 2019',
      content: 'Thời giờ làm việc bình thường không quá 08 giờ trong 01 ngày và không quá 48 giờ trong 01 tuần.',
      keywords: ['thời giờ làm việc', '48 giờ'],
    };

    // 2. Mock Search Engine
    const mockSearchEngine = {
      search: vi.fn().mockResolvedValue({
        isFound: true,
        topScore: 0.92,
        results: [{ chunk: sampleChunk, score: 0.92 }],
        message: 'Found',
        loggedToKnowledgeGap: false,
      }),
    } as unknown as LegalSearchEngine;

    // 3. Mock LLM Provider trả về phân tích ngữ nghĩa
    const mockLlmProvider: ILlmProvider = {
      generate: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          isViolation: true,
          riskLevel: 'RED_ILLEGAL',
          statutoryCitation: 'Điều 105 Bộ luật Lao động 2019',
          reason: 'Khoản 1 Điều 105 Bộ luật Lao động 2019 quy định thời giờ làm việc bình thường không quá 48 giờ trong 01 tuần. Thỏa thuận 60 giờ/tuần là trái quy định cấm của luật.',
          suggestedWording: 'Đề nghị điều chỉnh thời giờ làm việc không vượt quá 48 giờ/tuần theo Điều 105 Bộ luật Lao động 2019.',
        }),
        tokensUsed: 120,
      }),
    };

    const agent = new ContractAuditorAgent(undefined, {
      searchEngine: mockSearchEngine,
      llmProvider: mockLlmProvider,
    });

    const contractText = `
HỢP ĐỒNG LAO ĐỘNG
Điều 1: Công việc kỹ sư phần mềm.
Điều 2: Tiền lương 20 triệu/tháng.
Điều 3: Thời giờ làm việc là 60 giờ trong 01 tuần từ thứ 2 đến thứ 7.
Điều 4: Tham gia bảo hiểm xã hội đầy đủ.
Điều 5: Trang bị bảo hộ lao động.
`;

    const report = await agent.auditContract(contractText, 'labor');

    // Kiểm chứng Agent đã gọi Search Engine
    expect(mockSearchEngine.search).toHaveBeenCalled();

    // Kiểm chứng Agent đã gọi LLM Reasoner
    expect(mockLlmProvider.generate).toHaveBeenCalled();

    // Kiểm chứng kết quả thẩm định
    const workingHoursFinding = report.findings.find((f) => f.clauseTitle.includes('Điều 3'));
    expect(workingHoursFinding?.riskLevel).toBe('RED_ILLEGAL');
    expect(workingHoursFinding?.statutoryViolations).toContain('Điều 105 Bộ luật Lao động 2019');
    expect(workingHoursFinding?.reason).toContain('không quá 48 giờ');
  });

  it('tự động fallback an toàn về Dynamic Policy khi LLM Provider bị timeout hoặc sập nguồn', async () => {
    const mockSearchEngine = {
      search: vi.fn().mockRejectedValue(new Error('DB Connection Timeout')),
    } as unknown as LegalSearchEngine;

    const failingLlmProvider: ILlmProvider = {
      generate: vi.fn().mockRejectedValue(new Error('Gemini API Error 503')),
    };

    const agent = new ContractAuditorAgent(undefined, {
      searchEngine: mockSearchEngine,
      llmProvider: failingLlmProvider,
    });

    const contractWithProbation = `
HỢP ĐỒNG LAO ĐỘNG
Điều 1: Thử việc là 120 ngày.
`;

    // Agent không bị crash, mà tự động fallback sang Dynamic Policy Provider
    const report = await agent.auditContract(contractWithProbation, 'labor');
    expect(report.stats.redCount).toBe(1);
    expect(report.findings[0].statutoryViolations[0]).toContain('Điều 25');
  });
});
