import { createHash } from 'node:crypto';
import { IDocumentParser, ParsedDocumentResult } from './version-types.js';

/**
 * Bộ Bóc Tách & Chuẩn Hóa Văn Bản Hợp Đồng (Document Parser & Cleaner)
 * Áp dụng triết lý Ponytail: Tận dụng stdlib `node:crypto`, không cài thêm thư viện nặng.
 */
export class DocumentParser implements IDocumentParser {
  /**
   * Bóc tách và làm sạch tài liệu
   */
  async parse(input: Buffer | string, fileType: string): Promise<ParsedDocumentResult> {
    return DocumentParser.parse(input, fileType);
  }

  /**
   * Phương thức tĩnh thuận tiện cho xử lý trực tiếp
   */
  static async parse(input: Buffer | string, fileType: string): Promise<ParsedDocumentResult> {
    const rawText = typeof input === 'string' ? input : input.toString('utf-8');

    if (!rawText || !rawText.trim()) {
      const emptyHash = createHash('sha256').update('').digest('hex');
      return {
        rawText: rawText || '',
        cleanedText: '',
        contentHash: emptyHash,
        pageCount: 1,
      };
    }

    const cleanedText = this.cleanDocumentText(rawText);
    const contentHash = createHash('sha256').update(cleanedText, 'utf-8').digest('hex');

    return {
      rawText,
      cleanedText,
      contentHash,
      pageCount: this.estimatePageCount(rawText),
    };
  }

  /**
   * Làm sạch các mẫu nhiễu phổ biến trong tài liệu văn bản
   */
  static cleanDocumentText(text: string): string {
    return (
      text
        // 1. Loại bỏ các dòng số trang: "Trang 1/3", "Page 2 of 4", "Trang 2"
        .replace(/(?:^|\n)\s*(?:Trang|Page)\s+\d+(?:\s*(?:\/|of|trên)\s*\d+)?\s*(?:\n|$)/gi, '\n')
        // 2. Loại bỏ các dòng phân cách trang dạng dấu gạch kẻ lặp lại: "------", "======"
        .replace(/(?:^|\n)\s*[-=_~*]{3,}\s*(?:\n|$)/g, '\n')
        // 3. Chuẩn hóa khoảng trắng đầu/cuối mỗi dòng
        .split('\n')
        .map((line) => line.trim())
        // 4. Gộp các dòng trống liên tiếp thành tối đa 1 dòng trống
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    );
  }

  /**
   * Ước tính số trang dựa trên mật độ ký tự hoặc dấu phân trang
   */
  private static estimatePageCount(text: string): number {
    const pageMatches = text.match(/(?:Trang|Page)\s+(\d+)/gi);
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length;
    }
    // Ước tính ~2.000 ký tự cho một trang A4 chuẩn
    return Math.max(1, Math.ceil(text.length / 2000));
  }
}
