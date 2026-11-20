import { describe, it, expect } from 'vitest';
import { LegalChunk } from '../../../src/ingestion/types.js';
import { RegexCitationVerifier } from '../../../src/rag/citation-verifier.js';

describe('Citation Verifier & Anti-Hallucination Guard (Slice 2)', () => {
  const verifier = new RegexCitationVerifier();

  const sampleContextChunks: LegalChunk[] = [
    {
      id: '168_2024_ND-CP_Điều_6_Khoản_3_Điểm_đ',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 6',
      clause: 'Khoản 3',
      point: 'Điểm đ',
      fullReference: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
      content: 'Không chấp hành hiệu lệnh của đèn tín hiệu giao thông',
      keywords: ['vượt đèn đỏ'],
    },
    {
      id: '36_2024_QH15_Điều_47_Khoản_1_Điểm_a',
      docNumber: '36/2024/QH15',
      domain: 'TRAFFIC',
      article: 'Điều 47',
      clause: 'Khoản 1',
      point: 'Điểm a',
      fullReference: 'Điểm a Khoản 1 Điều 47 Luật Trật tự, an toàn giao thông đường bộ 2024',
      content: 'Chấp hành tín hiệu đèn giao thông',
      keywords: ['tín hiệu đèn'],
    },
  ];

  it('extractCitations bóc tách chính xác các cấu phần trích dẫn', () => {
    const text = `Theo Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP, mức phạt là 400.000 đến 600.000 đồng. Ngoài ra Khoản 1 Điều 47 Luật Trật tự, an toàn giao thông đường bộ 2024 cũng quy định rõ.`;
    const citations = verifier.extractCitations(text);

    expect(citations).toHaveLength(2);

    expect(citations[0].article).toBe('Điều 6');
    expect(citations[0].clause).toBe('Khoản 3');
    expect(citations[0].point).toBe('Điểm đ');
    expect(citations[0].docNumber).toBe('168/2024/NĐ-CP');

    expect(citations[1].article).toBe('Điều 47');
    expect(citations[1].clause).toBe('Khoản 1');
    expect(citations[1].point).toBeUndefined();
  });

  it('verify xác nhận trích dẫn hợp lệ khi khớp 100% với context chunks', () => {
    const answer = `Căn cứ Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP, hành vi này bị xử phạt.`;
    const result = verifier.verify(answer, sampleContextChunks);

    expect(result.isValid).toBe(true);
    expect(result.verifiedCitations).toHaveLength(1);
    expect(result.verifiedCitations[0].isVerified).toBe(true);
    expect(result.unverifiedCitations).toHaveLength(0);
  });

  it('verify phát hiện và gắn cờ trích dẫn ma (Hallucinated Citation)', () => {
    const answerWithHallucination = `Theo Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP và Điều 999 Nghị định 999/2099/NĐ-CP, mức phạt là 10 triệu đồng.`;
    const result = verifier.verify(answerWithHallucination, sampleContextChunks);

    expect(result.isValid).toBe(false);
    expect(result.verifiedCitations).toHaveLength(1); // Điều 6 NĐ 168 hợp lệ
    expect(result.unverifiedCitations).toHaveLength(1); // Điều 999 NĐ 999 bị phát hiện là trích dẫn ma
    expect(result.unverifiedCitations[0]).toContain('Điều 999');
  });

  it('verify phát hiện trích dẫn bịa Khoản hoặc Điểm không có trong context', () => {
    // Ngữ cảnh chỉ có Khoản 3 Điều 6, nhưng LLM bịa Khoản 99 Điều 6
    const answerWithFakeClause = `Theo Khoản 99 Điều 6 Nghị định 168/2024/NĐ-CP, bị tịch thu phương tiện.`;
    const result = verifier.verify(answerWithFakeClause, sampleContextChunks);

    expect(result.isValid).toBe(false);
    expect(result.verifiedCitations).toHaveLength(0);
    expect(result.unverifiedCitations).toHaveLength(1);
    expect(result.unverifiedCitations[0]).toContain('Khoản 99');
  });

  it('verify xử lý an toàn khi câu trả lời không chứa trích dẫn nào', () => {
    const answer = 'Chào Bạn, hôm nay trời rất đẹp.';
    const result = verifier.verify(answer, sampleContextChunks);

    expect(result.isValid).toBe(true);
    expect(result.verifiedCitations).toHaveLength(0);
    expect(result.unverifiedCitations).toHaveLength(0);
  });
});
