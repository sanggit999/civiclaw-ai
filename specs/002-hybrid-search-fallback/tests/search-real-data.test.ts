import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LegalSearchEngine } from '../../../src/search/engine.js';
import { KnowledgeGapQueue } from '../../../src/search/gap-queue.js';
import { LegalChunk } from '../../../src/ingestion/types.js';

describe('Real Data Search & Fallback Verification (4.501 chunks)', () => {
  let engine: LegalSearchEngine;
  let gapQueue: KnowledgeGapQueue;

  beforeAll(() => {
    gapQueue = new KnowledgeGapQueue();
    const processedDir = path.resolve('data/processed');

    const files = [
      '168_2024_ND-CP.chunks.json',
      '36_2024_QH15.chunks.json',
      '45_2019_QH14.chunks.json',
      '41_2024_QH15.chunks.json',
      '27_2023_QH15.chunks.json',
    ];

    const allChunks: LegalChunk[] = [];
    for (const file of files) {
      const p = path.join(processedDir, file);
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const chunks: LegalChunk[] = JSON.parse(raw);
        allChunks.push(...chunks);
      }
    }

    expect(allChunks.length).toBeGreaterThanOrEqual(4000);
    engine = new LegalSearchEngine(allChunks, gapQueue);
  });

  it('phải tìm thấy chính xác lỗi chuyển làn xe ô tô trong 4.501 chunks thực tế', () => {
    const res = engine.search({
      text: 'lỗi chuyển làn đường xe ô tô không có tín hiệu báo trước',
    });

    expect(res.isFound).toBe(true);
    expect(res.topScore).toBeGreaterThanOrEqual(0.65);
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].chunk.fullReference).toBe(
      'Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP'
    );
    expect(res.results[0].chunk.content).toContain('600.000 đồng đến 800.000 đồng');
    expect(res.loggedToKnowledgeGap).toBe(false);
  });

  it('phải từ chối trả lời và ghi nhận vào Knowledge Gap Queue khi hỏi luật ngoài phạm vi (Luật Đất đai / Xuất nhập cảnh)', () => {
    const res = engine.search({
      text: 'thủ tục cấp hộ chiếu và thị thực xuất cảnh cho người nước ngoài',
    });

    expect(res.isFound).toBe(false);
    expect(res.results).toHaveLength(0);
    expect(res.loggedToKnowledgeGap).toBe(true);
    expect(res.message).toContain('Hệ thống chưa tìm thấy căn cứ pháp lý');

    const gaps = gapQueue.getAll();
    expect(gaps.length).toBeGreaterThan(0);
    const lastGap = gaps.find((g) => g.queryText.includes('hộ chiếu'));
    expect(lastGap).toBeDefined();
    expect(lastGap?.status).toBe('unreviewed');
  });
});
