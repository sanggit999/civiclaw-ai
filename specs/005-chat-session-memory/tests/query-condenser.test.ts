import { describe, it, expect, vi } from 'vitest';
import * as condenserModule from '../../../src/session/query-condenser.js';
import { RuleAndLlmQueryCondenser } from '../../../src/session/query-condenser.js';
import { ChatMessage } from '../../../src/session/types.js';
import { MockLlmProvider } from '../../../src/rag/mock-llm-provider.js';
import { ILlmProvider } from '../../../src/rag/types.js';

describe('Query Condenser & Pure LLM-only Rewriting (Spec 005 + Spec 016 Option B)', () => {
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

  it('Loại bỏ sạch 6 hằng số Regex hardcode khỏi query-condenser.ts', () => {
    expect('DEPENDENT_PATTERNS' in condenserModule).toBe(false);
    expect('EXPLICIT_TOPIC_SHIFT_PATTERNS' in condenserModule).toBe(false);
    expect('isDependentQuery' in RuleAndLlmQueryCondenser.prototype).toBe(false);
  });

  it('Lượt đầu tiên (history rỗng) không gọi LLM và trả nguyên câu gốc', async () => {
    const spyLlm: ILlmProvider = { generate: vi.fn() };
    const condenser = new RuleAndLlmQueryCondenser(spyLlm);

    const res = await condenser.condenseQuery('Thế còn ô tô thì sao?', []);
    expect(res.isCondensed).toBe(false);
    expect(res.standaloneQuery).toBe('Thế còn ô tô thì sao?');
    expect(spyLlm.generate).not.toHaveBeenCalled();
  });

  it('Tự động phát hiện chuyển đổi chủ đề (Topic Shift) khi LLM giữ nguyên câu hỏi', async () => {
    const topicShiftQuery =
      'Thời gian nghỉ thai sản của lao động nữ theo Luật Bảo hiểm xã hội là bao nhiêu tháng?';
    const mockLlm = new MockLlmProvider();
    mockLlm.setCannedResponse('thai sản', topicShiftQuery);

    const condenser = new RuleAndLlmQueryCondenser(mockLlm);
    const res = await condenser.condenseQuery(topicShiftQuery, sampleHistory);

    expect(res.isCondensed).toBe(false);
    expect(res.standaloneQuery).toBe(topicShiftQuery);
    expect(res.standaloneQuery.toLowerCase()).not.toContain('vượt đèn đỏ');
  });

  it('LLM-based Condensation tái tạo chính xác câu truy vấn nối tiếp & fallback an toàn khi 429/không LLM', async () => {
    const mockLlm = new MockLlmProvider();
    mockLlm.setCannedResponse(
      'ô tô',
      'Hành vi vượt đèn đỏ đối với xe ô tô bị xử phạt bao nhiêu tiền?'
    );

    const condenser = new RuleAndLlmQueryCondenser(mockLlm);
    const res = await condenser.condenseQuery('Thế còn ô tô thì sao?', sampleHistory);

    expect(res.isCondensed).toBe(true);
    expect(res.standaloneQuery).toBe('Hành vi vượt đèn đỏ đối với xe ô tô bị xử phạt bao nhiêu tiền?');

    // Khi không có LLM hoặc LLM lỗi 429 -> không ghép bừa regex cũ, giữ nguyên câu gốc an toàn
    const noLlmCondenser = new RuleAndLlmQueryCondenser();
    const noLlmRes = await noLlmCondenser.condenseQuery('Con đường này có cấm ô tô?', sampleHistory);
    expect(noLlmRes.isCondensed).toBe(false);
    expect(noLlmRes.standaloneQuery).toBe('Con đường này có cấm ô tô?');

    const errLlm: ILlmProvider = {
      generate: vi.fn().mockRejectedValue(new Error('Gemini API Error (429): Quota exhausted')),
    };
    const errCondenser = new RuleAndLlmQueryCondenser(errLlm);
    const errRes = await errCondenser.condenseQuery('Thế còn ô tô thì sao?', sampleHistory);
    expect(errRes.isCondensed).toBe(false);
    expect(errRes.standaloneQuery).toBe('Thế còn ô tô thì sao?');

    // Khi LLM trả chuỗi rác quá ngắn (< 3 ký tự) -> giữ nguyên câu gốc an toàn
    const tinyJunkLlm: ILlmProvider = {
      generate: vi.fn().mockResolvedValue({ text: 'ok' }),
    };
    const tinyCondenser = new RuleAndLlmQueryCondenser(tinyJunkLlm);
    const tinyRes = await tinyCondenser.condenseQuery('Thế còn ô tô thì sao?', sampleHistory);
    expect(tinyRes.isCondensed).toBe(false);
    expect(tinyRes.standaloneQuery).toBe('Thế còn ô tô thì sao?');
  });
});
