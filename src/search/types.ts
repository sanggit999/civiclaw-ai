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

export interface UnresolvedQuery {
  id: string;
  queryText: string;
  normalizedQuery: string;
  domainGuess: ExtendedDomain;
  hitCount: number;
  status: GapStatus;
  createdAt: string;
  updatedAt: string;
}
