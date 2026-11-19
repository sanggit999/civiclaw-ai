import { GapStatus, UnresolvedQuery, ExtendedDomain, GapQueueStats } from './types.js';

/**
 * Loại bỏ dấu tiếng Việt chuẩn ECMAScript không phụ thuộc thư viện ngoài
 */
export function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuẩn hóa chuỗi văn bản để so sánh từ vựng: bỏ dấu câu, chuyển chữ thường
 */
export function normalizeQueryText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tính hệ số tương đồng Jaccard giữa 2 câu văn (dựa trên tập từ vựng)
 */
export function calculateJaccardSimilarity(textA: string, textB: string): number {
  const setA = new Set(normalizeQueryText(textA).split(' ').filter(Boolean));
  const setB = new Set(normalizeQueryText(textB).split(' ').filter(Boolean));

  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const word of setA) {
    if (setB.has(word)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return intersectionCount / unionCount;
}

/**
 * Tự động đoán lĩnh vực pháp lý dựa trên từ khóa câu hỏi
 */
export function guessDomain(text: string): ExtendedDomain {
  const lower = text.toLowerCase();

  if (/xe|giao thông|bằng lái|gplx|ô tô|mô tô|đèn đỏ|phạt|làn đường|tai nạn/.test(lower)) {
    return 'TRAFFIC';
  }
  if (/lao động|tiền lương|nghỉ phép|hợp đồng lao động|sa thải|thử việc|tăng ca/.test(lower)) {
    return 'LABOR';
  }
  if (/bảo hiểm|bhxh|bhyt|thai sản|hưu trí|trợ cấp/.test(lower)) {
    return 'SOCIAL_INSURANCE';
  }
  if (/nhà ở|thuê nhà|đặt cọc|chung cư|sổ hồng|sổ đỏ/.test(lower)) {
    return 'HOUSING';
  }

  return 'OTHER';
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'gap_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Quản lý hàng đợi khoảng trống tri thức (Knowledge Gap Queue)
 */
export class KnowledgeGapQueue {
  private gaps: Map<string, UnresolvedQuery> = new Map();

  /**
   * Ghi nhận một câu hỏi thiếu vào hàng đợi. Tự động khử trùng lặp và cộng dồn hitCount.
   * Chặn ghi rác nếu câu hỏi rỗng hoặc ngắn hơn 3 ký tự.
   */
  logQuery(rawQuery: string): UnresolvedQuery | null {
    const trimmed = rawQuery.trim();
    const normalized = normalizeQueryText(trimmed);

    // BỘ LỌC CHẶN RÁC: Không ghi nhận query rỗng hoặc quá ngắn
    if (normalized.length < 3) {
      return null;
    }

    // 1. Kiểm tra xem có câu hỏi nào tương tự (độ trùng từ vựng >= 60%) chưa
    for (const gap of this.gaps.values()) {
      const similarity = calculateJaccardSimilarity(gap.normalizedQuery, normalized);
      if (similarity >= 0.6) {
        gap.hitCount += 1;
        gap.updatedAt = new Date().toISOString();
        return gap;
      }
    }

    // 2. Nếu là chủ đề mới, tạo bản ghi mới
    const now = new Date().toISOString();
    const newGap: UnresolvedQuery = {
      id: generateId(),
      queryText: trimmed,
      normalizedQuery: normalized,
      domainGuess: guessDomain(trimmed),
      hitCount: 1,
      status: 'unreviewed',
      createdAt: now,
      updatedAt: now,
    };

    this.gaps.set(newGap.id, newGap);
    return newGap;
  }

  /**
   * Lấy danh sách toàn bộ các câu hỏi chưa giải quyết, ưu tiên câu được hỏi nhiều nhất
   */
  getAll(): UnresolvedQuery[] {
    return Array.from(this.gaps.values()).sort((a, b) => b.hitCount - a.hitCount);
  }

  getById(id: string): UnresolvedQuery | undefined {
    return this.gaps.get(id);
  }

  updateStatus(id: string, status: GapStatus): boolean {
    const gap = this.gaps.get(id);
    if (!gap) return false;
    gap.status = status;
    gap.updatedAt = new Date().toISOString();
    return true;
  }

  resolveGap(id: string, adminNotes?: string): boolean {
    const gap = this.gaps.get(id);
    if (!gap) return false;
    gap.status = 'resolved';
    if (adminNotes) gap.adminNotes = adminNotes;
    gap.updatedAt = new Date().toISOString();
    return true;
  }

  ignoreGap(id: string, reason?: string): boolean {
    const gap = this.gaps.get(id);
    if (!gap) return false;
    gap.status = 'ignored';
    if (reason) gap.adminNotes = reason;
    gap.updatedAt = new Date().toISOString();
    return true;
  }

  getStats(): GapQueueStats {
    let unreviewed = 0;
    let resolved = 0;
    let ignored = 0;
    for (const g of this.gaps.values()) {
      if (g.status === 'unreviewed') unreviewed++;
      else if (g.status === 'resolved') resolved++;
      else if (g.status === 'ignored') ignored++;
    }
    return {
      total: this.gaps.size,
      unreviewed,
      resolved,
      ignored,
    };
  }

  searchGaps(keyword: string): UnresolvedQuery[] {
    const term = normalizeQueryText(keyword);
    return this.getAll().filter(
      (g) => g.normalizedQuery.includes(term) || g.domainGuess.toLowerCase().includes(term)
    );
  }
}
