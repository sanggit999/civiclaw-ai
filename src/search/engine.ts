import { LegalChunk } from '../ingestion/types.js';
import {
  DEFAULT_DOMAIN_CATALOG,
  DOCUMENT_TITLE_CATALOG,
  LegalDomainRecord,
  normalizeDomain,
} from '../storage/types.js';
import { KnowledgeGapQueue, normalizeQueryText, removeVietnameseDiacritics } from './gap-queue.js';
import {
  DomainSummaryItem,
  LoadedSearchConfig,
  SearchEngineConfig,
  SearchQuery,
  SearchResponse,
  SearchResultItem,
} from './types.js';

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

export const MAX_SEARCH_LIMIT = 100;
export const DEFAULT_ADMIN_MIN_SCORE = 0.25;
export const DEFAULT_ADMIN_SINGLE_WORD_MIN_SCORE = 0.15;
export const DEFAULT_OOV_WORD_WEIGHT = 1.0;
export const MAX_ADMIN_BIGRAM_DENOMINATOR = 5;

/**
 * Chuẩn hóa số trang / giới hạn kết quả về số nguyên dương an toàn trong biên [1, max]
 */
function toSafePositiveInt(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return Math.min(max, Math.trunc(num));
}

function mergeSearchConfig(
  base: SearchEngineConfig,
  custom?: LoadedSearchConfig
): SearchEngineConfig {
  return {
    ...base,
    ...custom,
    weights: {
      ...base.weights,
      ...custom?.weights,
    },
  };
}

