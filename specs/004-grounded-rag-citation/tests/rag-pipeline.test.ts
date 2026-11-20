import { describe, it, expect, beforeEach } from 'vitest';
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
import { ILegalRetriever, IGapRecorder } from '../../../src/rag/types.js';

describe('Grounded Legal RAG Pipeline (Slice 3)', () => {
  const sampleChunks: LegalChunk[] = [
    {
      id: '168_2024_ND-CP_Điều_6_Khoản_3_Điểm_đ',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 6',
      clause: 'Khoản 3',
      point: 'Điểm đ',
      fullReference: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
      content:
        'Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe mô tô, xe gắn máy không chấp hành hiệu lệnh của đèn tín hiệu giao thông (vượt đèn đỏ hoặc đèn vàng).',
      keywords: ['vượt đèn đỏ', 'xe máy', 'mức phạt'],
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

  let mockRetriever: ILegalRetriever;
  let mockGapRecorder: IGapRecorder;
  let recordedGaps: { query: string; domain?: string }[];
  let mockLlm: MockLlmProvider;
  let verifier: RegexCitationVerifier;

  beforeEach(() => {
    recordedGaps = [];
    mockGapRecorder = {
      async recordQuery(queryText: string, domainGuess?: string) {
        recordedGaps.push({ query: queryText, domain: domainGuess });
        return { id: 'gap-1' };
      },
    };

    mockLlm = new MockLlmProvider();
    verifier = new RegexCitationVerifier();
  });

  it('Happy Path: Trả lời có căn cứ và kiểm chứng trích dẫn hợp lệ khi topScore >= 0.65', async () => {
    mockRetriever = {
      async search() {
        return {
          topScore: 0.92,
          results: [{ chunk: sampleChunks[0], score: 0.92 }],
        };
      },
    };

    mockLlm.setCannedResponse(
      'vượt đèn đỏ',
      'Theo Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP, người điều khiển xe mô tô vượt đèn đỏ bị phạt tiền từ 400.000 đồng đến 600.000 đồng.'
    );

    const pipeline = new GroundedRagPipeline(
      mockRetriever,
      mockGapRecorder,
      mockLlm,
      verifier
    );

    const response = await pipeline.query({
      query: 'Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?',
      domain: 'TRAFFIC',
    });

    expect(response.fallbackTriggered).toBe(false);
    expect(response.isGrounded).toBe(true);
    expect(response.confidenceScore).toBe(0.92);
    expect(response.answer).toContain('400.000 đồng đến 600.000 đồng');
    expect(response.citations).toHaveLength(1);
    expect(response.citations[0].fullReference).toContain('Điều 6 Nghị định 168/2024/NĐ-CP');
    expect(response.verifiedSources).toHaveLength(1);
    expect(recordedGaps).toHaveLength(0); // Không ghi nhận gap vì đã tìm thấy luật
  });

  it('Honest Fallback Gate: Tuyệt đối KHÔNG gọi LLM khi topScore < 0.65 và tự động ghi gap', async () => {
    mockRetriever = {
      async search() {
        return {
          topScore: 0.35, // Thấp hơn ngưỡng 0.65
          results: [{ chunk: sampleChunks[0], score: 0.35 }],
        };
      },
    };

    const pipeline = new GroundedRagPipeline(
      mockRetriever,
      mockGapRecorder,
      mockLlm,
      verifier
    );

    const response = await pipeline.query({
      query: 'Thủ tục thành lập công ty hàng không?',
      domain: 'OTHER',
    });

    // 1. Phải kích hoạt fallback
    expect(response.fallbackTriggered).toBe(true);
    expect(response.isGrounded).toBe(false);
    expect(response.answer).toContain('THÔNG BÁO VỀ CĂN CỨ PHÁP LÝ');

    // 2. LLM không bao giờ được gọi đến (Tiết kiệm token & chống bịa đặt 100%)
    expect(mockLlm.callHistory).toHaveLength(0);

    // 3. Tự động ghi nhận câu hỏi vào khoảng trống tri thức
    expect(recordedGaps).toHaveLength(1);
    expect(recordedGaps[0].query).toBe('Thủ tục thành lập công ty hàng không?');
    expect(recordedGaps[0].domain).toBe('OTHER');
  });

  it('Anti-Hallucination Guard: Phát hiện LLM bịa đặt trích dẫn không có trong context', async () => {
    mockRetriever = {
      async search() {
        return {
          topScore: 0.88,
          results: [{ chunk: sampleChunks[0], score: 0.88 }],
        };
      },
    };

    // LLM bịa ra Điều 999 Nghị định 999/2099/NĐ-CP
    mockLlm.setCannedResponse(
      'đèn đỏ',
      'Theo Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP và Điều 999 Nghị định 999/2099/NĐ-CP, mức phạt là 10 triệu đồng.'
    );

    const pipeline = new GroundedRagPipeline(
      mockRetriever,
      mockGapRecorder,
      mockLlm,
      verifier
    );

    const response = await pipeline.query({
      query: 'đèn đỏ',
      domain: 'TRAFFIC',
    });

    expect(response.fallbackTriggered).toBe(false);
    expect(response.isGrounded).toBe(false); // Phát hiện ảo giác
    expect(response.unverifiedCitations).toBeDefined();
    expect(response.unverifiedCitations).toHaveLength(1);
    expect(response.unverifiedCitations![0]).toContain('Điều 999');
  });

  it('Tích hợp trơn tru với LegalSearchEngine và KnowledgeGapQueue qua Adapter', async () => {
    const gapQueue = new KnowledgeGapQueue();
    const searchEngine = new LegalSearchEngine(sampleChunks, gapQueue);

    const retriever = createRetrieverFromSearchEngine(searchEngine);
    const gapRecorder = createGapRecorderFromQueue(gapQueue);

    mockLlm.setCannedResponse(
      'vượt đèn đỏ',
      'Theo Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP, mức phạt đối với xe máy là 400.000 đến 600.000 đồng.'
    );

    const pipeline = new GroundedRagPipeline(
      retriever,
      gapRecorder,
      mockLlm,
      verifier
    );

    // Câu hỏi có trong dữ liệu
    const hitResponse = await pipeline.query({
      query: 'Mức phạt vượt đèn đỏ xe máy',
      domain: 'TRAFFIC',
    });

    expect(hitResponse.fallbackTriggered).toBe(false);
    expect(hitResponse.isGrounded).toBe(true);

    // Câu hỏi ngoài phạm vi 5 bộ luật
    const missResponse = await pipeline.query({
      query: 'Quy định về thuế tiền điện tử Bitcoin?',
    });

    expect(missResponse.fallbackTriggered).toBe(true);
    expect(gapQueue.getStats().unreviewed).toBe(1);
  });

  it('LLM Failure Recovery: Tự động trích xuất trực tiếp từ DB khi LLM gặp sự cố (429 Hết Quota / Lỗi mạng)', async () => {
    mockRetriever = {
      async search() {
        return {
          topScore: 0.90,
          results: [{ chunk: sampleChunks[0], score: 0.90 }],
        };
      },
    };

    // Mô phỏng LLM Provider bị lỗi 429 Quota Exceeded hoặc rớt mạng
    const failingLlm = {
      async generate(): Promise<any> {
        throw new Error('Gemini API Error (429): Resource has been exhausted (e.g. check quota)');
      },
    };

    const pipeline = new GroundedRagPipeline(
      mockRetriever,
      mockGapRecorder,
      failingLlm,
      verifier
    );

    const response = await pipeline.query({
      query: 'Vượt đèn đỏ xe máy phạt bao nhiêu?',
      domain: 'TRAFFIC',
    });

    // 1. Ứng dụng KHÔNG bị crash, không throw error
    expect(response.fallbackTriggered).toBe(false);
    expect(response.degradedMode).toBe(true); // Kích hoạt chế độ suy giảm mềm dẻo
    expect(response.isGrounded).toBe(true); // Vẫn bảo đảm 100% căn cứ từ DB

    // 2. Nội dung trả lời chứa thông báo chuyển đổi và trích nguyên văn điều luật từ DB
    expect(response.answer).toContain('TRÍCH XUẤT NGUYÊN VĂN TỪ CƠ SỞ DỮ LIỆU PHÁP LUẬT CHÍNH THỨC');
    expect(response.answer).toContain('Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP');
    expect(response.answer).toContain('Phạt tiền từ 400.000 đồng đến 600.000 đồng');

    // 3. Trích dẫn pháp lý được tự động gắn từ chính context chunks của DB
    expect(response.citations).toHaveLength(1);
    expect(response.citations[0].fullReference).toBe('Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP');
    expect(response.citations[0].isVerified).toBe(true);
  });
});
