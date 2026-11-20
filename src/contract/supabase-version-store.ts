import { SupabaseClient } from '@supabase/supabase-js';
import { ContractCategory } from './types.js';
import {
  ContractDocument,
  ContractVersion,
  CreateVersionDto,
  DuplicateContentError,
  IContractVersionStore,
} from './version-types.js';

/**
 * Bộ Lưu Trữ Phiên Bản Hợp Đồng Trên Supabase Cloud PostgreSQL
 * Tương tác với bảng `public.contract_documents` và `public.contract_versions`.
 */
export class SupabaseContractVersionStore implements IContractVersionStore {
  constructor(private supabaseClient: SupabaseClient) {}

  async createDocument(title: string, category: ContractCategory): Promise<ContractDocument> {
    const { data, error } = await this.supabaseClient
      .from('contract_documents')
      .insert({
        title,
        category,
        current_version: 1,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Lỗi tạo hồ sơ hợp đồng trên Supabase: ${error?.message || 'Không có dữ liệu trả về'}`);
    }

    return {
      id: data.id,
      title: data.title,
      category: data.category as ContractCategory,
      currentVersion: data.current_version,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getDocument(documentId: string): Promise<ContractDocument | null> {
    const { data, error } = await this.supabaseClient
      .from('contract_documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title,
      category: data.category as ContractCategory,
      currentVersion: data.current_version,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async addVersion(documentId: string, versionData: CreateVersionDto): Promise<ContractVersion> {
    // 1. Kiểm tra tồn tại hồ sơ hợp đồng
    const doc = await this.getDocument(documentId);
    if (!doc) {
      throw new Error(`Hồ sơ hợp đồng với mã định danh "${documentId}" không tồn tại.`);
    }

    // 2. Kiểm tra trùng lặp mã băm SHA-256 (Duplicate Content Guard)
    const { data: existingDup } = await this.supabaseClient
      .from('contract_versions')
      .select('id')
      .eq('document_id', documentId)
      .eq('content_hash', versionData.contentHash)
      .maybeSingle();

    if (existingDup) {
      throw new DuplicateContentError(documentId, versionData.contentHash);
    }

    // 3. Đếm số lượng phiên bản hiện có để cấp versionNumber tiếp theo
    const { count, error: countErr } = await this.supabaseClient
      .from('contract_versions')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    if (countErr) {
      throw new Error(`Lỗi đếm số phiên bản hợp đồng: ${countErr.message}`);
    }

    const nextVersionNumber = (count || 0) + 1;

    // 4. Thêm bản ghi phiên bản mới
    const { data: versionRecord, error: insertErr } = await this.supabaseClient
      .from('contract_versions')
      .insert({
        document_id: documentId,
        version_number: nextVersionNumber,
        file_name: versionData.fileName,
        file_type: versionData.fileType,
        content_hash: versionData.contentHash,
        cleaned_text: versionData.cleanedText,
        audit_report: versionData.auditReport,
      })
      .select('*')
      .single();

    if (insertErr || !versionRecord) {
      throw new Error(`Lỗi lưu phiên bản hợp đồng trên Supabase: ${insertErr?.message}`);
    }

    // 5. Cập nhật số phiên bản hiện tại trên bảng contract_documents
    await this.supabaseClient
      .from('contract_documents')
      .update({
        current_version: nextVersionNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    return {
      id: versionRecord.id,
      documentId: versionRecord.document_id,
      versionNumber: versionRecord.version_number,
      fileName: versionRecord.file_name,
      fileType: versionRecord.file_type,
      contentHash: versionRecord.content_hash,
      cleanedText: versionRecord.cleaned_text,
      auditReport: versionRecord.audit_report,
      createdAt: versionRecord.created_at,
    };
  }

  async getVersion(documentId: string, versionNumber: number): Promise<ContractVersion | null> {
    const { data, error } = await this.supabaseClient
      .from('contract_versions')
      .select('*')
      .eq('document_id', documentId)
      .eq('version_number', versionNumber)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      documentId: data.document_id,
      versionNumber: data.version_number,
      fileName: data.file_name,
      fileType: data.file_type,
      contentHash: data.content_hash,
      cleanedText: data.cleaned_text,
      auditReport: data.audit_report,
      createdAt: data.created_at,
    };
  }

  async listVersions(documentId: string): Promise<ContractVersion[]> {
    const { data, error } = await this.supabaseClient
      .from('contract_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: true });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      versionNumber: row.version_number,
      fileName: row.file_name,
      fileType: row.file_type,
      contentHash: row.content_hash,
      cleanedText: row.cleaned_text,
      auditReport: row.audit_report,
      createdAt: row.created_at,
    }));
  }
}
