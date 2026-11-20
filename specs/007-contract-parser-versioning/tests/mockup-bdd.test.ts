import { describe, it, expect } from 'vitest';
import { ContractLifecycleManager } from '../../../src/contract/contract-lifecycle-manager.js';
import { DocumentParser } from '../../../src/contract/document-parser.js';
import { DuplicateContentError } from '../../../src/contract/version-types.js';

describe('Contract Document Versioning & Parser (Lát 4: BDD Mockup & Kiểm chứng 5 Kịch bản)', () => {
  it('Kịch bản 1: Bóc tách & Làm sạch Nhiễu Tài liệu (Happy Path Parser)', async () => {
    const rawContentWithNoise = `
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

HỢP ĐỒNG LAO ĐỘNG
Số: 99/2026/HĐLĐ

Trang 1/2
----------------------------------------
Điều 1: Vị trí việc làm và địa điểm
Lập trình viên Fullstack tại Cầu Giấy, Hà Nội.

Page 2 of 2
----------------------------------------
Điều 2: Tiền lương và phụ cấp
Mức lương chính thức 25.000.000 VNĐ/tháng.
`;

    const parsed = await DocumentParser.parse(rawContentWithNoise, 'docx');

    expect(parsed.cleanedText).not.toContain('Trang 1/2');
    expect(parsed.cleanedText).not.toContain('Page 2 of 2');
    expect(parsed.cleanedText).toContain('Điều 1: Vị trí việc làm');
    expect(parsed.cleanedText).toContain('Điều 2: Tiền lương và phụ cấp');
    expect(parsed.contentHash).toBeDefined();
    expect(parsed.contentHash.length).toBe(64);
  });

  it('Kịch bản 2: Khởi tạo Hồ sơ Hợp đồng & Lưu Phiên bản 1 (Happy Path v1 Upload)', async () => {
    const manager = new ContractLifecycleManager();

    const rawV1 = `
HỢP ĐỒNG LAO ĐỘNG
Điều 1: Vị trí lập trình viên.
Điều 2: Thời gian thử việc là 120 ngày kể từ ngày ký.
Điều 3: Người lao động phải nộp giữ bản chính Bằng tốt nghiệp Đại học cho Công ty.
Điều 4: Tiền lương 20 triệu/tháng.
`;

    const result = await manager.uploadAndAudit({
      title: 'Hợp đồng lao động Công nghệ XYZ',
      fileName: 'HDLD_XYZ_v1.docx',
      fileType: 'docx',
      fileBuffer: rawV1,
    });

    expect(result.document.id).toBeDefined();
    expect(result.document.currentVersion).toBe(1);
    expect(result.document.category).toBe('labor');
    expect(result.version.versionNumber).toBe(1);
    expect(result.version.auditReport.safetyScore).toBeLessThan(60); // Bị trừ điểm do 2 lỗi vi phạm
    expect(result.comparison).toBeUndefined(); // Bản v1 chưa có bản trước để so sánh
  });

  it('Kịch bản 3: Tải lên Phiên bản 2 & So sánh Lịch sử Thẩm định (Happy Path v2 Diff & Resolved Risks)', async () => {
    const manager = new ContractLifecycleManager();

    // 1. Tải lên Version 1 (Bản thảo đầu tiên bị lỗi giữ bằng và thử việc 120 ngày)
    const rawV1 = `
HỢP ĐỒNG LAO ĐỘNG
Điều 1: Vị trí lập trình viên.
Điều 2: Thời gian thử việc là 120 ngày kể từ ngày ký.
Điều 3: Người lao động phải nộp giữ bản chính Bằng tốt nghiệp Đại học cho Công ty.
Điều 4: Tiền lương 20 triệu/tháng.
Điều 5: Thời giờ làm việc 8h/ngày.
Điều 6: Bảo hiểm xã hội đóng đầy đủ theo quy định.
Điều 7: Trang bị bảo hộ lao động đầy đủ.
`;

    const resV1 = await manager.uploadAndAudit({
      title: 'Hợp đồng lao động XYZ',
      fileName: 'HDLD_v1.docx',
      fileType: 'docx',
      fileBuffer: rawV1,
    });

    const docId = resV1.document.id;
    expect(resV1.version.versionNumber).toBe(1);
    expect(resV1.version.auditReport.stats.redCount).toBe(2);

    // 2. Đối tác đã đồng ý sửa đổi -> Tải lên Version 2
    const rawV2 = `
HỢP ĐỒNG LAO ĐỘNG
Điều 1: Vị trí lập trình viên.
Điều 2: Thời gian thử việc là 60 ngày theo đúng quy định pháp luật.
Điều 3: Người lao động tự lưu giữ bản chính bằng tốt nghiệp, Công ty chỉ thu bản sao công chứng.
Điều 4: Tiền lương 20 triệu/tháng.
Điều 5: Thời giờ làm việc 8h/ngày.
Điều 6: Bảo hiểm xã hội đóng đầy đủ theo quy định.
Điều 7: Trang bị bảo hộ lao động đầy đủ.
`;

    const resV2 = await manager.uploadAndAudit({
      documentId: docId, // Gắn vào cùng một hồ sơ hợp đồng
      fileName: 'HDLD_v2_chinhsua.docx',
      fileType: 'docx',
      fileBuffer: rawV2,
    });

    expect(resV2.document.id).toBe(docId);
    expect(resV2.document.currentVersion).toBe(2);
    expect(resV2.version.versionNumber).toBe(2);
    expect(resV2.version.auditReport.stats.redCount).toBe(0); // Đã sạch vi phạm

    // Kiểm chứng Động cơ So sánh Lịch sử (Audit Diff Engine)
    expect(resV2.comparison).toBeDefined();
    expect(resV2.comparison?.previousVersion).toBe(1);
    expect(resV2.comparison?.currentVersion).toBe(2);
    expect(resV2.comparison?.scoreDelta).toBeGreaterThanOrEqual(40); // Điểm tăng vọt
    expect(resV2.comparison?.status).toBe('IMPROVED');
    expect(resV2.comparison?.resolvedViolations.length).toBe(2); // 2 vi phạm đã được giải quyết
    expect(resV2.comparison?.newViolations.length).toBe(0); // 0 vi phạm mới
  });

  it('Kịch bản 4: Chặn tải lên tệp nội dung trùng lặp (Duplicate Content Guard)', async () => {
    const manager = new ContractLifecycleManager();

    const content = `
HỢP ĐỒNG THUÊ PHÒNG TRỌ
Điều 1: Giá thuê 3 triệu/tháng.
Điều 2: Đặt cọc 3 triệu.
`;

    const resV1 = await manager.uploadAndAudit({
      fileName: 'ThueNha_v1.txt',
      fileType: 'txt',
      fileBuffer: content,
    });

    // Cố tình tải lại nội dung hệt bản v1 (chỉ thêm số trang rác)
    const duplicateWithNoise = `
${content}
Trang 1/1
------------------
`;

    await expect(
      manager.uploadAndAudit({
        documentId: resV1.document.id,
        fileName: 'ThueNha_Copy.txt',
        fileType: 'txt',
        fileBuffer: duplicateWithNoise,
      })
    ).rejects.toThrow(DuplicateContentError);
  });

  it('Kịch bản 5: Quản lý Phiên bản Đa Môi trường & Lịch sử Đầy Đủ', async () => {
    const manager = new ContractLifecycleManager();

    const res = await manager.uploadAndAudit({
      title: 'Hợp đồng dân sự vay mượn',
      fileName: 'Vay_v1.txt',
      fileType: 'txt',
      fileBuffer: 'Điều 1: Vay 10 triệu, lãi suất 15%/năm.',
    });

    const history = await manager.getDocumentHistory(res.document.id);
    expect(history.document.title).toBe('Hợp đồng dân sự vay mượn');
    expect(history.versions).toHaveLength(1);
    expect(history.versions[0].fileName).toBe('Vay_v1.txt');
  });
});
