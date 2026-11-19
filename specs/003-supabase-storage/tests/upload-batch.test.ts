import { describe, it, expect } from 'vitest';
import { readAllProcessedChunks, toSupabaseRow } from '../../../scripts/upload-chunks-to-supabase.mjs';

describe('Batch Upload Pipeline (Slice 3)', () => {
  it('đọc chính xác toàn bộ 4.715 chunks từ data/processed/', async () => {
    const chunks = await readAllProcessedChunks();
    expect(chunks.length).toBe(4715);
  });

  it('toàn bộ 4.715 chunks thỏa mãn các ràng buộc schema của public.legal_chunks', async () => {
    const chunks = await readAllProcessedChunks();
    const validDomains = new Set(['TRAFFIC', 'LABOR', 'SOCIAL_INSURANCE', 'HOUSING', 'OTHER']);

    for (let i = 0; i < chunks.length; i++) {
      const row = toSupabaseRow(chunks[i]);

      // Ràng buộc 1: id không được rỗng
      expect(row.id).toBeDefined();
      expect(typeof row.id).toBe('string');
      expect(row.id.length).toBeGreaterThan(0);

      // Ràng buộc 2: doc_number không được rỗng
      expect(row.doc_number).toBeDefined();
      expect(typeof row.doc_number).toBe('string');
      expect(row.doc_number.length).toBeGreaterThan(0);

      // Ràng buộc 3: domain nằm trong whitelist ENUM CHECK
      expect(validDomains.has(row.domain)).toBe(true);

      // Ràng buộc 4: article và content không được rỗng
      expect(row.article).toBeDefined();
      expect(row.content).toBeDefined();
      expect(row.content.length).toBeGreaterThan(0);

      // Ràng buộc 5: full_reference phục vụ trích dẫn
      expect(row.full_reference).toBeDefined();
      expect(row.full_reference.length).toBeGreaterThan(0);
    }
  });

  it('phân chia 4.715 chunks thành đúng 10 lô theo BATCH_SIZE 500', async () => {
    const chunks = await readAllProcessedChunks();
    const batchSize = 500;
    const totalBatches = Math.ceil(chunks.length / batchSize);

    expect(totalBatches).toBe(10); // 4715 / 500 = 9 lô 500 + 1 lô 215

    const batches: unknown[][] = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }

    expect(batches.length).toBe(10);
    expect(batches[0].length).toBe(500);
    expect(batches[8].length).toBe(500);
    expect(batches[9].length).toBe(215);
  });
});
