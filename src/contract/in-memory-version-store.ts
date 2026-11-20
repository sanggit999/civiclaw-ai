import { randomUUID } from 'node:crypto';
import { ContractCategory } from './types.js';
import {
  ContractDocument,
  ContractVersion,
  CreateVersionDto,
  DuplicateContentError,
  IContractVersionStore,
} from './version-types.js';

/**
 * Bộ Lưu Trữ Phiên Bản Hợp Đồng Trong Bộ Nhớ (In-Memory Version Store)
 * Phục vụ kiểm thử offline siêu tốc, zero network cost, độc lập môi trường.
 */
export class InMemoryContractVersionStore implements IContractVersionStore {
  private documents: Map<string, ContractDocument> = new Map();
  private versions: Map<string, ContractVersion[]> = new Map();

  async createDocument(title: string, category: ContractCategory): Promise<ContractDocument> {
    const now = new Date().toISOString();
    const doc: ContractDocument = {
      id: randomUUID(),
      title,
      category,
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.documents.set(doc.id, doc);
    this.versions.set(doc.id, []);
    return doc;
  }

  async getDocument(documentId: string): Promise<ContractDocument | null> {
    return this.documents.get(documentId) || null;
  }

  async addVersion(documentId: string, versionData: CreateVersionDto): Promise<ContractVersion> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error(`Hồ sơ hợp đồng với mã định danh "${documentId}" không tồn tại.`);
    }

    const docVersions = this.versions.get(documentId) || [];

    // Kiểm tra trùng lặp nội dung (Duplicate Content Guard qua SHA-256)
    const isDuplicate = docVersions.some((v) => v.contentHash === versionData.contentHash);
    if (isDuplicate) {
      throw new DuplicateContentError(documentId, versionData.contentHash);
    }

    const nextVersionNumber = docVersions.length + 1;
    const now = new Date().toISOString();

    const version: ContractVersion = {
      id: randomUUID(),
      documentId,
      versionNumber: nextVersionNumber,
      fileName: versionData.fileName,
      fileType: versionData.fileType,
      contentHash: versionData.contentHash,
      cleanedText: versionData.cleanedText,
      auditReport: versionData.auditReport,
      createdAt: now,
    };

    docVersions.push(version);
    this.versions.set(documentId, docVersions);

    // Cập nhật số phiên bản hiện tại của hồ sơ hợp đồng
    doc.currentVersion = nextVersionNumber;
    doc.updatedAt = now;
    this.documents.set(documentId, doc);

    return version;
  }

  async getVersion(documentId: string, versionNumber: number): Promise<ContractVersion | null> {
    const docVersions = this.versions.get(documentId);
    if (!docVersions) return null;
    return docVersions.find((v) => v.versionNumber === versionNumber) || null;
  }

  async listVersions(documentId: string): Promise<ContractVersion[]> {
    const docVersions = this.versions.get(documentId) || [];
    return [...docVersions].sort((a, b) => a.versionNumber - b.versionNumber);
  }
}
