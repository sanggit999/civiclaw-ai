import { LegalChunk, LegalDomain } from '../ingestion/types.js';
import {
  IRagPipeline,
  ILegalRetriever,
  IGapRecorder,
  ILlmProvider,
  ICitationVerifier,
  RagQueryRequest,
  RagQueryResponse,
  RagPipelineConfig,
} from './types.js';
import {
  DEFAULT_RAG_CONFIG,
  buildGroundedPrompt,
  buildExtractiveFallbackAnswer,
} from './prompt-builder.js';
import { LegalSearchEngine } from '../search/engine.js';
import { KnowledgeGapQueue } from '../search/gap-queue.js';
import { ExtendedDomain } from '../search/types.js';
import { SupabaseLegalRepository } from '../storage/supabase-legal-repo.js';
import { SupabaseGapRepository } from '../storage/supabase-gap-repo.js';

/**
 * Pipeline RAG Pháp lý có kiểm chứng dẫn nguồn (GroundedRagPipeline)
 * Triển khai kiến trúc phòng vệ 3 lớp (Triple-Layer Anti-Hallucination Guard):
 * - Lớp 1 (Pre-LLM Confidence Gate): Chặn gọi LLM nếu độ khớp truy xuất < ngưỡng tin cậy.
 * - Lớp 2 (Strict Grounding Prompt): Ép LLM chỉ trả lời dựa trên context chunks được cung cấp.
 * - Lớp 3 (Post-LLM Citation Verifier): Đối soát chéo từng trích dẫn trong câu trả lời với context.
 */
export class GroundedRagPipeline implements IRagPipeline {
  private config: RagPipelineConfig;

  constructor(
    private retriever: ILegalRetriever,
    private gapRecorder: IGapRecorder,
    private llmProvider: ILlmProvider,
    private citationVerifier: ICitationVerifier,
    customConfig?: Partial<RagPipelineConfig>
  ) {
    this.config = {
      ...DEFAULT_RAG_CONFIG,
      ...customConfig,
    };
  }

  /**
   * Xử lý truy vấn hỏi đáp pháp lý từ người dùng
   */
  async query(request: RagQueryRequest): Promise<RagQueryResponse> {
    const threshold = request.confidenceThreshold ?? this.config.defaultConfidenceThreshold;
    const topK = request.topK ?? this.config.defaultTopK;

    // 1. Truy xuất các căn cứ pháp lý liên quan từ kho dữ liệu
    const searchResult = await this.retriever.search(request.query, {
      domain: request.domain,
      limit: topK,
    });

    const topScore = searchResult.topScore;
    const matchedItems = searchResult.results;

    // =========================================================================
    // LỚP 1: Chốt chặn tin cậy trước LLM (Pre-LLM Confidence Gate)
    // Nếu không tìm thấy căn cứ hoặc điểm tin cậy < 0.65 -> TUYỆT ĐỐI KHÔNG GỌI LLM
    // =========================================================================
    if (topScore < threshold || matchedItems.length === 0) {
      // Tự động ghi nhận câu hỏi chưa có căn cứ vào hàng đợi để quản trị viên bổ sung luật
      try {
        await this.gapRecorder.recordQuery(request.query, request.domain ?? 'OTHER');
      } catch (gapError) {
        // Phòng vệ sự cố mạng/DB: Không làm sập request người dùng nếu ghi gap thất bại
        console.warn('[GroundedRagPipeline] Ghi nhận khoảng trống tri thức thất bại:', gapError);
      }

      return {
        answer: this.config.fallbackMessage,
        isGrounded: false,
        confidenceScore: topScore,
        citations: [],
        verifiedSources: [],
        fallbackTriggered: true,
      };
    }

    const contextChunks = matchedItems.map((item) => item.chunk);

    // =========================================================================
    // LỚP 2: Tạo Prompt ràng buộc căn cứ chặt chẽ (Strict Grounding Prompt)
    // =========================================================================
    const promptData = buildGroundedPrompt(request.query, contextChunks, this.config);

    let llmText = '';
    let isDegraded = false;

    try {
      // Gọi mô hình ngôn ngữ lớn để tổng hợp câu trả lời
      const llmResult = await this.llmProvider.generate(promptData.prompt, {
        systemInstruction: promptData.systemInstruction,
      });
      llmText = llmResult.text;
    } catch (llmError) {
      // =======================================================================
      // PHÒNG VỆ SỰ CỐ LLM (429 Quota Exceeded / 503 / Network Error):
      // Khi LLM gặp sự cố, kích hoạt Chế độ Trích xuất Nguyên văn từ Database
      // =======================================================================
      console.warn(
        '[GroundedRagPipeline] LLM Provider gặp sự cố, kích hoạt Extractive Grounded Fallback từ Database:',
        llmError
      );
      llmText = buildExtractiveFallbackAnswer(contextChunks, this.config.extractiveFallbackNotice);
      isDegraded = true;
    }

    // =========================================================================
    // LỚP 3: Chốt chặn kiểm chứng trích dẫn sau LLM (Post-LLM Citation Verifier)
    // =========================================================================
    const verification = isDegraded
      ? {
          isValid: true,
          verifiedCitations: contextChunks.map((c) => ({
            fullReference: c.fullReference,
            article: c.article,
            clause: c.clause,
            point: c.point,
            docNumber: c.docNumber,
            isVerified: true,
          })),
          unverifiedCitations: [],
        }
      : this.citationVerifier.verify(llmText, contextChunks);

    return {
      answer: llmText,
      isGrounded: verification.isValid,
      confidenceScore: topScore,
      citations: verification.verifiedCitations,
      verifiedSources: contextChunks,
      fallbackTriggered: false,
      degradedMode: isDegraded,
      unverifiedCitations:
        verification.unverifiedCitations.length > 0
          ? verification.unverifiedCitations
          : undefined,
    };
  }

