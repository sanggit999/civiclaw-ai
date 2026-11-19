import { LegalChunk, LegalDomain } from '../ingestion/types.js';
import { GapStatus, ExtendedDomain, UnresolvedQuery } from '../search/types.js';

/**
 * Cấu trúc bản ghi public.legal_chunks trong Supabase PostgreSQL
 * Tuân thủ quy chuẩn lowercase snake_case theo supabase-postgres-best-practices
 */
export interface SupabaseLegalChunkRow {
  id: string;
  doc_number: string;
  domain: string;
  chapter?: string | null;
  article: string;
  clause?: string | null;
  point?: string | null;
  full_reference: string;
  content: string;
  keywords?: string[];
  embedding?: number[] | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Cấu trúc bản ghi public.legal_domains trong Supabase PostgreSQL
 */
export interface LegalDomainRecord {
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
}

/**
 * Cấu trúc bản ghi public.unresolved_queries trong Supabase PostgreSQL
 */
export interface SupabaseUnresolvedQueryRow {
  id: number;
  query_text: string;
  normalized_query: string;
  domain_guess: string;
  hit_count: number;
  status: GapStatus;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Chuẩn hóa mã lĩnh vực về dạng chữ hoa quy chuẩn
 */
export function normalizeDomain(domain: string): LegalDomain | 'OTHER' {
  const upper = (domain || '').toUpperCase();
  if (upper === 'INSURANCE') return 'SOCIAL_INSURANCE';
  if (['TRAFFIC', 'LABOR', 'SOCIAL_INSURANCE', 'HOUSING'].includes(upper)) {
    return upper as LegalDomain;
  }
  return 'OTHER';
}

/**
 * Chuyển đổi từ domain model LegalChunk sang Supabase row format
 */
export function toSupabaseLegalRow(chunk: LegalChunk, embedding?: number[] | null): SupabaseLegalChunkRow {
  return {
    id: chunk.id,
    doc_number: chunk.docNumber,
    domain: normalizeDomain(chunk.domain),
    chapter: chunk.chapter ?? null,
    article: chunk.article,
    clause: chunk.clause ?? null,
    point: chunk.point ?? null,
    full_reference: chunk.fullReference,
    content: chunk.content,
    keywords: chunk.keywords ?? [],
    embedding: embedding ?? null,
  };
}

/**
 * Chuyển đổi từ Supabase row format sang domain model LegalChunk
 */
export function fromSupabaseLegalRow(row: SupabaseLegalChunkRow): LegalChunk {
  return {
    id: row.id,
    docNumber: row.doc_number,
    domain: row.domain as LegalDomain,
    chapter: row.chapter ?? undefined,
    article: row.article,
    clause: row.clause ?? undefined,
    point: row.point ?? undefined,
    fullReference: row.full_reference,
    content: row.content,
    keywords: row.keywords ?? [],
  };
}

/**
 * Chuyển đổi từ Supabase row format sang domain model UnresolvedQuery
 */
export function fromSupabaseQueryRow(row: SupabaseUnresolvedQueryRow): UnresolvedQuery {
  return {
    id: String(row.id),
    queryText: row.query_text,
    normalizedQuery: row.normalized_query,
    domainGuess: row.domain_guess as ExtendedDomain,
    hitCount: row.hit_count,
    status: row.status,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    adminNotes: row.admin_notes ?? undefined,
  };
}
