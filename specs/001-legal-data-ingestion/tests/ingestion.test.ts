import { describe, it, expect } from 'vitest';
import { cleanLegalText } from '../../../src/ingestion/cleaner';
import { parseLegalText } from '../../../src/ingestion/parser';
import { LegalDocumentMetadata } from '../../../src/ingestion/types';

describe('001 - Legal Data Ingestion Pipeline', () => {
  describe('Kịch bản 3: Làm sạch rác văn bản (cleanLegalText)', () => {
    it('Given văn bản thô dính tiêu ngữ và số trang, When cleanLegalText, Then loại bỏ rác sạch sẽ', () => {
      const rawText = `
        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        Độc lập - Tự do - Hạnh phúc
        
        Trang 15/120

        Điều 6. Xử phạt người điều khiển xe mô tô, xe gắn máy
        1. Phạt tiền từ 100.000 đồng đến 200.000 đồng.

        25
      `;

      const cleaned = cleanLegalText(rawText);

      expect(cleaned).not.toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      expect(cleaned).not.toContain('Độc lập - Tự do - Hạnh phúc');
      expect(cleaned).not.toContain('Trang 15/120');
      expect(cleaned).toContain('Điều 6. Xử phạt người điều khiển xe mô tô, xe gắn máy');
      expect(cleaned).toContain('1. Phạt tiền từ 100.000 đồng đến 200.000 đồng.');
    });

    it('Given văn bản chứa thực thể HTML &#32; hoặc &nbsp;, When cleanLegalText, Then giải mã sạch không làm trượt regex', () => {
      const rawText = '&#32;2. Phạt tiền từ 600.000 đồng&nbsp;đến 800.000 đồng.';
      const cleaned = cleanLegalText(rawText);
      expect(cleaned).toBe('2. Phạt tiền từ 600.000 đồng đến 800.000 đồng.');
    });
  });

  describe('Kịch bản 1: Bóc tách phân cấp Điều -> Khoản -> Điểm (parseLegalText)', () => {
    it('Given Điều 6 có Khoản 2 và Điểm a, When parseLegalText, Then sinh chunk có fullReference và ngữ cảnh trọn vẹn', () => {
      const metadata: LegalDocumentMetadata = {
        docNumber: '168/2024/NĐ-CP',
        title: 'Nghị định quy định xử phạt vi phạm hành chính trong lĩnh vực giao thông',
        domain: 'TRAFFIC',
        issueDate: '2024-12-26',
        effectiveDate: '2025-01-01',
        isActive: true,
      };

      const legalText = `
Điều 6. Xử phạt người điều khiển xe mô tô, xe gắn máy
2. Phạt tiền từ 300.000 đồng đến 400.000 đồng đối với một trong các hành vi vi phạm sau đây:
a) Không chấp hành hiệu lệnh, chỉ dẫn của biển báo hiệu, vạch kẻ đường.
b) Chở người ngồi trên xe không đội mũ bảo hiểm.
      `;

      const chunks = parseLegalText(legalText, metadata);

      // Phải tách thành 2 chunks cho 2 điểm a và b
      expect(chunks.length).toBe(2);

      const chunkA = chunks.find((c) => c.point === 'Điểm a');
      expect(chunkA).toBeDefined();
      expect(chunkA?.fullReference).toBe('Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP');
      expect(chunkA?.article).toBe('Điều 6');
      expect(chunkA?.clause).toBe('Khoản 2');
      expect(chunkA?.domain).toBe('TRAFFIC');

      // Ngữ cảnh phải trọn vẹn: có cả tiêu đề Điều, mức phạt của Khoản và hành vi của Điểm
      expect(chunkA?.content).toContain('Điều 6');
      expect(chunkA?.content).toContain('300.000 đồng đến 400.000 đồng');
      expect(chunkA?.content).toContain('Không chấp hành hiệu lệnh, chỉ dẫn của biển báo hiệu, vạch kẻ đường');

      // Từ khóa trích xuất tự động phải có số tiền và đối tượng
      expect(chunkA?.keywords).toEqual(
        expect.arrayContaining(['300.000 đồng', '400.000 đồng'])
      );
    });
  });

  describe('Kịch bản 2: Gắn đúng Metadata và xử lý Điều không có Khoản', () => {
    it('Given Điều luật đứng một mình không có Khoản/Điểm, When parseLegalText, Then tạo 1 chunk cấp Điều duy nhất', () => {
      const metadata: LegalDocumentMetadata = {
        docNumber: '45/2019/QH14',
        title: 'Bộ luật Lao động 2019',
        domain: 'LABOR',
        issueDate: '2019-11-20',
        effectiveDate: '2021-01-01',
        isActive: true,
      };

      const legalText = `
Điều 1. Phạm vi điều chỉnh
Bộ luật này quy định tiêu chuẩn lao động; quyền, nghĩa vụ, trách nhiệm của người lao động.
      `;

      const chunks = parseLegalText(legalText, metadata);

      expect(chunks.length).toBe(1);
      expect(chunks[0].fullReference).toBe('Điều 1 Bộ luật Lao động 2019');
      expect(chunks[0].article).toBe('Điều 1');
      expect(chunks[0].clause).toBeUndefined();
      expect(chunks[0].point).toBeUndefined();
      expect(chunks[0].domain).toBe('LABOR');
    });
  });
});
