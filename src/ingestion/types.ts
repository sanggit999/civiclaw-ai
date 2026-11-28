/**
 * Các lĩnh vực pháp lý cốt lõi của CivicLaw AI
 */
export type LegalDomain = 'TRAFFIC' | 'LABOR' | 'SOCIAL_INSURANCE' | 'HOUSING' | 'CIVIL';

/**
 * Metadata thông tin chung của một văn bản quy phạm pháp luật
 */
export interface LegalDocumentMetadata {
  docNumber: string;         // Ví dụ: '168/2024/NĐ-CP' hoặc '45/2019/QH14'
  title: string;             // Tên đầy đủ của văn bản
  domain: LegalDomain;       // Lĩnh vực phân loại
  issueDate: string;         // Ngày ban hành (YYYY-MM-DD)
  effectiveDate: string;     // Ngày có hiệu lực thi hành (YYYY-MM-DD)
  expiryDate?: string;       // Ngày hết hiệu lực (nếu có)
  isActive: boolean;         // Trạng thái còn hiệu lực
  sourceUrl?: string;        // Link trang văn bản chính thức Cổng thông tin Chính phủ
}

/**
 * Đơn vị phân đoạn pháp lý nhỏ nhất có thể trích dẫn được (Legal Chunk)
 */
export interface LegalChunk {
  id: string;                // ID định danh duy nhất (tạo từ docNumber + fullReference)
  docNumber: string;         // Số hiệu văn bản liên kết
  domain: LegalDomain;       // Lĩnh vực
  chapter?: string;          // Chương (nếu có)
  article: string;           // Điều (ví dụ: 'Điều 6')
  clause?: string;           // Khoản (ví dụ: 'Khoản 2')
  point?: string;            // Điểm (ví dụ: 'Điểm a')
  fullReference: string;     // Trích dẫn đầy đủ (ví dụ: 'Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP')
  content: string;           // Nội dung câu chữ kèm ngữ cảnh của Điều và Khoản
  keywords: string[];        // Từ khóa nhận diện nhanh
}
