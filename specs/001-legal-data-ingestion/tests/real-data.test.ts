import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanLegalText } from '../../../src/ingestion/cleaner';
import { parseLegalText } from '../../../src/ingestion/parser';
import { LegalDocumentMetadata } from '../../../src/ingestion/types';

describe('Real Legal Data Ingestion - Nghị định 168/2024/NĐ-CP', () => {
  const rawPath = path.resolve('data/raw/168_2024_ND-CP.txt');

  it('phải tải và đọc được file toàn văn thô data/raw/168_2024_ND-CP.txt', () => {
    expect(fs.existsSync(rawPath)).toBe(true);
    const content = fs.readFileSync(rawPath, 'utf-8');
    expect(content.length).toBeGreaterThan(50000);
  });

  it('phải làm sạch và phân đoạn chính xác các điều khoản xử phạt trong Nghị định 168', () => {
    const rawText = fs.readFileSync(rawPath, 'utf-8');
    const cleanedText = cleanLegalText(rawText);

    const metadata: LegalDocumentMetadata = {
      docNumber: '168/2024/NĐ-CP',
      title: 'Nghị định 168/2024/NĐ-CP quy định xử phạt vi phạm hành chính về trật tự ATGT đường bộ',
      domain: 'TRAFFIC',
      issueDate: '2024-12-26',
      effectiveDate: '2025-01-01',
      isActive: true,
      sourceUrl: 'https://vanban.chinhphu.vn/?pageid=27160&docid=212167',
    };

    const chunks = parseLegalText(cleanedText, metadata);

    // Kiểm tra số lượng chunk phân đoạn và domain chuẩn chữ hoa
    expect(chunks.length).toBeGreaterThan(100);
    expect(chunks[0]?.domain).toBe('TRAFFIC');

    // Tìm chunk cụ thể: Điểm a Khoản 2 Điều 6 (lỗi chuyển làn đường)
    const chunkD6K2Pa = chunks.find((c) =>
      c.article === 'Điều 6' && c.clause === 'Khoản 2' && c.point === 'Điểm a'
    );

    expect(chunkD6K2Pa).toBeDefined();
    expect(chunkD6K2Pa?.fullReference).toBe('Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP');
    // Ngữ cảnh phải có đầy đủ: tên Điều 6 + mức phạt của Khoản 2 + hành vi của Điểm a
    expect(chunkD6K2Pa?.content).toContain('Điều 6. Xử phạt, trừ điểm giấy phép lái xe');
    expect(chunkD6K2Pa?.content).toContain('600.000 đồng đến 800.000 đồng');
    expect(chunkD6K2Pa?.content).toContain('Chuyển làn đường không đúng nơi cho phép');

    // Ghi kết quả kiểm thử ra thư mục tạm thay vì ghi đè dữ liệu production trong data/processed/
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'civiclaw-ingest-'));
    const outputPath = path.join(tempDir, '168_2024_ND-CP.chunks.json');
    try {
      fs.writeFileSync(outputPath, JSON.stringify(chunks, null, 2), 'utf-8');
      expect(fs.existsSync(outputPath)).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
