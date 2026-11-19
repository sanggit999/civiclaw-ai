import { LegalChunk } from '../ingestion/types.js';
import { KnowledgeGapQueue, normalizeQueryText } from './gap-queue.js';
import { SearchQuery, SearchResponse, SearchResultItem } from './types.js';

const STOP_WORDS = new Set([
  'là', 'và', 'hoặc', 'thì', 'mà', 'của', 'ở', 'tại', 'trong', 'khi',
  'bị', 'được', 'cho', 'về', 'này', 'đó', 'gì', 'bao', 'nhiêu', 'mấy',
  'các', 'những', 'một', 'cái', 'quy', 'định', 'theo'
]);

export class LegalSearchEngine {
  private chunks: LegalChunk[];
  private gapQueue: KnowledgeGapQueue;

  constructor(chunks: LegalChunk[] = [], gapQueue?: KnowledgeGapQueue) {
    this.chunks = chunks;
    this.gapQueue = gapQueue || new KnowledgeGapQueue();
  }

  public getGapQueue(): KnowledgeGapQueue {
    return this.gapQueue;
  }

  public addChunks(newChunks: LegalChunk[]): void {
    this.chunks.push(...newChunks);
  }

  /**
   * Tính điểm tương đồng kết hợp từ khóa pháp lý & độ bao phủ từ vựng
   */
  private scoreChunk(queryWords: string[], queryText: string, chunk: LegalChunk): number {
    const contentLower = chunk.content.toLowerCase();
    const refLower = chunk.fullReference.toLowerCase();

    // 1. Điểm khớp từ khóa chuyên ngành (Keywords score)
    let keywordHits = 0;
    if (chunk.keywords && chunk.keywords.length > 0) {
      for (const kw of chunk.keywords) {
        if (queryText.includes(kw.toLowerCase())) {
          keywordHits++;
        }
      }
    }
    const keywordScore = chunk.keywords && chunk.keywords.length > 0
      ? Math.min(1.0, keywordHits / Math.min(3, chunk.keywords.length))
      : 0;

    // 2. Điểm bao phủ từ tố (Word coverage score)
    let matchedWords = 0;
    for (const word of queryWords) {
      if (contentLower.includes(word) || refLower.includes(word)) {
        matchedWords++;
      }
    }
    const wordCoverage = queryWords.length > 0 ? matchedWords / queryWords.length : 0;

    // 3. Khớp cụm từ chính xác (Exact phrase bonus)
    let phraseBonus = 0;
    if (queryText.length > 10 && contentLower.includes(queryText)) {
      phraseBonus = 0.3;
    }

    // Tổng hợp điểm tin cậy: Keyword 40%, Word Coverage 50%, Phrase Bonus 10%
    const totalScore = Math.min(1.0, keywordScore * 0.4 + wordCoverage * 0.5 + phraseBonus);
    return Math.round(totalScore * 100) / 100;
  }

  /**
   * Tìm kiếm điều luật kèm cơ chế Fallback Guard chống ảo giác
   */
  public search(query: SearchQuery): SearchResponse {
    const threshold = query.confidenceThreshold ?? 0.65;
    const limit = query.limit ?? 5;
    const rawText = query.text.trim();

    const normalized = normalizeQueryText(rawText);
    const meaningfulWords = normalized
      .split(' ')
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

    // Lọc theo domain nếu có yêu cầu
    const candidateChunks = query.domain
      ? this.chunks.filter((c) => c.domain === query.domain)
      : this.chunks;

    // Chấm điểm từng chunk
    const scoredResults: SearchResultItem[] = [];

    for (const chunk of candidateChunks) {
      const score = this.scoreChunk(meaningfulWords, normalized, chunk);
      if (score > 0) {
        scoredResults.push({ chunk, score });
      }
    }

    // Sắp xếp điểm giảm dần
    scoredResults.sort((a, b) => b.score - a.score);

    const topScore = scoredResults.length > 0 ? scoredResults[0].score : 0;

    // KIỂM TRA BỘ LỌC NGƯỠNG TIN CẬY (CONFIDENCE GUARD)
    if (topScore >= threshold) {
      return {
        isFound: true,
        topScore,
        results: scoredResults.slice(0, limit),
        message: 'Tìm thấy căn cứ pháp lý phù hợp trong kho văn bản.',
        loggedToKnowledgeGap: false,
      };
    }

    // FALLBACK GUARD KÍCH HOẠT: Không đủ tin cậy, chặn ảo giác và ghi nhận vào Knowledge Gap Queue
    this.gapQueue.logQuery(rawText);

    return {
      isFound: false,
      topScore,
      results: [],
      message:
        'Hệ thống chưa tìm thấy căn cứ pháp lý trong 5 bộ luật hiện hành để trả lời câu hỏi này một cách chính xác tuyệt đối. ' +
        'Câu hỏi đã được tự động ghi nhận vào hàng đợi để Quản trị viên cập nhật bổ sung văn bản luật.',
      loggedToKnowledgeGap: true,
    };
  }
}
