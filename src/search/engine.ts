import { LegalChunk } from '../ingestion/types.js';
import { KnowledgeGapQueue, normalizeQueryText, removeVietnameseDiacritics } from './gap-queue.js';
import { SearchQuery, SearchResponse, SearchResultItem } from './types.js';

const STOP_WORDS = new Set([
  'là', 'và', 'hoặc', 'thì', 'mà', 'của', 'ở', 'tại', 'trong', 'khi',
  'bị', 'được', 'cho', 'về', 'này', 'đó', 'gì', 'bao', 'nhiêu', 'mấy',
  'các', 'những', 'một', 'cái', 'quy', 'định', 'theo'
]);

/**
 * Trích xuất danh sách cụm 2 từ (Bigrams) phục vụ so khớp từ ghép tiếng Việt
 */
function extractBigrams(words: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }
  return bigrams;
}

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
   * Tính điểm tương đồng kết hợp:
   * 1. Từ khóa chuyên ngành (Keywords: 25%)
   * 2. Độ bao phủ từ đơn (Unigram Word Coverage: 35% - hỗ trợ tiếng Việt không dấu)
   * 3. Độ bao phủ cụm từ ghép (Bigram Phrase Coverage: 40% - phân biệt chuẩn xác hành vi)
   * 4. Điểm thưởng khi tra đích danh Điều luật & Số hiệu (Citation Booster)
   */
  private scoreChunk(
    queryWords: string[],
    queryBigrams: string[],
    queryText: string,
    chunk: LegalChunk
  ): number {
    const contentLower = chunk.content.toLowerCase();
    const refLower = chunk.fullReference.toLowerCase();
    const unaccentedContent = removeVietnameseDiacritics(contentLower);
    const unaccentedRef = removeVietnameseDiacritics(refLower);
    const unaccentedQuery = removeVietnameseDiacritics(queryText);

    // 1. Điểm khớp từ khóa chuyên ngành (Keywords score)
    let keywordHits = 0;
    if (chunk.keywords && chunk.keywords.length > 0) {
      for (const kw of chunk.keywords) {
        const kwLower = kw.toLowerCase();
        const unaccentedKw = removeVietnameseDiacritics(kwLower);
        if (queryText.includes(kwLower) || unaccentedQuery.includes(unaccentedKw)) {
          keywordHits++;
        }
      }
    }
    const keywordScore = Math.min(1.0, keywordHits * 0.4);

    // 2. Điểm bao phủ từ đơn (Unigram Word Coverage - hỗ trợ tiếng Việt không dấu)
    let matchedWords = 0;
    for (const word of queryWords) {
      const unaccentedWord = removeVietnameseDiacritics(word);
      const matchedWithAccent = contentLower.includes(word) || refLower.includes(word);
      const matchedWithoutAccent =
        unaccentedContent.includes(unaccentedWord) || unaccentedRef.includes(unaccentedWord);

      if (matchedWithAccent || matchedWithoutAccent) {
        matchedWords++;
      }
    }
    const wordCoverage = queryWords.length > 0 ? matchedWords / queryWords.length : 0;

    // 3. Điểm bao phủ từ ghép (Bigram Phrase Coverage - phân biệt chính xác cụm danh từ)
    let matchedBigrams = 0;
    if (queryBigrams.length > 0) {
      for (const bigram of queryBigrams) {
        const unaccentedBigram = removeVietnameseDiacritics(bigram);
        const matchedWithAccent = contentLower.includes(bigram) || refLower.includes(bigram);
        const matchedWithoutAccent =
          unaccentedContent.includes(unaccentedBigram) || unaccentedRef.includes(unaccentedBigram);

        if (matchedWithAccent || matchedWithoutAccent) {
          matchedBigrams++;
        }
      }
    }
    const bigramCoverage = queryBigrams.length > 0 ? matchedBigrams / queryBigrams.length : wordCoverage;

    // Điểm nền tảng kết hợp (Base Score)
    const baseScore = keywordScore * 0.25 + wordCoverage * 0.35 + bigramCoverage * 0.40;

    // 4. Khớp đích danh Điều luật & Số hiệu văn bản (Citation Booster)
    let citationBonus = 0;
    const articleMatch =
      queryText.match(/(?:điều|dieu)\s+(\d+)/i) || unaccentedQuery.match(/dieu\s+(\d+)/i);
    if (articleMatch) {
      const requestedArticle = `Điều ${articleMatch[1]}`.toLowerCase();
      if (chunk.article.toLowerCase() === requestedArticle) {
        citationBonus += 0.35;
      }
    }

    if (chunk.docNumber && queryText.includes(chunk.docNumber.toLowerCase())) {
      citationBonus += 0.15;
    }

    const totalScore = Math.min(1.0, baseScore + citationBonus);
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

    // BỘ LỌC KIỂM TRA DỮ LIỆU ĐẦU VÀO (INPUT VALIDATION GUARD)
    // Chặn câu hỏi rỗng hoặc chỉ toàn dấu câu/khoảng trắng, không ghi rác vào Knowledge Gap Queue
    if (!rawText || rawText.length < 3 || meaningfulWords.length === 0) {
      return {
        isFound: false,
        topScore: 0,
        results: [],
        message: 'Vui lòng nhập câu hỏi pháp lý cụ thể hơn để hệ thống tra cứu chính xác.',
        loggedToKnowledgeGap: false,
      };
    }

    const queryBigrams = extractBigrams(meaningfulWords);

    // Lọc theo domain nếu có yêu cầu
    const candidateChunks = query.domain
      ? this.chunks.filter((c) => c.domain === query.domain)
      : this.chunks;

    // Chấm điểm từng chunk
    const scoredResults: SearchResultItem[] = [];

    for (const chunk of candidateChunks) {
      const score = this.scoreChunk(meaningfulWords, queryBigrams, normalized, chunk);
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
