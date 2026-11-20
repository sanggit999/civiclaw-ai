import { describe, it, expect } from 'vitest';
import { InMemoryContractVersionStore } from '../../../src/contract/in-memory-version-store.js';
import { DuplicateContentError } from '../../../src/contract/version-types.js';
import { ContractAuditReport } from '../../../src/contract/types.js';

describe('ContractVersionStore (Lát 2: Quản lý Hồ sơ & Phiên bản Hợp đồng)', () => {
  const dummyReport: ContractAuditReport = {
    documentTitle: 'HĐLĐ Thử nghiệm',
    category: 'labor',
    safetyScore: 85,
    riskTier: 'SAFE',
    summary: 'An toàn',
    stats: { totalClauses: 3, redCount: 0, yellowCount: 1, greenCount: 2, missingMandatoryCount: 0 },
    findings: [],
    missingClauses: [],
    auditedAt: new Date().toISOString(),
  };

  it('khởi tạo hồ sơ hợp đồng mới và thêm phiên bản 1 thành công', async () => {
    const store = new InMemoryContractVersionStore();

    const doc = await store.createDocument('Hợp đồng lao động XYZ', 'labor');
    expect(doc.id).toBeDefined();
    expect(doc.title).toBe('Hợp đồng lao động XYZ');
    expect(doc.currentVersion).toBe(1);

    const v1 = await store.addVersion(doc.id, {
      fileName: 'HDLD_v1.docx',
      fileType: 'docx',
      contentHash: 'hash-abc-123',
      cleanedText: 'Điều 1: Công việc. Điều 2: Lương.',
      auditReport: dummyReport,
    });

    expect(v1.documentId).toBe(doc.id);
    expect(v1.versionNumber).toBe(1);
    expect(v1.fileName).toBe('HDLD_v1.docx');

    const retrievedDoc = await store.getDocument(doc.id);
    expect(retrievedDoc?.currentVersion).toBe(1);
  });

  it('tự động tăng versionNumber thành v2 và v3 khi tải lên các bản sửa đổi tiếp theo', async () => {
    const store = new InMemoryContractVersionStore();
    const doc = await store.createDocument('Hợp đồng thuê nhà', 'rental');

    const v1 = await store.addVersion(doc.id, {
      fileName: 'HD_Thue_v1.pdf',
      fileType: 'pdf',
      contentHash: 'hash-111',
      cleanedText: 'Bản thảo 1',
      auditReport: dummyReport,
    });
    expect(v1.versionNumber).toBe(1);

    const v2 = await store.addVersion(doc.id, {
      fileName: 'HD_Thue_v2.pdf',
      fileType: 'pdf',
      contentHash: 'hash-222',
      cleanedText: 'Bản thảo 2 đã sửa',
      auditReport: dummyReport,
    });
    expect(v2.versionNumber).toBe(2);

    const list = await store.listVersions(doc.id);
    expect(list).toHaveLength(2);
    expect(list[0].versionNumber).toBe(1);
    expect(list[1].versionNumber).toBe(2);

    const updatedDoc = await store.getDocument(doc.id);
    expect(updatedDoc?.currentVersion).toBe(2);
  });

  it('chặn tải lên nội dung trùng lặp (DuplicateContentError) trên cùng một hồ sơ hợp đồng', async () => {
    const store = new InMemoryContractVersionStore();
    const doc = await store.createDocument('Giấy vay nợ', 'civil_loan');

    await store.addVersion(doc.id, {
      fileName: 'GiayVay_v1.txt',
      fileType: 'txt',
      contentHash: 'hash-duplicate-xyz',
      cleanedText: 'Vay 50 triệu',
      auditReport: dummyReport,
    });

    // Cố gắng tải lại file có cùng mã băm contentHash
    await expect(
      store.addVersion(doc.id, {
        fileName: 'GiayVay_Copy.txt',
        fileType: 'txt',
        contentHash: 'hash-duplicate-xyz',
        cleanedText: 'Vay 50 triệu',
        auditReport: dummyReport,
      })
    ).rejects.toThrow(DuplicateContentError);
  });

  it('SupabaseContractVersionStore: lưu trữ và truy vấn qua mock Supabase client', async () => {
    const { SupabaseContractVersionStore } = await import('../../../src/contract/supabase-version-store.js');

    const mockDocRow = {
      id: 'doc-supabase-1',
      title: 'HĐLĐ Supabase Cloud',
      category: 'labor',
      current_version: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const mockVersionRow = {
      id: 'ver-supabase-1',
      document_id: 'doc-supabase-1',
      version_number: 1,
      file_name: 'HDLD.docx',
      file_type: 'docx',
      content_hash: 'hash-supabase-123',
      cleaned_text: 'Điều 1: Lương.',
      audit_report: dummyReport,
      created_at: '2026-01-01T00:00:00Z',
    };

    const mockClient = {
      from: (table: string) => {
        if (table === 'contract_documents') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: mockDocRow, error: null }),
              }),
            }),
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: mockDocRow, error: null }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        }
        if (table === 'contract_versions') {
          return {
            select: (cols: string, opts?: any) => {
              if (opts?.count === 'exact') {
                return {
                  eq: async () => ({ count: 0, error: null }),
                };
              }
              return {
                eq: (col: string, val: any) => ({
                  eq: (col2: string, val2: any) => ({
                    maybeSingle: async () => ({ data: null, error: null }), // Không trùng hash
                  }),
                  maybeSingle: async () => ({ data: mockVersionRow, error: null }),
                  order: async () => ({ data: [mockVersionRow], error: null }),
                }),
              };
            },
            insert: () => ({
              select: () => ({
                single: async () => ({ data: mockVersionRow, error: null }),
              }),
            }),
          };
        }
        return {} as any;
      },
    } as any;

    const supabaseStore = new SupabaseContractVersionStore(mockClient);

    const doc = await supabaseStore.createDocument('HĐLĐ Supabase Cloud', 'labor');
    expect(doc.id).toBe('doc-supabase-1');

    const v1 = await supabaseStore.addVersion('doc-supabase-1', {
      fileName: 'HDLD.docx',
      fileType: 'docx',
      contentHash: 'hash-supabase-123',
      cleanedText: 'Điều 1: Lương.',
      auditReport: dummyReport,
    });
    expect(v1.versionNumber).toBe(1);

    const list = await supabaseStore.listVersions('doc-supabase-1');
    expect(list).toHaveLength(1);
    expect(list[0].fileName).toBe('HDLD.docx');
  });
});
