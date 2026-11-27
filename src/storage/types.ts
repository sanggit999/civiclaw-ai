import { LegalChunk, LegalDomain } from '../ingestion/types.js';
import { GapStatus, ExtendedDomain, UnresolvedQuery } from '../search/types.js';
import { removeVietnameseDiacritics } from '../search/gap-queue.js';

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
 * Bảng ánh xạ bí danh lĩnh vực (Anh/Việt/Không dấu/Mã cũ) về mã quy chuẩn duy nhất
 */
const DOMAIN_ALIAS_MAP: Record<string, string> = {
  traffic: 'TRAFFIC',
  'giao thong': 'TRAFFIC',
  'giao thong duong bo': 'TRAFFIC',
  labor: 'LABOR',
  'lao dong': 'LABOR',
  'lao dong & tien luong': 'LABOR',
  'lao dong tien luong': 'LABOR',
  'bo luat lao dong 2019': 'LABOR',
  social_insurance: 'SOCIAL_INSURANCE',
  insurance: 'SOCIAL_INSURANCE',
  bhxh: 'SOCIAL_INSURANCE',
  'bao hiem': 'SOCIAL_INSURANCE',
  'bao hiem xa hoi': 'SOCIAL_INSURANCE',
  'luat bao hiem xa hoi 2024': 'SOCIAL_INSURANCE',
  housing: 'HOUSING',
  'nha o': 'HOUSING',
  'nha o & cu tru': 'HOUSING',
  'nha o cu tru': 'HOUSING',
  'luat nha o 2023': 'HOUSING',
  civil: 'CIVIL',
  'dan su': 'CIVIL',
  'dan su & hop dong': 'CIVIL',
  'bo luat dan su 2015': 'CIVIL',
  land: 'LAND',
  'dat dai': 'LAND',
  'dat dai & bat dong san': 'LAND',
};

/**
 * Danh mục hiển thị mặc định cho các lĩnh vực pháp lý (Single Source of Truth cho Fallback & Summary)
 */
export const DEFAULT_DOMAIN_CATALOG: Record<string, { name: string; description: string }> = {
  TRAFFIC: {
    name: 'Giao thông đường bộ',
    description: 'Nghị định 168/2024/NĐ-CP & Luật TTATGTĐB 36/2024/QH15',
  },
  LABOR: {
    name: 'Lao động & Tiền lương',
    description: 'Bộ luật Lao động 2019 (45/2019/QH14)',
  },
  SOCIAL_INSURANCE: {
    name: 'Bảo hiểm xã hội',
    description: 'Luật Bảo hiểm xã hội 2024 (41/2024/QH15)',
  },
  HOUSING: {
    name: 'Nhà ở & Cư trú',
    description: 'Luật Nhà ở 2023 (27/2023/QH15)',
  },
  CIVIL: {
    name: 'Dân sự & Hợp đồng',
    description: 'Bộ luật Dân sự 2015 (Sẵn sàng mở rộng)',
  },
  LAND: {
    name: 'Đất đai & Bất động sản',
    description: 'Luật Đất đai 2024 (Sẵn sàng mở rộng)',
  },
};

/**
 * Tên văn bản pháp quy theo số hiệu chuẩn
 */
export const DOCUMENT_TITLE_CATALOG: Record<string, string> = {
  '168/2024/NĐ-CP': 'Nghị định 168/2024/NĐ-CP (Xử phạt GTĐB & trừ điểm GPLX)',
  '36/2024/QH15': 'Luật Trật tự, an toàn giao thông đường bộ 2024',
  '45/2019/QH14': 'Bộ luật Lao động 2019',
  '41/2024/QH15': 'Luật Bảo hiểm xã hội 2024',
  '27/2023/QH15': 'Luật Nhà ở 2023',
};

/**
 * Chuẩn hóa mã lĩnh vực từ mọi biến thể (hoa/thường, tiếng Việt/Anh, alias cũ) về dạng chữ hoa quy chuẩn
 */
export function normalizeDomain(domain: string): LegalDomain | 'CIVIL' | 'LAND' | 'OTHER' {
  const cleaned = removeVietnameseDiacritics((domain || '').trim())
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!cleaned) return 'OTHER';

  const mapped = DOMAIN_ALIAS_MAP[cleaned] || cleaned.toUpperCase();
  if (['TRAFFIC', 'LABOR', 'SOCIAL_INSURANCE', 'HOUSING', 'CIVIL', 'LAND'].includes(mapped)) {
    return mapped as LegalDomain | 'CIVIL' | 'LAND';
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
