import { ContractCategory, ContractClause } from './types.js';

/**
 * Bộ Phân đoạn Hợp đồng & Nhận diện Điều khoản
 * Áp dụng triết lý Ponytail: Tối giản, chạy siêu tốc < 1ms, không phụ thuộc thư viện bên ngoài.
 */
export class ClauseSegmenter {
  /**
   * Tự động nhận diện loại hợp đồng dựa trên tiêu đề và từ khóa nội dung
   */
  static detectCategory(text: string): ContractCategory {
    if (!text || typeof text !== 'string') {
      return 'general_civil';
    }

    const lower = text.toLowerCase();

    // 1. Nhận diện Hợp đồng Lao động
    if (
      lower.includes('hợp đồng lao động') ||
      lower.includes('thỏa thuận thử việc') ||
      lower.includes('người sử dụng lao động') ||
      (lower.includes('tiền lương') && lower.includes('thử việc'))
    ) {
      return 'labor';
    }

    // 2. Nhận diện Hợp đồng Thuê nhà / Thuê phòng trọ
    if (
      lower.includes('thuê nhà') ||
      lower.includes('thuê phòng trọ') ||
      lower.includes('thuê căn hộ') ||
      lower.includes('bên cho thuê') ||
      (lower.includes('tiền thuê') && lower.includes('đặt cọc'))
    ) {
      return 'rental';
    }

    // 3. Nhận diện Hợp đồng Vay nợ / Mượn tài sản
    if (
      lower.includes('vay tiền') ||
      lower.includes('mượn nợ') ||
      lower.includes('bên vay') ||
      (lower.includes('lãi suất') && lower.includes('khoản vay'))
    ) {
      return 'civil_loan';
    }

    return 'general_civil';
  }

  /**
   * Phân tách văn bản hợp đồng thành danh sách các điều khoản độc lập
   */
  static segment(rawText: string, category?: ContractCategory): ContractClause[] {
    if (!rawText || !rawText.trim()) {
      return [];
    }

    const trimmed = rawText.trim();
    // Regex tìm các mốc "Điều X[:\.]?" hỗ trợ cả số Ả Rập (1, 2) và số La Mã (I, II, III...)
    const articleRegex = /(?:^|\n)\s*(Điều\s+(?:\d+|[IVXLCDMivxlcdm]+)[:\.]?[^\n]*)/gi;
    const matches: { index: number; fullMatch: string; title: string }[] = [];

    let match: RegExpExecArray | null;
    while ((match = articleRegex.exec(trimmed)) !== null) {
      matches.push({
        index: match.index,
        fullMatch: match[0],
        title: match[1].trim(),
      });
    }

    // Nếu không tìm thấy cấu trúc "Điều X", phân tách theo các khối đoạn văn bản (Paragraphs)
    if (matches.length === 0) {
      const paragraphs = trimmed
        .split(/\n\s*\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      return paragraphs.map((para, idx) => ({
        id: `khoan-${idx + 1}`,
        title: `Đoạn ${idx + 1}`,
        text: para,
        category: this.classifyClauseContent(para),
        orderIndex: idx,
      }));
    }

    const clauses: ContractClause[] = [];

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const startPos = current.index;
      const endPos = i + 1 < matches.length ? matches[i + 1].index : trimmed.length;

      const rawClauseText = trimmed.substring(startPos, endPos).trim();
      
      // Tách tiêu đề khỏi phần nội dung chi tiết
      const firstLineEnd = rawClauseText.indexOf('\n');
      let title = current.title;
      let bodyText = rawClauseText;

      if (firstLineEnd !== -1) {
        title = rawClauseText.substring(0, firstLineEnd).trim();
        bodyText = rawClauseText.substring(firstLineEnd + 1).trim();
      }

      // Trích xuất số điều để làm ID: "Điều 2: ..." -> "dieu-2" hoặc "Điều II: ..." -> "dieu-ii"
      const numberMatch = /Điều\s+(\d+|[IVXLCDMivxlcdm]+)/i.exec(title);
      const clauseId = numberMatch ? `dieu-${numberMatch[1].toLowerCase()}` : `dieu-${i + 1}`;

      const clauseCategory = this.classifyClauseContent(title, rawClauseText);

      clauses.push({
        id: clauseId,
        title,
        text: bodyText || rawClauseText,
        category: clauseCategory,
        orderIndex: i,
      });
    }

    return clauses;
  }

