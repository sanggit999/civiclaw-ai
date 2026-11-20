import { describe, it, expect } from 'vitest';
import { VersionDiffEngine } from '../../../src/contract/version-diff-engine.js';
import { ContractVersion } from '../../../src/contract/version-types.js';

describe('VersionDiffEngine (Lát 3: So sánh Lịch sử Thẩm định & Biến thiên Rủi ro)', () => {
  it('nhận diện chính xác các rủi ro đã được giải quyết và trạng thái IMPROVED khi điểm số tăng', () => {
    const v1: ContractVersion = {
      id: 'ver-1',
      documentId: 'doc-1',
      versionNumber: 1,
      fileName: 'HDLD_v1.docx',
      fileType: 'docx',
      contentHash: 'hash-v1',
      cleanedText: 'Thử việc 120 ngày. Giữ bằng gốc.',
      auditReport: {
        documentTitle: 'HĐLĐ XYZ',
        category: 'labor',
        safetyScore: 42,
        riskTier: 'HIGH_RISK',
        summary: 'Có 2 vi phạm',
        stats: { totalClauses: 2, redCount: 2, yellowCount: 0, greenCount: 0, missingMandatoryCount: 0 },
        findings: [
          {
            clauseId: 'dieu-2',
            clauseTitle: 'Điều 2: Thử việc',
            clauseText: 'Thử việc 120 ngày',
            riskLevel: 'RED_ILLEGAL',
            reason: 'Quá 60 ngày',
            statutoryViolations: ['Khoản 2 Điều 25 Bộ luật Lao động 2019'],
          },
          {
            clauseId: 'dieu-3',
            clauseTitle: 'Điều 3: Giữ bằng',
            clauseText: 'Nộp giữ bằng gốc',
            riskLevel: 'RED_ILLEGAL',
            reason: 'Cấm giữ bằng gốc',
            statutoryViolations: ['Khoản 1 Điều 17 Bộ luật Lao động 2019'],
          },
        ],
        missingClauses: [],
        auditedAt: '2026-01-01T00:00:00.000Z',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const v2: ContractVersion = {
      id: 'ver-2',
      documentId: 'doc-1',
      versionNumber: 2,
      fileName: 'HDLD_v2_chinhsua.docx',
      fileType: 'docx',
      contentHash: 'hash-v2',
      cleanedText: 'Thử việc 60 ngày. Tự lưu giữ bằng gốc.',
      auditReport: {
        documentTitle: 'HĐLĐ XYZ',
        category: 'labor',
        safetyScore: 100,
        riskTier: 'SAFE',
        summary: 'An toàn 100%',
        stats: { totalClauses: 2, redCount: 0, yellowCount: 0, greenCount: 2, missingMandatoryCount: 0 },
        findings: [
          {
            clauseId: 'dieu-2',
            clauseTitle: 'Điều 2: Thử việc',
            clauseText: 'Thử việc 60 ngày',
            riskLevel: 'GREEN_SAFE',
            reason: 'Hợp pháp',
            statutoryViolations: [],
          },
          {
            clauseId: 'dieu-3',
            clauseTitle: 'Điều 3: Giữ bằng',
            clauseText: 'Tự lưu giữ bản chính',
            riskLevel: 'GREEN_SAFE',
            reason: 'Hợp pháp',
            statutoryViolations: [],
          },
        ],
        missingClauses: [],
        auditedAt: '2026-01-05T00:00:00.000Z',
      },
      createdAt: '2026-01-05T00:00:00.000Z',
    };

    const diff = VersionDiffEngine.compareVersions(v1, v2);

    expect(diff.previousVersion).toBe(1);
    expect(diff.currentVersion).toBe(2);
    expect(diff.scoreDelta).toBe(58); // 100 - 42 = +58
    expect(diff.status).toBe('IMPROVED');
    expect(diff.resolvedViolations).toHaveLength(2);
    expect(diff.newViolations).toHaveLength(0);
    expect(diff.summary).toContain('Cải thiện rõ rệt');
  });

  it('cảnh báo rủi ro mới phát sinh và trạng thái REGRESSED khi bản sau cài cắm thêm điều bất lợi', () => {
    const v1: ContractVersion = {
      id: 'ver-1',
      documentId: 'doc-2',
      versionNumber: 1,
      fileName: 'HD_Thue_v1.txt',
      fileType: 'txt',
      contentHash: 'hash-thue-1',
      cleanedText: 'Giá thuê 5 triệu.',
      auditReport: {
        documentTitle: 'HĐ Thuê nhà',
        category: 'rental',
        safetyScore: 90,
        riskTier: 'SAFE',
        summary: 'Tương đối an toàn',
        stats: { totalClauses: 1, redCount: 0, yellowCount: 0, greenCount: 1, missingMandatoryCount: 0 },
        findings: [],
        missingClauses: [],
        auditedAt: '2026-01-01T00:00:00.000Z',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const v2: ContractVersion = {
      id: 'ver-2',
      documentId: 'doc-2',
      versionNumber: 2,
      fileName: 'HD_Thue_v2.txt',
      fileType: 'txt',
      contentHash: 'hash-thue-2',
      cleanedText: 'Giá thuê 5 triệu. Bên cho thuê có quyền tự ý tăng tiền thuê bất kỳ lúc nào.',
      auditReport: {
        documentTitle: 'HĐ Thuê nhà',
        category: 'rental',
        safetyScore: 80,
        riskTier: 'CAUTION',
        summary: 'Có điều khoản bất lợi',
        stats: { totalClauses: 2, redCount: 0, yellowCount: 1, greenCount: 1, missingMandatoryCount: 0 },
        findings: [
          {
            clauseId: 'dieu-2',
            clauseTitle: 'Điều 2: Tăng giá',
            clauseText: 'Tự ý tăng giá bất kỳ lúc nào',
            riskLevel: 'YELLOW_WARNING',
            reason: 'Bất lợi',
            statutoryViolations: ['Điều 165 Luật Nhà ở 2023'],
          },
        ],
        missingClauses: [],
        auditedAt: '2026-01-05T00:00:00.000Z',
      },
      createdAt: '2026-01-05T00:00:00.000Z',
    };

    const diff = VersionDiffEngine.compareVersions(v1, v2);

    expect(diff.scoreDelta).toBe(-10); // 80 - 90 = -10
    expect(diff.status).toBe('REGRESSED');
    expect(diff.resolvedViolations).toHaveLength(0);
    expect(diff.newViolations).toHaveLength(1);
    expect(diff.newViolations[0].statutoryViolations).toContain('Điều 165 Luật Nhà ở 2023');
  });
});
