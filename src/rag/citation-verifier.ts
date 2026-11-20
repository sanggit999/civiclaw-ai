import { LegalChunk } from '../ingestion/types.js';
import {
  ICitationVerifier,
  CitationVerificationResult,
  GroundedCitation,
} from './types.js';

/**
 * Biểu thức chính quy nhận diện trích dẫn pháp lý Việt Nam:
 * - Khớp các dạng: "Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP"
 * - "Khoản 1 Điều 47 Luật Trật tự, an toàn giao thông đường bộ 2024"
 * - "Điều 6 Nghị định 168/2024/NĐ-CP"
 * - "Điều 999 Nghị định 999/2099/NĐ-CP"
 * Lưu ý: Giới hạn nhận diện tên văn bản không nuốt các từ nối (và, hoặc, theo...) hoặc dấu câu.
 */
const CITATION_REGEX =
  /(?:(Điểm\s+[a-zđĐ0-9]+)\s+)?(?:(Khoản\s+\d+)\s+)?(Điều\s+\d+)(?:\s+(Nghị định\s+(?:số\s+)?[\d\/A-ZĐa-z0-9\-]+|(?:Bộ luật|Luật|Thông tư)\s+[^,\.\n;\(\)]+?(?=\s+(?:và|hoặc|theo|về|ngày|được)|[,\.\n;\(\)]|$)))?/gi;

/**
 * Chuẩn hóa số hiệu văn bản (bỏ khoảng trắng thừa, chữ hoa)
 */
function normalizeDocRef(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\d\/]/g, '')
    .trim();
}

/**
 * Bộ kiểm chứng trích dẫn chéo bằng biểu thức chính quy (RegexCitationVerifier)
 * Nhiệm vụ: Phát hiện và ngăn chặn 100% trích dẫn ma (Hallucinated Citations)
 */
export class RegexCitationVerifier implements ICitationVerifier {
  /**
   * Quét và trích xuất tất cả các căn cứ pháp lý được nêu trong văn bản trả lời
   */
  extractCitations(text: string): GroundedCitation[] {
    const citations: GroundedCitation[] = [];
    const seen = new Set<string>();

    const matches = text.matchAll(CITATION_REGEX);
    for (const match of matches) {
      const fullReference = match[0].trim();
      const point = match[1]?.trim();
      const clause = match[2]?.trim();
      const article = match[3]?.trim();
      const docRaw = match[4]?.trim() || '';

      // Trích xuất số hiệu văn bản (VD: 168/2024/NĐ-CP hoặc 36/2024/QH15)
      const docNumberMatch = docRaw.match(/(\d+\/\d+\/[A-ZĐ0-9\-]+)/i);
      const docNumber = docNumberMatch ? docNumberMatch[1] : docRaw;

      // Khóa chống trùng lặp trong cùng 1 câu trả lời
      const key = `${point || ''}_${clause || ''}_${article}_${docNumber}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({
          fullReference,
          article,
          clause,
          point,
          docNumber,
          isVerified: false,
        });
      }
    }

    return citations;
  }

  /**
   * Đối soát chéo các trích dẫn với danh sách Context Chunks thực tế đã cấp cho LLM
   */
  verify(answerText: string, contextChunks: LegalChunk[]): CitationVerificationResult {
    const extractedCitations = this.extractCitations(answerText);
    const verifiedCitations: GroundedCitation[] = [];
    const unverifiedCitations: string[] = [];

    // Nếu không có trích dẫn nào được tìm thấy
    if (extractedCitations.length === 0) {
      return {
        isValid: true,
        verifiedCitations: [],
        unverifiedCitations: [],
      };
    }

    // Tạo bản đồ các điều luật hợp lệ từ context chunks
    const validArticles = new Set(contextChunks.map((c) => c.article.toLowerCase().trim()));
    const validDocNumbers = new Set(
      contextChunks.map((c) => normalizeDocRef(c.docNumber))
    );
    const validFullRefs = contextChunks.map((c) => c.fullReference.toLowerCase());

    for (const citation of extractedCitations) {
      const citArticleLower = citation.article.toLowerCase().trim();
      const citDocNorm = citation.docNumber ? normalizeDocRef(citation.docNumber) : '';
      const citFullLower = citation.fullReference.toLowerCase().trim();

      // Một trích dẫn chỉ được coi là hợp lệ khi khớp với ít nhất một Context Chunk cụ thể
      const isMatched = contextChunks.some((chunk) => {
        const chunkArticleLower = chunk.article.toLowerCase().trim();
        const chunkDocNorm = normalizeDocRef(chunk.docNumber);
        const chunkFullLower = chunk.fullReference.toLowerCase();

        // 1. Nếu fullReference của chunk bao hàm trích dẫn (ví dụ: chunk chứa Điểm đ Khoản 3 Điều 6...)
        if (chunkFullLower.includes(citFullLower)) {
          return true;
        }

        // 2. Kiểm tra khớp Điều luật
        if (chunkArticleLower !== citArticleLower) {
          return false;
        }

        // 3. Nếu trích dẫn có chỉ định Khoản, chunk phải chứa Khoản đó (chống bịa Khoản mới)
        if (citation.clause && !chunkFullLower.includes(citation.clause.toLowerCase())) {
          return false;
        }

        // 4. Nếu trích dẫn có chỉ định Điểm, chunk phải chứa Điểm đó (chống bịa Điểm mới)
        if (citation.point && !chunkFullLower.includes(citation.point.toLowerCase())) {
          return false;
        }

        // 5. Nếu trích dẫn có chỉ định văn bản (docNumber/tên văn bản), văn bản đó bắt buộc phải khớp với chunk
        if (citDocNorm) {
          const docMatches =
            chunkDocNorm === citDocNorm ||
            chunkFullLower.includes(citDocNorm) ||
            (citation.docNumber && chunkFullLower.includes(citation.docNumber.toLowerCase()));
          return docMatches;
        }

        // Nếu câu trả lời chỉ nêu Điều mà không kèm số hiệu văn bản, nhưng Điều đó có trong chunk được cấp
        return true;
      });

      if (isMatched) {
        citation.isVerified = true;
        verifiedCitations.push(citation);
      } else {
        citation.isVerified = false;
        unverifiedCitations.push(citation.fullReference);
      }
    }

    return {
      isValid: unverifiedCitations.length === 0,
      verifiedCitations,
      unverifiedCitations,
    };
  }
}
