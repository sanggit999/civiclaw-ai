import { ClauseAuditFinding, ContractAuditReport, ContractCategory } from './types.js';

/**
 * Kết quả bóc tách tài liệu
 */
export interface ParsedDocumentResult {
  rawText: string;
  cleanedText: string;
  contentHash: string; // SHA-256 hex string của cleanedText
  pageCount?: number;
}

/**
 * Giao diện bóc tách tài liệu chuẩn (Adapter Pattern)
 */
export interface IDocumentParser {
  parse(input: Buffer | string, fileType: string): Promise<ParsedDocumentResult>;
}

/**
 * Hồ sơ Hợp đồng (Đại diện cho 1 hợp đồng xuyên suốt quá trình đàm phán)
 */
export interface ContractDocument {
  id: string; // UUID
  title: string; // Tiêu đề hợp đồng
  category: ContractCategory; // 'labor' | 'rental' | 'civil_loan' | 'general_civil'
  currentVersion: number; // 1, 2, 3...
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Bản ghi Phiên bản Hợp đồng
 */
export interface ContractVersion {
  id: string; // UUID
  documentId: string; // Khóa ngoại tham chiếu ContractDocument.id
  versionNumber: number; // 1, 2, 3...
  fileName: string; // Tên file gốc (VD: HDLD_v1.docx)
  fileType: string; // 'docx' | 'pdf' | 'txt' | 'md'
  contentHash: string; // SHA-256 hash của cleanedText
  cleanedText: string; // Nội dung sạch sau khi lọc nhiễu
  auditReport: ContractAuditReport; // Báo cáo thẩm định tương ứng
  createdAt: string; // ISO 8601
}

/**
 * Trạng thái đánh giá sự biến thiên giữa các phiên bản
 */
export type ComparisonStatus = 'IMPROVED' | 'REGRESSED' | 'UNCHANGED';

/**
 * Kết quả so sánh khác biệt giữa 2 phiên bản hợp đồng (Audit Diff)
 */
export interface VersionComparisonResult {
  previousVersion: number;
  currentVersion: number;
  scoreDelta: number; // currScore - prevScore (Ví dụ: +58 điểm)
  resolvedViolations: ClauseAuditFinding[]; // Rủi ro ở bản trước đã được sửa
  newViolations: ClauseAuditFinding[]; // Rủi ro mới phát sinh trong bản này
  status: ComparisonStatus;
  summary: string;
}

/**
 * DTO tạo phiên bản mới
 */
export interface CreateVersionDto {
  fileName: string;
  fileType: string;
  contentHash: string;
  cleanedText: string;
  auditReport: ContractAuditReport;
}

/**
 * Giao diện lưu trữ phiên bản hợp đồng
 */
export interface IContractVersionStore {
  createDocument(title: string, category: ContractCategory): Promise<ContractDocument>;
  getDocument(documentId: string): Promise<ContractDocument | null>;
  addVersion(documentId: string, versionData: CreateVersionDto): Promise<ContractVersion>;
  getVersion(documentId: string, versionNumber: number): Promise<ContractVersion | null>;
  listVersions(documentId: string): Promise<ContractVersion[]>;
}

/**
 * Lỗi khi người dùng tải lên nội dung trùng lặp hệt bản hiện tại
 */
export class DuplicateContentError extends Error {
  constructor(public readonly documentId: string, public readonly contentHash: string) {
    super(`Nội dung tệp tải lên hoàn toàn trùng khớp với phiên bản hiện tại (Mã băm: ${contentHash.substring(0, 8)}...).`);
    this.name = 'DuplicateContentError';
  }
}

/**
 * Tham số tiếp nhận tài liệu và thẩm định
 */
export interface LifecycleUploadParams {
  documentId?: string; // Nếu không truyền sẽ tạo document mới (v1)
  title?: string;
  category?: ContractCategory;
  fileBuffer: Buffer | string;
  fileName: string;
  fileType: string; // 'docx' | 'pdf' | 'txt' | 'md'
}

/**
 * Kết quả tổng thể của chu trình thẩm định vòng đời
 */
export interface LifecycleAuditResult {
  document: ContractDocument;
  version: ContractVersion;
  comparison?: VersionComparisonResult;
}
