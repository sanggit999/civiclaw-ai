import { describe, it, expect } from 'vitest';
import { DocumentParser } from '../../../src/contract/document-parser.js';

describe('DocumentParser (Lát 1: Bóc tách & Làm sạch Nhiễu Tài liệu)', () => {
  it('loại bỏ các dòng số trang và header lặp lại giữa các trang', async () => {
    const rawDocumentText = `
HỢP ĐỒNG LAO ĐỘNG
Công ty XYZ và Ông Nguyễn Văn A

Trang 1/3
---------------------------------------------
Điều 1: Vị trí công việc lập trình viên.
Điều 2: Tiền lương 20.000.000 VNĐ / tháng.

Page 2 of 3
---------------------------------------------
Điều 3: Thời gian làm việc 8h/ngày.
Điều 4: Thử việc là 30 ngày.

Trang 3/3
---------------------------------------------
Điều 5: Bảo hiểm xã hội đầy đủ.
`;

    const result = await DocumentParser.parse(rawDocumentText, 'txt');

    expect(result.rawText).toBe(rawDocumentText);
    expect(result.cleanedText).not.toContain('Trang 1/3');
    expect(result.cleanedText).not.toContain('Page 2 of 3');
    expect(result.cleanedText).not.toContain('Trang 3/3');
    expect(result.cleanedText).toContain('Điều 1: Vị trí công việc');
    expect(result.cleanedText).toContain('Điều 5: Bảo hiểm xã hội đầy đủ.');
    expect(result.contentHash).toBeDefined();
    expect(result.contentHash).toHaveLength(64); // SHA-256 hex string
  });

  it('sinh mã băm SHA-256 nhất quán cho các văn bản có cùng nội dung sạch', async () => {
    const textA = 'Điều 1: Lương 10 triệu.\n\nTrang 1/2\n\nĐiều 2: Thử việc 30 ngày.';
    const textB = 'Điều 1: Lương 10 triệu.\n\nTrang 2/2\n\nĐiều 2: Thử việc 30 ngày.';

    const resultA = await DocumentParser.parse(textA, 'txt');
    const resultB = await DocumentParser.parse(textB, 'txt');

    // Sau khi lọc bỏ các dòng "Trang ...", cả 2 văn bản có nội dung sạch giống hệt nhau
    expect(resultA.cleanedText).toBe(resultB.cleanedText);
    expect(resultA.contentHash).toBe(resultB.contentHash);
  });

  it('xử lý an toàn khi đầu vào là Buffer hoặc chuỗi rỗng', async () => {
    const buffer = Buffer.from('Hợp đồng thuê nhà. Điều 1: Giá thuê 5 triệu.', 'utf-8');
    const result = await DocumentParser.parse(buffer, 'txt');

    expect(result.cleanedText).toContain('Giá thuê 5 triệu');
    expect(result.contentHash).toBeDefined();

    const emptyResult = await DocumentParser.parse('', 'txt');
    expect(emptyResult.cleanedText).toBe('');
    expect(emptyResult.contentHash).toBeDefined();
  });
});