  /**
   * Bí danh tương thích cho phương thức query
   */
  async answer(request: RagQueryRequest): Promise<RagQueryResponse> {
    return this.query(request);
  }
}

// =============================================================================
// CÁC HÀM ADAPTER KẾT NỐI (Adapters for Storage & In-Memory Engines)
// =============================================================================

/**
 * Adapter chuyển đổi LegalSearchEngine (In-memory) thành ILegalRetriever
 */
export function createRetrieverFromSearchEngine(engine: LegalSearchEngine): ILegalRetriever {
  return {
    async search(queryText: string, options?: { domain?: string; limit?: number }) {
      const response = engine.search({
        text: queryText,
        domain: options?.domain as LegalDomain | undefined,
        limit: options?.limit,
      });

      return {
        topScore: response.topScore,
        results: response.results,
      };
    },
  };
}

/**
 * Adapter chuyển đổi KnowledgeGapQueue (In-memory) thành IGapRecorder
 */
export function createGapRecorderFromQueue(queue: KnowledgeGapQueue): IGapRecorder {
  return {
    async recordQuery(queryText: string, _domainGuess?: string) {
      return queue.logQuery(queryText);
    },
  };
}

/**
 * Adapter chuyển đổi SupabaseLegalRepository thành ILegalRetriever
 */
export function createRetrieverFromSupabase(repo: SupabaseLegalRepository): ILegalRetriever {
  return {
    async search(queryText: string, options?: { domain?: string; limit?: number }) {
      const items = await repo.search(queryText, {
        domain: options?.domain,
        limit: options?.limit,
      });

      const topScore = items.length > 0 ? items[0].similarity : 0;
      return {
        topScore,
        results: items.map((i) => ({
          chunk: i.chunk,
          score: i.similarity,
        })),
      };
    },
  };
}

/**
 * Adapter chuyển đổi SupabaseGapRepository thành IGapRecorder
 */
export function createGapRecorderFromSupabase(repo: SupabaseGapRepository): IGapRecorder {
  return {
    async recordQuery(queryText: string, domainGuess?: string) {
      return repo.recordQuery(queryText, (domainGuess || 'OTHER') as ExtendedDomain);
    },
  };
}
