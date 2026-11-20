import { describe, it, expect } from 'vitest';
import { InMemorySessionStore } from '../../../src/session/in-memory-session-store.js';
import { RuleAndLlmQueryCondenser } from '../../../src/session/query-condenser.js';
import { ContextualRagPipeline } from '../../../src/session/pipeline.js';
import { GroundedRagPipeline } from '../../../src/rag/pipeline.js';
import { MockLlmProvider } from '../../../src/rag/mock-llm-provider.js';
import { RegexCitationVerifier } from '../../../src/rag/citation-verifier.js';
import { LegalChunk } from '../../../src/ingestion/types.js';

describe('Contextual Multi-turn RAG Pipeline (Slice 3)', () => {
  const sampleLawChunks: LegalChunk[] = [
    {
      id: '168_2024_ND-CP_Điều_6_Khoản_3_Điểm_đ',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 6',
      clause: 'Khoản 3',
      point: 'Điểm đ',
      fullReference: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
      content: 'Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe mô tô vượt đèn đỏ.',
      keywords: ['vượt đèn đỏ', 'xe máy'],
    },
    {
      id: '168_2024_ND-CP_Điều_6_Khoản_5_Điểm_a',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 6',
      clause: 'Khoản 5',
      point: 'Điểm a',
      fullReference: 'Điểm a Khoản 5 Điều 6 Nghị định 168/2024/NĐ-CP',
      content: 'Phạt tiền từ 4.000.000 đồng đến 6.000.000 đồng đối với người điều khiển xe ô tô vượt đèn đỏ.',
      keywords: ['vượt đèn đỏ', 'xe ô tô', 'ô tô'],
    },
  ];

  it('xử lý luồng hội thoại 2 lượt: Lượt 1 hỏi gốc, Lượt 2 hỏi tiếp nối tỉnh lược', async () => {
    const sessionStore = new InMemorySessionStore();
    const condenser = new RuleAndLlmQueryCondenser(); // Heuristic offline condenser
    const mockLlm = new MockLlmProvider();
    const verifier = new RegexCitationVerifier();

    // Giả lập RAG Core
    const mockRetriever = {
      async search(queryText: string) {
        const lower = queryText.toLowerCase();
        if (lower.includes('ô tô') && lower.includes('vượt đèn đỏ')) {
          return { topScore: 0.95, results: [{ chunk: sampleLawChunks[1], score: 0.95 }] };
        }
        if (lower.includes('xe máy') && lower.includes('vượt đèn đỏ')) {
          return { topScore: 0.90, results: [{ chunk: sampleLawChunks[0], score: 0.90 }] };
        }
        return { topScore: 0.2, results: [] };
      },
    };

    const mockGapRecorder = {
      async recordQuery() {
        return null;
      },
    };

    mockLlm.setCannedResponse(
      'xe máy',
      'Theo Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP, xe máy vượt đèn đỏ phạt 400.000 đến 600.000 đồng.'
    );

    mockLlm.setCannedResponse(
      'ô tô',
      'Theo Điểm a Khoản 5 Điều 6 Nghị định 168/2024/NĐ-CP, ô tô vượt đèn đỏ phạt 4.000.000 đến 6.000.000 đồng.'
    );

    const ragCore = new GroundedRagPipeline(
      mockRetriever,
      mockGapRecorder,
      mockLlm,
      verifier
    );

    const pipeline = new ContextualRagPipeline(sessionStore, condenser, ragCore);

    // Tạo phiên mới
    const session = await sessionStore.createSession('Tư vấn vi phạm giao thông');

    // =========================================================================
    // LƯỢT 1: Câu hỏi độc lập đầy đủ
    // =========================================================================
    const res1 = await pipeline.chat({
      sessionId: session.id,
      query: 'Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?',
    });

    expect(res1.isCondensed).toBe(false);
    expect(res1.standaloneQuery).toBe('Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?');
    expect(res1.answer).toContain('400.000 đến 600.000 đồng');
    expect(res1.isGrounded).toBe(true);

    // =========================================================================
    // LƯỢT 2: Câu hỏi tiếp nối tỉnh lược chủ ngữ ("Thế còn ô tô thì sao?")
    // =========================================================================
    const res2 = await pipeline.chat({
      sessionId: session.id,
      query: 'Thế còn ô tô thì sao?',
    });

    expect(res2.isCondensed).toBe(true);
    expect(res2.standaloneQuery.toLowerCase()).toContain('vượt đèn đỏ');
    expect(res2.standaloneQuery.toLowerCase()).toContain('ô tô');
    expect(res2.answer).toContain('4.000.000 đến 6.000.000 đồng');
    expect(res2.isGrounded).toBe(true);
    expect(res2.citations).toHaveLength(1);
    expect(res2.citations[0].fullReference).toBe('Điểm a Khoản 5 Điều 6 Nghị định 168/2024/NĐ-CP');

    // Kiểm tra lịch sử lưu trữ trong SessionStore
    const history = await sessionStore.getRecentMessages(session.id, 10);
    expect(history).toHaveLength(4); // 2 user msgs + 2 assistant msgs
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
    expect(history[2].role).toBe('user');
    expect(history[2].standaloneQuery).toBeDefined();
    expect(history[3].role).toBe('assistant');
  });
});
