import { LegalChunk } from '../ingestion/types.js';
import { KnowledgeGapQueue, normalizeQueryText, removeVietnameseDiacritics } from './gap-queue.js';
import { SearchEngineConfig, SearchQuery, SearchResponse, SearchResultItem } from './types.js';

/**
 * Cấu hình tham số và trọng số chấm điểm mặc định của bộ máy tìm kiếm
 */
export const DEFAULT_SEARCH_CONFIG: SearchEngineConfig = {
  defaultConfidenceThreshold: 0.65,
  defaultLimit: 5,
  minQueryLength: 3,
  weights: {
    keyword: 0.25,               // Trọng số từ khóa chuyên ngành
    unigram: 0.35,               // Trọng số độ bao phủ từ đơn
    bigram: 0.40,                // Trọng số cụm từ ghép 2 từ
    citationArticleBonus: 0.35,  // Điểm thưởng khi tra cứu đích danh Điều luật
    citationDocBonus: 0.15,      // Điểm thưởng khi tra cứu số hiệu văn bản
  },
};

/**
 * Danh mục hư từ tiếng Việt mặc định (Stop words) dùng trong chuẩn hóa NLP
 */
export const DEFAULT_STOP_WORDS = new Set([
  'là', 'và', 'hoặc', 'thì', 'mà', 'của', 'ở', 'tại', 'trong', 'khi',
  'bị', 'được', 'cho', 'về', 'này', 'đó', 'gì', 'bao', 'nhiêu', 'mấy',
  'các', 'những', 'một', 'cái', 'quy', 'định', 'theo'
]);

/**
 * Mẫu thông điệp phản hồi chuẩn hóa cho người dùng
 */
export const SEARCH_MESSAGES = {
  SUCCESS: 'Tìm thấy căn cứ pháp lý phù hợp trong kho văn bản.',
  QUERY_TOO_SHORT: 'Vui lòng nhập câu hỏi pháp lý cụ thể hơn để hệ thống tra cứu chính xác.',
  NOT_FOUND_FALLBACK:
    'Hệ thống chưa tìm thấy căn cứ pháp lý trong 5 bộ luật hiện hành để trả lời câu hỏi này một cách chính xác tuyệt đối. ' +
    'Câu hỏi đã được tự động ghi nhận vào hàng đợi để Quản trị viên cập nhật bổ sung văn bản luật.',
};

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
  private config: SearchEngineConfig;
  private stopWords: Set<string>;

  constructor(
    chunks: LegalChunk[] = [],
    gapQueue?: KnowledgeGapQueue,
    customConfig?: Partial<SearchEngineConfig>,
    customStopWords?: Set<string>
  ) {
    this.chunks = chunks;
    this.gapQueue = gapQueue || new KnowledgeGapQueue();
    this.config = {
      ...DEFAULT_SEARCH_CONFIG,
      ...customConfig,
      weights: {
        ...DEFAULT_SEARCH_CONFIG.weights,
        ...customConfig?.weights,
      },
    };
    this.stopWords = customStopWords || DEFAULT_STOP_WORDS;
  }

  public getGapQueue(): KnowledgeGapQueue {
    return this.gapQueue;
  }

  public getConfig(): SearchEngineConfig {
    return this.config;
  }

  public addChunks(newChunks: LegalChunk[]): void {
    this.chunks.push(...newChunks);
  }

  /**
   * Tính điểm tương đồng kết hợp theo trọng số cấu hình:
   * 1. Từ khóa chuyên ngành (Keywords)
   * 2. Độ bao phủ từ đơn (Unigram Word Coverage - hỗ trợ tiếng Việt không dấu)
   * 3. Độ bao phủ cụm từ ghép (Bigram Phrase Coverage - phân biệt chuẩn xác hành vi)
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

    // Điểm nền tảng kết hợp (Base Score) dựa trên weights cấu hình
    const { weights } = this.config;
    const baseScore =
      keywordScore * weights.keyword +
      wordCoverage * weights.unigram +
      bigramCoverage * weights.bigram;

    // 4. Khớp đích danh Điều luật & Số hiệu văn bản (Citation Booster)
    let citationBonus = 0;
    const articleMatch =
      queryText.match(/(?:điều|dieu)\s+(\d+)/i) || unaccentedQuery.match(/dieu\s+(\d+)/i);
    if (articleMatch) {
      const requestedArticle = `Điều ${articleMatch[1]}`.toLowerCase();
      if (chunk.article.toLowerCase() === requestedArticle) {
        citationBonus += weights.citationArticleBonus;
      }
    }

    if (chunk.docNumber && queryText.includes(chunk.docNumber.toLowerCase())) {
      citationBonus += weights.citationDocBonus;
    }

    const totalScore = Math.min(1.0, baseScore + citationBonus);
    return Math.round(totalScore * 100) / 100;
  }

  /**
   * Tìm kiếm điều luật kèm cơ chế Fallback Guard chống ảo giác
   */
  public search(query: SearchQuery): SearchResponse {
    const threshold = query.confidenceThreshold ?? this.config.defaultConfidenceThreshold;
    const limit = query.limit ?? this.config.defaultLimit;
    const rawText = query.text.trim();

    const normalized = normalizeQueryText(rawText);
    const meaningfulWords = normalized
      .split(' ')
      .filter((w) => w.length >= 2 && !this.stopWords.has(w));

    // BỘ LỌC KIỂM TRA DỮ LIỆU ĐẦU VÀO (INPUT VALIDATION GUARD)
    // Chặn câu hỏi rỗng hoặc ngắn hơn minQueryLength, không ghi rác vào Knowledge Gap Queue
    if (!rawText || rawText.length < this.config.minQueryLength || meaningfulWords.length === 0) {
      return {
        isFound: false,
        topScore: 0,
        results: [],
        message: SEARCH_MESSAGES.QUERY_TOO_SHORT,
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
        message: SEARCH_MESSAGES.SUCCESS,
        loggedToKnowledgeGap: false,
      };
    }

    // FALLBACK GUARD KÍCH HOẠT: Không đủ tin cậy, chặn ảo giác và ghi nhận vào Knowledge Gap Queue
    this.gapQueue.logQuery(rawText);

    return {
      isFound: false,
      topScore,
      results: [],
      message: SEARCH_MESSAGES.NOT_FOUND_FALLBACK,
      loggedToKnowledgeGap: true,
    };
  }
}