  /**
   * Phân loại nội dung điều khoản thành các nhóm nghiệp vụ chính.
   * Ưu tiên tiêu đề trước, sau đó tới toàn văn nội dung.
   */
  private static classifyClauseContent(titleOrContent: string, fullContent?: string): string {
    const textToCheck = `${titleOrContent} ${fullContent || ''}`.toLowerCase();
    const titleLower = titleOrContent.toLowerCase();

    // 1. Kiểm tra tiêu đề (Title Signal có độ tin cậy cao nhất)
    if (titleLower.includes('chấm dứt') || titleLower.includes('nghỉ việc') || titleLower.includes('thanh lý')) {
      return 'TERMINATION';
    }
    if (titleLower.includes('thử việc')) {
      return 'PROBATION';
    }
    if (titleLower.includes('giá thuê') || titleLower.includes('tiền thuê')) {
      return 'RENTAL_PRICE';
    }
    if (titleLower.includes('đặt cọc') || titleLower.includes('tiền cọc')) {
      return 'DEPOSIT';
    }
    if (titleLower.includes('tiền lương') || titleLower.includes('thù lao') || titleLower.includes('phụ cấp') || titleLower.includes('thu nhập')) {
      return 'COMPENSATION_SALARY';
    }
    if (titleLower.includes('kỷ luật') || titleLower.includes('xử lý vi phạm')) {
      return 'DISCIPLINE_PENALTY';
    }
    if (titleLower.includes('thời giờ làm việc') || titleLower.includes('nghỉ ngơi') || titleLower.includes('ca làm việc')) {
      return 'WORKING_HOURS';
    }
    if (titleLower.includes('bảo mật') || titleLower.includes('bí mật kinh doanh') || titleLower.includes('không cạnh tranh')) {
      return 'CONFIDENTIALITY';
    }
    if (titleLower.includes('bảo hiểm xã hội') || titleLower.includes('bhxh') || titleLower.includes('bhyt')) {
      return 'SOCIAL_INSURANCE';
    }

    // 2. Kiểm tra toàn văn nếu tiêu đề không rõ
    if (textToCheck.includes('chấm dứt hợp đồng') || textToCheck.includes('đơn phương chấm dứt')) {
      return 'TERMINATION';
    }
    if (textToCheck.includes('thử việc')) {
      return 'PROBATION';
    }
    if (textToCheck.includes('đặt cọc') || textToCheck.includes('tiền cọc')) {
      return 'DEPOSIT';
    }
    if (textToCheck.includes('giá thuê') || textToCheck.includes('tiền thuê')) {
      return 'RENTAL_PRICE';
    }
    if (textToCheck.includes('tiền lương') || textToCheck.includes('thù lao') || textToCheck.includes('phụ cấp')) {
      return 'COMPENSATION_SALARY';
    }
    if (textToCheck.includes('kỷ luật') || textToCheck.includes('phạt tiền') || textToCheck.includes('bồi thường')) {
      return 'DISCIPLINE_PENALTY';
    }
    if (textToCheck.includes('thời giờ làm việc') || textToCheck.includes('nghỉ ngơi') || textToCheck.includes('ca làm việc')) {
      return 'WORKING_HOURS';
    }
    if (textToCheck.includes('bảo mật') || textToCheck.includes('bí mật kinh doanh') || textToCheck.includes('không cạnh tranh')) {
      return 'CONFIDENTIALITY';
    }
    if (textToCheck.includes('bảo hiểm xã hội') || textToCheck.includes('bhxh') || textToCheck.includes('bhyt')) {
      return 'SOCIAL_INSURANCE';
    }

    return 'GENERAL';
  }
}
