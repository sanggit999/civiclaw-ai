import { describe, it, expect } from 'vitest';
import { LegalChunk } from '../../../src/ingestion/types.js';
import {
  DEFAULT_RAG_CONFIG,
  formatContextChunks,
  buildGroundedPrompt,
} from '../../../src/rag/prompt-builder.js';
import { MockLlmProvider } from '../../../src/rag/mock-llm-provider.js';

describe('Prompt Builder & Mock LLM Provider (Slice 1)', () => {
  const sampleChunks: LegalChunk[] = [
    {
      id: '168_2024_ND-CP_Điều_6_Khoản_3_Điểm_đ',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 6',
      clause: 'Khoản 3',
      point: 'Điểm đ',
      fullReference: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
      content: 'Không chấp hành hiệu lệnh của đèn tín hiệu giao thông (vượt đèn đỏ, vượt đèn vàng)',
      keywords: ['vượt đèn đỏ', 'vượt đèn vàng', 'phạt tiền'],
    },
    {
      id: '168_2024_ND-CP_Điều_6_Khoản_10_Điểm_b',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 6',
      clause: 'Khoản 10',
      point: 'Điểm b',
      fullReference: 'Điểm b Khoản 10 Điều 6 Nghị định 168/2024/NĐ-CP',
      content: 'Bị trừ 02 điểm giấy phép lái xe đối với hành vi quy định tại Điểm đ Khoản 3 Điều này',
      keywords: ['trừ điểm GPLX'],
    },
  ];

  it('DEFAULT_RAG_CONFIG chứa đầy đủ tham số cấu hình chống hardcode', () => {
    expect(DEFAULT_RAG_CONFIG.defaultTopK).toBe(5);
    expect(DEFAULT_RAG_CONFIG.defaultConfidenceThreshold).toBe(0.65);
    expect(DEFAULT_RAG_CONFIG.maxContextLengthChars).toBeGreaterThan(1000);
    expect(DEFAULT_RAG_CONFIG.systemPrompt).toContain('CivicLaw AI');
    expect(DEFAULT_RAG_CONFIG.systemPrompt).toContain('100% CĂN CỨ VÀ TRÍCH DẪN');
    expect(DEFAULT_RAG_CONFIG.fallbackMessage).toContain('THÔNG BÁO VỀ CĂN CỨ PHÁP LÝ');
  });

  it('formatContextChunks đóng gói ngữ cảnh đánh số thứ tự kèm fullReference', () => {
    const context = formatContextChunks(sampleChunks);
    expect(context).toContain('[NGUỒN THAM KHẢO 1]: Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP');
    expect(context).toContain('[NGUỒN THAM KHẢO 2]: Điểm b Khoản 10 Điều 6 Nghị định 168/2024/NĐ-CP');
    expect(context).toContain('Không chấp hành hiệu lệnh của đèn tín hiệu');
  });

  it('formatContextChunks tuân thủ giới hạn maxLength', () => {
    const context = formatContextChunks(sampleChunks, 250);
    expect(context).toContain('[NGUỒN THAM KHẢO 1]');
    // Nguồn 2 bị cắt bỏ do vượt quá maxLength
    expect(context).not.toContain('[NGUỒN THAM KHẢO 2]');
  });

  it('buildGroundedPrompt ghép nối hoàn chỉnh context và câu hỏi', () => {
    const { prompt, systemInstruction } = buildGroundedPrompt(
      'Vượt đèn vàng xe máy phạt bao nhiêu?',
      sampleChunks
    );

    expect(systemInstruction).toBe(DEFAULT_RAG_CONFIG.systemPrompt);
    expect(prompt).toContain('--- BẮT ĐẦU NGỮ CẢNH PHÁP LUẬT ---');
    expect(prompt).toContain('Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP');
    expect(prompt).toContain('Vượt đèn vàng xe máy phạt bao nhiêu?');
  });

  it('MockLlmProvider phản hồi đúng canned response và ghi nhận lịch sử gọi', async () => {
    const mockLlm = new MockLlmProvider();
    mockLlm.setCannedResponse('vượt đèn vàng', 'Mức phạt từ 400.000 đến 600.000 đồng');

    const result = await mockLlm.generate('Hỏi về vượt đèn vàng xe máy');
    expect(result.text).toBe('Mức phạt từ 400.000 đến 600.000 đồng');
    expect(result.tokensUsed).toBe(150);

    const history = mockLlm.getCallHistory();
    expect(history).toHaveLength(1);
    expect(history[0].prompt).toContain('vượt đèn vàng');
  });
});