/**
 * Danh mục hư từ tiếng Việt mặc định (Fallback offline khi chưa nạp từ system_configs)
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
  private dfAccented = new Map<string, number>();
  private dfUnaccented = new Map<string, number>();
  private corpusBigrams = new Set<string>();

  constructor(
    chunks: LegalChunk[] = [],
    gapQueue?: KnowledgeGapQueue,
    customConfig?: LoadedSearchConfig,
    customStopWords?: Set<string>
  ) {
    this.chunks = [...chunks];
    this.gapQueue = gapQueue || new KnowledgeGapQueue();
    this.config = mergeSearchConfig(DEFAULT_SEARCH_CONFIG, customConfig);
    this.stopWords = customStopWords || DEFAULT_STOP_WORDS;
    this.rebuildIdfIndex();
  }

  public getGapQueue(): KnowledgeGapQueue {
    return this.gapQueue;
  }

  public getConfig(): SearchEngineConfig {
    return {
      ...this.config,
      weights: { ...this.config.weights },
    };
  }

  public getStopWordsCount(): number {
    return this.stopWords.size;
  }

  /**
   * Cập nhật cấu hình tìm kiếm và bộ từ dừng động khi nạp lại từ system_configs
   */
  public updateConfig(
    customConfig?: LoadedSearchConfig,
    customStopWords?: Set<string>
  ): void {
    if (customConfig) {
      this.config = mergeSearchConfig(this.config, customConfig);
    }
    if (customStopWords) {
      this.stopWords = customStopWords;
    }
  }

  public addChunks(newChunks: LegalChunk[]): void {
    this.chunks.push(...newChunks);
    this.rebuildIdfIndex();
  }

  /**
   * Xây dựng chỉ mục tần suất tài liệu (Auto-IDF & Corpus Bigrams) trực tiếp từ kho chunks
   */
  private rebuildIdfIndex(): void {
    this.dfAccented.clear();
    this.dfUnaccented.clear();
    this.corpusBigrams.clear();

    for (const chunk of this.chunks) {
      const normalized = normalizeQueryText(`${chunk.content} ${chunk.fullReference}`);
      const tokens = normalized.split(' ').filter((w) => w.length >= 2);
      const uniqueAccented = new Set(tokens);
      for (const token of uniqueAccented) {
        this.dfAccented.set(token, (this.dfAccented.get(token) || 0) + 1);
      }

      const unaccentedNormalized = removeVietnameseDiacritics(normalized);
      const unaccentedTokens = unaccentedNormalized.split(' ').filter((w) => w.length >= 2);
      const uniqueUnaccented = new Set(unaccentedTokens);
      for (const token of uniqueUnaccented) {
        this.dfUnaccented.set(token, (this.dfUnaccented.get(token) || 0) + 1);
      }

      for (const bg of extractBigrams(tokens)) {
        this.corpusBigrams.add(bg);
        this.corpusBigrams.add(removeVietnameseDiacritics(bg));
      }
    }
  }

  /**
   * Tính trọng số Auto-IDF cho một từ: từ hiếm trong kho luật nhận trọng số cao,
   * từ phổ thông nhận trọng số thấp, từ ngoài từ điển luật (OOV) nhận trọng số trung tính 1.0.
   */
  public getWordIdfScore(word: string): number {
    const clean = word.trim().toLowerCase();
    if (!clean) return DEFAULT_OOV_WORD_WEIGHT;

    const totalDocs = this.chunks.length;
    if (totalDocs === 0) return DEFAULT_OOV_WORD_WEIGHT;

    const unaccented = removeVietnameseDiacritics(clean);
    const hasAccent = clean !== unaccented;
    const df = hasAccent ? (this.dfAccented.get(clean) || 0) : (this.dfUnaccented.get(clean) || 0);
    if (df === 0) return DEFAULT_OOV_WORD_WEIGHT;

    return Math.log((totalDocs + 1) / (df + 1)) + 1;
  }

  private hasCorpusBigram(bigram: string): boolean {
    return this.corpusBigrams.has(bigram) || this.corpusBigrams.has(removeVietnameseDiacritics(bigram));
  }

  /**
   * Tổng hợp thống kê các lĩnh vực và văn bản thực tế từ kho chunks (Single Source of Truth)
   */
  public getDomainSummary(dbDomains: LegalDomainRecord[] = []): DomainSummaryItem[] {
    const dbMap = new Map<string, LegalDomainRecord>(dbDomains.map((d) => [normalizeDomain(d.code), d]));
    const domainGroups = new Map<string, Map<string, number>>();

    for (const chunk of this.chunks) {
      const code = normalizeDomain(chunk.domain);
      if (!domainGroups.has(code)) {
        domainGroups.set(code, new Map());
      }
      const docMap = domainGroups.get(code)!;
      const docNum = (chunk.docNumber || 'Văn bản Luật').trim();
      docMap.set(docNum, (docMap.get(docNum) || 0) + 1);
    }

    const orderedCodes = Array.from(
      new Set([
        ...Object.keys(DEFAULT_DOMAIN_CATALOG),
        ...dbDomains.map((d) => normalizeDomain(d.code)),
        ...domainGroups.keys(),
      ])
    ).filter((code) => code !== 'OTHER' || domainGroups.has('OTHER'));

    return orderedCodes.map((code) => {
      const dbMeta = dbMap.get(code);
      const catalogMeta = DEFAULT_DOMAIN_CATALOG[code];
      const docMap = domainGroups.get(code);
      const documents = docMap
        ? Array.from(docMap.entries()).map(([docNumber, chunkCount]) => ({
            docNumber,
            title: DOCUMENT_TITLE_CATALOG[docNumber] || docNumber,
            chunkCount,
          }))
        : [];
      const chunkCount = documents.reduce((sum, d) => sum + d.chunkCount, 0);

      return {
        code,
        name: dbMeta?.name || catalogMeta?.name || code,
        description: dbMeta?.description || catalogMeta?.description,
        chunkCount,
        documents,
      };
    });
  }

  /**
   * Tính điểm tương đồng kết hợp theo trọng số cấu hình:
   * 1. Từ khóa chuyên ngành (Keywords)
   * 2. Độ bao phủ từ đơn (Unigram Word Coverage - hỗ trợ tiếng Việt không dấu)
   * 3. Độ bao phủ cụm từ ghép (Bigram Phrase Coverage - phân biệt chuẩn xác hành vi)
   * 4. Điểm thưởng khi tra đích danh Điều luật & Số hiệu (Citation Booster)
   * Khi isAdminMode=true: chuẩn hóa mẫu số cho câu tranh chấp dài để không bị tụt điểm oan.
   */
  private scoreChunk(
    queryWords: string[],
    queryBigrams: string[],
    queryText: string,
    chunk: LegalChunk,
    isAdminMode = false
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

    // 2. Điểm bao phủ từ đơn theo trọng số Auto-IDF (từ hiếm nặng hơn từ phổ thông)
    let matchedWordIdf = 0;
    let totalWordIdf = 0;
    for (const word of queryWords) {
      const idf = this.getWordIdfScore(word);
      totalWordIdf += idf;

      const unaccentedWord = removeVietnameseDiacritics(word);
      const matchedWithAccent = contentLower.includes(word) || refLower.includes(word);
      const matchedWithoutAccent =
        unaccentedContent.includes(unaccentedWord) || unaccentedRef.includes(unaccentedWord);

      if (matchedWithAccent || matchedWithoutAccent) {
        matchedWordIdf += idf;
      }
    }
    const wordCoverage = totalWordIdf > 0 ? Math.min(1.0, matchedWordIdf / totalWordIdf) : 0;

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
    let effectiveBigramsCount = queryBigrams.length;
    if (isAdminMode && queryBigrams.length > 0) {
      const corpusMatchCount = queryBigrams.filter((b) => this.hasCorpusBigram(b)).length;
      if (corpusMatchCount >= 2) {
        effectiveBigramsCount = corpusMatchCount;
      }
    }
    const bigramDenominator =
      isAdminMode && effectiveBigramsCount > MAX_ADMIN_BIGRAM_DENOMINATOR
        ? Math.min(effectiveBigramsCount, MAX_ADMIN_BIGRAM_DENOMINATOR)
        : effectiveBigramsCount;
    const bigramCoverage =
      bigramDenominator > 0 ? Math.min(1.0, matchedBigrams / bigramDenominator) : wordCoverage;

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
   * Tìm kiếm điều luật kèm hỗ trợ Browse Mode (Admin) & Fallback Guard (Citizen)
   * Hỗ trợ cả 2 signature: search(query: SearchQuery) và search(queryText: string, options?: SearchOptions)
   */
  public search(query: SearchQuery | string, options?: Partial<SearchQuery>): SearchResponse {
    const queryObj: SearchQuery =
      typeof query === 'string'
        ? { text: query, ...options }
        : query || { text: '' };

    const mode = queryObj.mode === 'admin' ? 'admin' : 'citizen';
    const isAdminMode = mode === 'admin';
    const threshold = queryObj.confidenceThreshold ?? this.config.defaultConfidenceThreshold;
    const limit = toSafePositiveInt(queryObj.limit, this.config.defaultLimit, MAX_SEARCH_LIMIT);
    const page = toSafePositiveInt(queryObj.page, 1);
    const offset = (page - 1) * limit;
    const rawText = typeof queryObj.text === 'string' ? queryObj.text.trim() : '';

    // Lọc trước theo domain chuẩn hóa & docNumber (nếu có)
    let candidateChunks = this.chunks;
    if (typeof queryObj.domain === 'string' && queryObj.domain.trim()) {
      const targetDomain = normalizeDomain(queryObj.domain);
      candidateChunks = candidateChunks.filter((c) => normalizeDomain(c.domain) === targetDomain);
    }
    if (typeof queryObj.docNumber === 'string' && queryObj.docNumber.trim()) {
      const targetDoc = queryObj.docNumber.trim().toLowerCase();
      candidateChunks = candidateChunks.filter((c) => (c.docNumber || '').trim().toLowerCase() === targetDoc);
    }

    // CHẾ ĐỘ DUYỆT KHO LUẬT (BROWSE MODE): Cho phép xem danh sách điều khoản khi query rỗng ở mode 'admin'
    if (isAdminMode && !rawText) {
      const totalMatches = candidateChunks.length;
      const pageItems = candidateChunks.slice(offset, offset + limit).map((chunk) => ({
        chunk,
        score: 1,
      }));
      return {
        isFound: totalMatches > 0,
        topScore: totalMatches > 0 ? 1 : 0,
        results: pageItems,
        totalMatches,
        page,
        limit,
        searchMode: 'browse',
        message: totalMatches > 0 ? SEARCH_MESSAGES.SUCCESS : SEARCH_MESSAGES.NOT_FOUND_FALLBACK,
        loggedToKnowledgeGap: false,
      };
    }

    // BỘ LỌC KIỂM TRA DỮ LIỆU ĐẦU VÀO (INPUT VALIDATION GUARD)
    const normalized = normalizeQueryText(rawText);
    const meaningfulWords = normalized
      .split(' ')
      .filter((w) => w.length >= 2 && !this.stopWords.has(w));

    if (!rawText || rawText.length < this.config.minQueryLength || meaningfulWords.length === 0) {
      return {
        isFound: false,
        topScore: 0,
        results: [],
        totalMatches: 0,
        page,
        limit,
        searchMode: 'search',
        message: SEARCH_MESSAGES.QUERY_TOO_SHORT,
        loggedToKnowledgeGap: false,
      };
    }

    const queryBigrams = extractBigrams(meaningfulWords);

    // Chấm điểm từng chunk (chế độ admin lọc bỏ kết quả nhiễu có điểm quá thấp)
    const minScore = isAdminMode
      ? (queryObj.confidenceThreshold ??
        (meaningfulWords.length >= 2 ? DEFAULT_ADMIN_MIN_SCORE : DEFAULT_ADMIN_SINGLE_WORD_MIN_SCORE))
      : 0;
    const scoredResults: SearchResultItem[] = [];

    for (const chunk of candidateChunks) {
      const score = this.scoreChunk(meaningfulWords, queryBigrams, normalized, chunk, isAdminMode);
      if (score > 0 && score >= minScore) {
        scoredResults.push({ chunk, score });
      }
    }

    // Sắp xếp điểm giảm dần
    scoredResults.sort((a, b) => b.score - a.score);

    const topScore = scoredResults.length > 0 ? scoredResults[0].score : 0;

    // CHẾ ĐỘ ADMIN: Trả Top-K kết quả liên quan kèm tổng số khớp thực tế, không ghi Knowledge Gap Queue
    if (isAdminMode) {
      const totalMatches = scoredResults.length;
      return {
        isFound: totalMatches > 0,
        topScore,
        results: scoredResults.slice(offset, offset + limit),
        totalMatches,
        page,
        limit,
        searchMode: 'search',
        message: totalMatches > 0 ? SEARCH_MESSAGES.SUCCESS : SEARCH_MESSAGES.NOT_FOUND_FALLBACK,
        loggedToKnowledgeGap: false,
      };
    }

    // KIỂM TRA BỘ LỌC NGƯỠNG TIN CẬY (CONFIDENCE GUARD - CITIZEN MODE)
    if (topScore >= threshold) {
      return {
        isFound: true,
        topScore,
        results: scoredResults.slice(offset, offset + limit),
        totalMatches: scoredResults.length,
        page,
        limit,
        searchMode: 'search',
        message: SEARCH_MESSAGES.SUCCESS,
        loggedToKnowledgeGap: false,
      };
    }

    // FALLBACK GUARD KÍCH HOẠT: Không đủ tin cậy, chặn ảo giác và ghi nhận vào Knowledge Gap Queue
    if (!queryObj.skipGapLogging) {
      this.gapQueue.logQuery(rawText);
    }

    return {
      isFound: false,
      topScore,
      results: [],
      totalMatches: 0,
      page,
      limit,
      searchMode: 'search',
      message: SEARCH_MESSAGES.NOT_FOUND_FALLBACK,
      loggedToKnowledgeGap: !queryObj.skipGapLogging,
    };
  }
}
