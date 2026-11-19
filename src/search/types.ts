import { LegalChunk, LegalDomain } from '../ingestion/types.js';

export interface SearchQuery {
  text: string;
  domain?: LegalDomain;
  limit?: number;
  confidenceThreshold?: number; // Mặc định 0.65
}

export interface SearchResultItem {
  chunk: LegalChunk;
  score: number; // Thang 0.0 - 1.0
}

export interface SearchResponse {
  isFound: boolean;
  topScore: number;
  results: SearchResultItem[];
  message: string;
  loggedToKnowledgeGap: boolean;
}

export type GapStatus = 'unreviewed' | 'resolved' | 'ignored';

export type ExtendedDomain = LegalDomain | 'OTHER';

export interface SearchScoringWeights {
  keyword: number;              // Trọng số từ khóa chuyên ngành (0.25)
  unigram: number;              // Trọng số từ đơn (0.35)
  bigram: number;               // Trọng số cụm từ ghép (0.40)
  citationArticleBonus: number; // Điểm thưởng khi khớp đích danh Điều luật (0.35)
  citationDocBonus: number;     // Điểm thưởng khi khớp số hiệu văn bản (0.15)
}

export interface SearchEngineConfig {
  defaultConfidenceThreshold: number; // Ngưỡng tin cậy mặc định (0.65)
  defaultLimit: number;               // Số lượng kết quả mặc định (5)
  minQueryLength: number;             // Độ dài ký tự tối thiểu để tìm kiếm (3)
  weights: SearchScoringWeights;
}

export interface UnresolvedQuery {
  id: string;
  queryText: string;
  normalizedQuery: string;
  domainGuess: ExtendedDomain;
  hitCount: number;
  status: GapStatus;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
}

export interface GapQueueStats {
  total: number;
  unreviewed: number;
  resolved: number;
  ignored: number;
}
