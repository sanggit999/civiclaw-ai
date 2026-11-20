import { ContractCategory } from './types.js';
import {
  ContractDocument,
  ContractVersion,
  IContractVersionStore,
  LifecycleAuditResult,
  LifecycleUploadParams,
  VersionComparisonResult,
} from './version-types.js';
import { DocumentParser } from './document-parser.js';
import { InMemoryContractVersionStore } from './in-memory-version-store.js';
import { ContractAuditorAgent } from './contract-auditor-agent.js';
import { VersionDiffEngine } from './version-diff-engine.js';
import { ClauseSegmenter } from './clause-segmenter.js';

export interface ContractLifecycleDependencies {
  versionStore?: IContractVersionStore;
  auditorAgent?: ContractAuditorAgent;
}

/**
 * Bộ Điều Phối Vòng Đời Hợp Đồng (Contract Lifecycle Manager)
 * Kết nối liền mạch: Tiếp nhận file -> Bóc tách & Làm sạch -> Kiểm tra trùng lặp ->
 * Thẩm định Agentic -> Lưu trữ Phiên bản -> So sánh Lịch sử (Audit Diff).
 */
export class ContractLifecycleManager {
  private versionStore: IContractVersionStore;
  private auditorAgent: ContractAuditorAgent;

  constructor(dependencies?: ContractLifecycleDependencies) {
    this.versionStore = dependencies?.versionStore || new InMemoryContractVersionStore();
    this.auditorAgent = dependencies?.auditorAgent || new ContractAuditorAgent();
  }

  /**
   * Tiếp nhận tệp tài liệu, thẩm định và lưu phiên bản
   */
  async uploadAndAudit(params: LifecycleUploadParams): Promise<LifecycleAuditResult> {
    // 1. Bóc tách và làm sạch văn bản
    const parsed = await DocumentParser.parse(params.fileBuffer, params.fileType);

    // 2. Xác định hồ sơ hợp đồng hoặc khởi tạo mới
    let doc: ContractDocument;
    let prevVersion: ContractVersion | null = null;

    if (params.documentId) {
      const existing = await this.versionStore.getDocument(params.documentId);
      if (!existing) {
        throw new Error(`Hồ sơ hợp đồng với mã định danh "${params.documentId}" không tồn tại.`);
      }
      doc = existing;
      // Lấy phiên bản trước đó để chuẩn bị so sánh lịch sử
      prevVersion = await this.versionStore.getVersion(doc.id, doc.currentVersion);
    } else {
      const detectedCategory = params.category || ClauseSegmenter.detectCategory(parsed.cleanedText);
      const title = params.title || this.extractTitleFromText(parsed.cleanedText);
      doc = await this.versionStore.createDocument(title, detectedCategory);
    }

    // 3. Thực hiện thẩm định qua ContractAuditorAgent
    const auditReport = await this.auditorAgent.auditContract(parsed.cleanedText, doc.category);

    // 4. Lưu phiên bản vào Version Store (tự động kiểm tra DuplicateContentError)
    const version = await this.versionStore.addVersion(doc.id, {
      fileName: params.fileName,
      fileType: params.fileType,
      contentHash: parsed.contentHash,
      cleanedText: parsed.cleanedText,
      auditReport,
    });

    // Lấy lại hồ sơ đã được cập nhật currentVersion
    const updatedDoc = (await this.versionStore.getDocument(doc.id)) || doc;

    // 5. Nếu có phiên bản trước đó, thực hiện so sánh lịch sử (Audit Diff)
    let comparison: VersionComparisonResult | undefined;
    if (prevVersion) {
      comparison = VersionDiffEngine.compareVersions(prevVersion, version);
    }

    return {
      document: updatedDoc,
      version,
      comparison,
    };
  }

  /**
   * Truy vấn toàn bộ lịch sử đàm phán và danh sách phiên bản của hợp đồng
   */
  async getDocumentHistory(documentId: string): Promise<{ document: ContractDocument; versions: ContractVersion[] }> {
    const doc = await this.versionStore.getDocument(documentId);
    if (!doc) {
      throw new Error(`Hồ sơ hợp đồng với mã định danh "${documentId}" không tồn tại.`);
    }
    const versions = await this.versionStore.listVersions(documentId);
    return { document: doc, versions };
  }

  private extractTitleFromText(text: string): string {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => {
        const upper = l.toUpperCase();
        return (
          !upper.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM') &&
          !upper.includes('ĐỘC LẬP - TỰ DO - HẠNH PHÚC')
        );
      });

    return lines[0] || 'Văn bản Hợp đồng';
  }
}
