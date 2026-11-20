import { describe, it, expect } from 'vitest';
import { RuleAndLlmQueryCondenser } from '../../../src/session/query-condenser.js';
import { ChatMessage } from '../../../src/session/types.js';
import { MockLlmProvider } from '../../../src/rag/mock-llm-provider.js';

describe('Query Condenser & Contextual Rewriting (Slice 2)', () => {
  const sampleHistory: ChatMessage[] = [
    {
      id: 'msg-1',
      sessionId: 'sess-1',
      role: 'user',
      content: 'Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?',
      standaloneQuery: 'Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?',
      createdAt: '2026-11-20T10:00:00Z',
    },
    {
      id: 'msg-2',
      sessionId: 'sess-1',
      role: 'assistant',
      content: 'Phạt tiền từ 400.000 đồng đến 600.000 đồng theo Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP.',
      createdAt: '2026-11-20T10:00:05Z',
    },
  ];

  it('isDependentQuery nhận diện chính xác câu hỏi tiếp nối và câu hỏi độc lập', () => {
    const condenser = new RuleAndLlmQueryCondenser();

    // Các câu hỏi tiếp nối
    expect(condenser.isDependentQuery('Thế còn ô tô thì sao?', sampleHistory)).toBe(true);
    expect(condenser.isDependentQuery('Còn xe tải?', sampleHistory)).toBe(true);
    expect(condenser.isDependentQuery('Lỗi đó có bị trừ điểm bằng lái không?', sampleHistory)).toBe(true);
    expect(condenser.isDependentQuery('Có bị giữ xe không?', sampleHistory)).toBe(true);

    // Khi không có lịch sử -> Không thể phụ thuộc
    expect(condenser.isDependentQuery('Thế còn ô tô thì sao?', [])).toBe(false);

    // Câu hỏi dài đầy đủ chủ vị và độc lập
    expect(
      condenser.isDependentQuery(
        'Thời gian nghỉ thai sản của lao động nữ sinh một con theo Luật Bảo hiểm xã hội là bao lâu?',
        sampleHistory
      )
    ).toBe(false);
  });

  it('Heuristic Condensation tái tạo thành công câu hỏi tỉnh lược khi chạy Offline', async () => {
    // Không truyền LLM Provider -> Sử dụng Rule-based Heuristic 100% Offline
    const condenser = new RuleAndLlmQueryCondenser();

    // Lượt 2: "Thế còn ô tô thì sao?"
    const res1 = await condenser.condenseQuery('Thế còn ô tô thì sao?', sampleHistory);
    expect(res1.isCondensed).toBe(true);
    expect(res1.standaloneQuery.toLowerCase()).toContain('vượt đèn đỏ');
    expect(res1.standaloneQuery.toLowerCase()).toContain('ô tô');

    // Lượt 3: "Lỗi đó có bị trừ điểm bằng lái không?"
    const res2 = await condenser.condenseQuery('Lỗi đó có bị trừ điểm bằng lái không?', sampleHistory);
    expect(res2.isCondensed).toBe(true);
    expect(res2.standaloneQuery.toLowerCase()).toContain('vượt đèn đỏ');
    expect(res2.standaloneQuery.toLowerCase()).toContain('trừ điểm bằng lái');
  });

  it('Tự động phát hiện chuyển đổi chủ đề (Topic Shift) và giữ nguyên câu hỏi', async () => {
    const condenser = new RuleAndLlmQueryCondenser();

    const topicShiftQuery = 'Thời gian nghỉ thai sản của lao động nữ theo Luật Bảo hiểm xã hội là bao nhiêu tháng?';
    const res = await condenser.condenseQuery(topicShiftQuery, sampleHistory);

    expect(res.isCondensed).toBe(false);
    expect(res.standaloneQuery).toBe(topicShiftQuery);
    expect(res.standaloneQuery.toLowerCase()).not.toContain('vượt đèn đỏ');
  });

  it('LLM-based Condensation tái tạo chính xác câu truy vấn khi có LLM Provider', async () => {
    const mockLlm = new MockLlmProvider();
    mockLlm.setCannedResponse(
      'ô tô',
      'Hành vi vượt đèn đỏ đối với xe ô tô bị xử phạt bao nhiêu tiền?'
    );

    const condenser = new RuleAndLlmQueryCondenser(mockLlm);
    const res = await condenser.condenseQuery('Thế còn ô tô thì sao?', sampleHistory);

    expect(res.isCondensed).toBe(true);
    expect(res.standaloneQuery).toBe('Hành vi vượt đèn đỏ đối với xe ô tô bị xử phạt bao nhiêu tiền?');
  });
});
