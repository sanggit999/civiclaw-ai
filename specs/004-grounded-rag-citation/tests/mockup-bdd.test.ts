import { describe, it, expect } from 'vitest';
import { LegalChunk } from '../../../src/ingestion/types.js';
import { MockLlmProvider } from '../../../src/rag/mock-llm-provider.js';
import { RegexCitationVerifier } from '../../../src/rag/citation-verifier.js';
import {
  GroundedRagPipeline,
  createRetrieverFromSearchEngine,
  createGapRecorderFromQueue,
} from '../../../src/rag/pipeline.js';
import { LegalSearchEngine } from '../../../src/search/engine.js';
import { KnowledgeGapQueue } from '../../../src/search/gap-queue.js';
import { GeminiLlmProvider } from '../../../src/rag/gemini-llm-provider.js';

describe('BDD Scenarios: Grounded Legal RAG & Transparent Citation (Slice 4)', () => {
  const sampleLawChunks: LegalChunk[] = [
    {
      id: '168_2024_ND-CP_Điều_6_Khoản_3_Điểm_đ',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 6',
      clause: 'Khoản 3',
      point: 'Điểm đ',
      fullReference: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
      content:
        'Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe mô tô, xe gắn máy (kể cả xe máy điện) không chấp hành hiệu lệnh của đèn tín hiệu giao thông (vượt đèn đỏ hoặc vượt đèn vàng).',
      keywords: ['vượt đèn đỏ', 'xe máy', 'mức phạt', 'đèn tín hiệu'],
    },
    {
      id: '36_2024_QH15_Điều_47_Khoản_1',
      docNumber: '36/2024/QH15',
      domain: 'TRAFFIC',
      article: 'Điều 47',
      clause: 'Khoản 1',
      fullReference: 'Khoản 1 Điều 47 Luật Trật tự, an toàn giao thông đường bộ 2024',
      content: 'Người tham gia giao thông đường bộ phải chấp hành hiệu lệnh của đèn tín hiệu giao thông.',
      keywords: ['tín hiệu đèn', 'hiệu lệnh'],
    },
  ];

  /**
   * KỊCH BẢN 1: Trả lời có trích dẫn chuẩn hóa khi có dữ liệu (Happy Path Vượt đèn đỏ)
   */
  it('Kịch bản 1: Người dùng hỏi vấn đề có trong luật -> Trả lời 3 phần và trích dẫn chuẩn hóa', async () => {
    const gapQueue = new KnowledgeGapQueue();
    const searchEngine = new LegalSearchEngine(sampleLawChunks, gapQueue);
    const mockLlm = new MockLlmProvider();
    const verifier = new RegexCitationVerifier();

    const pipeline = new GroundedRagPipeline(
      createRetrieverFromSearchEngine(searchEngine),
      createGapRecorderFromQueue(gapQueue),
      mockLlm,
      verifier
    );

    mockLlm.setCannedResponse(
      'vượt đèn đỏ',
      `📌 KẾT LUẬN NHANH:
Hành vi vượt đèn đỏ khi điều khiển xe mô tô, xe gắn máy bị xử phạt từ 400.000 đồng đến 600.000 đồng.

⚖️ PHÂN TÍCH CHI TIẾT:
Theo quy định, người điều khiển xe mô tô không chấp hành hiệu lệnh của đèn tín hiệu giao thông sẽ bị xử phạt tiền theo khung trên. Đồng thời người tham gia giao thông có nghĩa vụ chấp hành nghiêm chỉnh tín hiệu đèn đường bộ.

📚 CĂN CỨ PHÁP LÝ:
- Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP
- Khoản 1 Điều 47 Luật Trật tự, an toàn giao thông đường bộ 2024`
    );

    const result = await pipeline.query({
      query: 'Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?',
      domain: 'TRAFFIC',
    });

    // Nghiệm thu theo BDD Criteria
    expect(result.fallbackTriggered).toBe(false);
    expect(result.isGrounded).toBe(true);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.65);
    expect(result.answer).toContain('📌 KẾT LUẬN NHANH');
    expect(result.answer).toContain('⚖️ PHÂN TÍCH CHI TIẾT');
    expect(result.answer).toContain('📚 CĂN CỨ PHÁP LÝ');

    // Kiểm tra danh mục trích dẫn đã được kiểm chứng
    expect(result.citations).toHaveLength(2);
    expect(result.citations.every((c) => c.isVerified)).toBe(true);
    expect(result.unverifiedCitations).toBeUndefined();
    expect(gapQueue.getAll()).toHaveLength(0); // Không ghi gap vì đã tìm thấy luật
  });

  /**
   * KỊCH BẢN 2: Kích hoạt Honest Fallback Guard khi thiếu căn cứ
   */
  it('Kịch bản 2: Người dùng hỏi câu hỏi ngoài phạm vi 5 bộ luật -> Không gọi LLM & ghi nhận Gap', async () => {
    const gapQueue = new KnowledgeGapQueue();
    const searchEngine = new LegalSearchEngine(sampleLawChunks, gapQueue);
    const mockLlm = new MockLlmProvider();
    const verifier = new RegexCitationVerifier();

    const pipeline = new GroundedRagPipeline(
      createRetrieverFromSearchEngine(searchEngine),
      createGapRecorderFromQueue(gapQueue),
      mockLlm,
      verifier
    );

    const question = 'Quy định pháp lý về giao dịch mua bán Bitcoin và tiền điện tử?';
    const result = await pipeline.query({
      query: question,
      domain: 'OTHER',
    });

    // Nghiệm thu theo BDD Criteria
    expect(result.fallbackTriggered).toBe(true);
    expect(result.isGrounded).toBe(false);
    expect(result.answer).toContain('THÔNG BÁO VỀ CĂN CỨ PHÁP LÝ');
    expect(result.citations).toHaveLength(0);

    // LLM tuyệt đối không được gọi đến (Tiết kiệm token, 0 rủi ro ảo giác)
    expect(mockLlm.callHistory).toHaveLength(0);

    // Tự động ghi vào Knowledge Gap Queue
    const gaps = gapQueue.getAll();
    expect(gaps).toHaveLength(1);
    expect(gaps[0].queryText).toBe(question);
    expect(gaps[0].status).toBe('unreviewed');
  });

  /**
   * KỊCH BẢN 3: Chốt chặn phát hiện và ngăn ngừa trích dẫn ma (Citation Verification)
   */
  it('Kịch bản 3: LLM bịa đặt trích dẫn không có trong context -> Gắn cờ isGrounded = false', async () => {
    const gapQueue = new KnowledgeGapQueue();
    const searchEngine = new LegalSearchEngine(sampleLawChunks, gapQueue);
    const mockLlm = new MockLlmProvider();
    const verifier = new RegexCitationVerifier();

    const pipeline = new GroundedRagPipeline(
      createRetrieverFromSearchEngine(searchEngine),
      createGapRecorderFromQueue(gapQueue),
      mockLlm,
      verifier
    );

    // LLM bịa thêm Điều 999 Nghị định 999/2099/NĐ-CP
    mockLlm.setCannedResponse(
      'đèn đỏ',
      `Theo Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP và Điều 999 Nghị định 999/2099/NĐ-CP, mức phạt là 5 triệu đồng.`
    );

    const result = await pipeline.query({
      query: 'Mức phạt vượt đèn đỏ xe máy',
      domain: 'TRAFFIC',
    });

    expect(result.fallbackTriggered).toBe(false);
    expect(result.isGrounded).toBe(false); // Phát hiện trích dẫn ma!
    expect(result.unverifiedCitations).toBeDefined();
    expect(result.unverifiedCitations).toHaveLength(1);
    expect(result.unverifiedCitations![0]).toContain('Điều 999');
  });

  /**
   * KỊCH BẢN 4: Chạy kiểm thử độc lập 100% Offline với Mock LLM Provider
   */
  it('Kịch bản 4: Vận hành kiểm thử hoàn toàn Offline với Mock LLM Provider', async () => {
    const start = performance.now();
    const mockLlm = new MockLlmProvider();
    mockLlm.setCannedResponse('thử nghiệm', 'Câu trả lời offline nhanh chóng.');

    const res = await mockLlm.generate('thử nghiệm hỏi đáp');
    const elapsed = performance.now() - start;

    expect(res.text).toBe('Câu trả lời offline nhanh chóng.');
    expect(elapsed).toBeLessThan(50); // Phải hoàn thành dưới 50ms
  });

  /**
   * KỊCH BẢN 5: Gemini LLM Provider gửi đúng định dạng REST API qua native fetch
   */
  it('Kịch bản 5: GeminiLlmProvider gửi request hợp lệ và trích xuất đúng response', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;

    const mockFetch: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body));

      return {
        ok: true,
        status: 200,
        async json() {
          return {
            candidates: [
              {
                content: {
                  parts: [{ text: 'Phản hồi giả lập từ Gemini API' }],
                },
              },
            ],
            usageMetadata: {
              totalTokenCount: 120,
            },
          };
        },
      } as any;
    };

    const gemini = new GeminiLlmProvider({
      apiKey: 'test-api-key-123',
      fetchFn: mockFetch,
    });

    const result = await gemini.generate('Xin chào', {
      systemInstruction: 'Bạn là chuyên gia',
      temperature: 0.1,
    });

    expect(result.text).toBe('Phản hồi giả lập từ Gemini API');
    expect(result.tokensUsed).toBe(120);
    expect(capturedUrl).toContain('key=test-api-key-123');
    expect(capturedUrl).toContain('gemini-3.8-flash');
    expect(capturedBody.systemInstruction.parts[0].text).toBe('Bạn là chuyên gia');
    expect(capturedBody.contents[0].parts[0].text).toBe('Xin chào');
    expect(capturedBody.generationConfig.temperature).toBe(0.1);
  });
});
