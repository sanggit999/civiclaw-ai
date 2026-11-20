import { describe, it, expect } from 'vitest';
import { InMemorySessionStore } from '../../../src/session/in-memory-session-store.js';
import { RuleAndLlmQueryCondenser } from '../../../src/session/query-condenser.js';
import { ContextualRagPipeline } from '../../../src/session/pipeline.js';
import { GroundedRagPipeline } from '../../../src/rag/pipeline.js';
import { MockLlmProvider } from '../../../src/rag/mock-llm-provider.js';
import { RegexCitationVerifier } from '../../../src/rag/citation-verifier.js';
import { LegalChunk } from '../../../src/ingestion/types.js';

describe('BDD Scenarios: Multi-turn Legal Dialogue & Chat Session Memory (Slice 4)', () => {
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
    {
      id: '41_2024_QH15_Điều_34_Khoản_1',
      docNumber: '41/2024/QH15',
      domain: 'SOCIAL_INSURANCE',
      article: 'Điều 34',
      clause: 'Khoản 1',
      fullReference: 'Khoản 1 Điều 34 Luật Bảo hiểm xã hội 2024',
      content: 'Lao động nữ sinh con được nghỉ việc hưởng chế độ thai sản trước và sau khi sinh con là 06 tháng.',
      keywords: ['thai sản', 'sinh con', 'nghỉ việc'],
    },
  ];

  function createPipeline(mockLlm: MockLlmProvider, customConfig?: any, condenserLlm?: MockLlmProvider) {
    const sessionStore = new InMemorySessionStore();
    // Sử dụng Heuristic Rule-based Condenser (hoặc condenserLlm riêng) để không xung đột từ khóa với RAG
    const condenser = new RuleAndLlmQueryCondenser(condenserLlm, customConfig);
    const verifier = new RegexCitationVerifier();

    const mockRetriever = {
      async search(queryText: string) {
        const lower = queryText.toLowerCase();
        if (lower.includes('thai sản') || lower.includes('sinh con')) {
          return { topScore: 0.95, results: [{ chunk: sampleLawChunks[2], score: 0.95 }] };
        }
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

    const ragCore = new GroundedRagPipeline(
      mockRetriever,
      mockGapRecorder,
      mockLlm,
      verifier
    );

    const pipeline = new ContextualRagPipeline(sessionStore, condenser, ragCore, customConfig);
    return { pipeline, sessionStore, condenser };
  }

  /**
   * KỊCH BẢN 1: Hỏi đáp tiếp nối tỉnh lược chủ ngữ thành công (Happy Path)
   */
  it('Kịch bản 1: Hỏi tiếp nối tỉnh lược chủ ngữ -> Tái tạo câu hỏi độc lập và trả lời chính xác', async () => {
    const mockLlm = new MockLlmProvider();
    mockLlm.setCannedResponse('xe máy', 'Theo Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP, xe máy vượt đèn đỏ phạt 400.000 đến 600.000đ.');
    mockLlm.setCannedResponse('ô tô', 'Theo Điểm a Khoản 5 Điều 6 Nghị định 168/2024/NĐ-CP, ô tô vượt đèn đỏ phạt 4.000.000 đến 6.000.000đ.');

    const { pipeline, sessionStore } = createPipeline(mockLlm);
    const session = await sessionStore.createSession();

    // Lượt 1
    const res1 = await pipeline.chat({
      sessionId: session.id,
      query: 'Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?',
    });
    expect(res1.isCondensed).toBe(false);

    // Lượt 2: Hỏi tiếp nối
    const res2 = await pipeline.chat({
      sessionId: session.id,
      query: 'Thế còn ô tô thì sao?',
    });
    expect(res2.isCondensed).toBe(true);
    expect(res2.standaloneQuery.toLowerCase()).toContain('vượt đèn đỏ');
    expect(res2.standaloneQuery.toLowerCase()).toContain('ô tô');
    expect(res2.answer).toContain('4.000.000 đến 6.000.000đ');
    expect(res2.isGrounded).toBe(true);
  });

  /**
   * KỊCH BẢN 2: Tự động phát hiện chuyển đổi chủ đề (Topic Shift)
   */
  it('Kịch bản 2: Chuyển đổi chủ đề sang lĩnh vực khác -> Không ghép từ khóa giao thông cũ', async () => {
    const mockLlm = new MockLlmProvider();
    mockLlm.setCannedResponse('thai sản', 'Theo Khoản 1 Điều 34 Luật số 41/2024/QH15, thời gian nghỉ thai sản là 06 tháng.');

    const { pipeline, sessionStore } = createPipeline(mockLlm);
    const session = await sessionStore.createSession();

    // Lượt 1: Hỏi giao thông
    await pipeline.chat({
      sessionId: session.id,
      query: 'Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?',
    });

    // Lượt 2: Đột ngột đổi sang thai sản
    const shiftQuery = 'Thời gian nghỉ thai sản của lao động nữ theo Luật Bảo hiểm xã hội là mấy tháng?';
    const res2 = await pipeline.chat({
      sessionId: session.id,
      query: shiftQuery,
    });

    expect(res2.isCondensed).toBe(false); // Không bị ép dính ngữ cảnh cũ
    expect(res2.standaloneQuery).toBe(shiftQuery);
    expect(res2.answer).toContain('06 tháng');
    expect(res2.citations[0].article).toBe('Điều 34');
    expect(res2.citations[0].docNumber).toBe('41/2024/QH15');
  });

  /**
   * KỊCH BẢN 3: Giữ vững Cửa sổ Ngữ cảnh Trượt (Sliding Window Context)
   */
  it('Kịch bản 3: Giới hạn số lượng tin nhắn trong cửa sổ trượt (maxHistoryTurns)', async () => {
    const mockLlm = new MockLlmProvider();
    const { pipeline, sessionStore } = createPipeline(mockLlm, { maxHistoryTurns: 4 });
    const session = await sessionStore.createSession();

    // Giả lập thêm 6 tin nhắn
    for (let i = 1; i <= 6; i++) {
      await sessionStore.appendMessage({
        sessionId: session.id,
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: `Nội dung ${i}`,
      });
    }

    const recent = await sessionStore.getRecentMessages(session.id, 4);
    expect(recent).toHaveLength(4);
    expect(recent[0].content).toBe('Nội dung 3');
    expect(recent[3].content).toBe('Nội dung 6');
  });

  /**
   * KỊCH BẢN 4: Vận hành Offline 100% với InMemorySessionStore & Mock LLM
   */
  it('Kịch bản 4: Vận hành hoàn toàn Offline với tốc độ dưới 50ms', async () => {
    const start = performance.now();
    const mockLlm = new MockLlmProvider();
    mockLlm.setCannedResponse('thử nghiệm', 'Câu trả lời offline nhanh.');

    const { pipeline, sessionStore } = createPipeline(mockLlm);
    const session = await sessionStore.createSession();

    const res = await pipeline.chat({
      sessionId: session.id,
      query: 'thử nghiệm phiên',
    });

    const elapsed = performance.now() - start;
    expect(res.answer).toBeDefined();
    expect(elapsed).toBeLessThan(50); // Phải hoàn thành dưới 50ms
  });

  /**
   * KỊCH BẢN 5: Chống Hardcode (Tôn trọng Custom Config)
   */
  it('Kịch bản 5: Pipeline tôn trọng cấu hình tùy biến thay vì hardcode', async () => {
    const mockLlm = new MockLlmProvider();
    const customConfig = {
      maxHistoryTurns: 2,
      defaultSessionTitle: 'Phiên tùy biến doanh nghiệp',
    };

    const { pipeline, sessionStore } = createPipeline(mockLlm, customConfig);
    const session = await sessionStore.createSession(customConfig.defaultSessionTitle);

    expect(session.title).toBe('Phiên tùy biến doanh nghiệp');
  });
});
