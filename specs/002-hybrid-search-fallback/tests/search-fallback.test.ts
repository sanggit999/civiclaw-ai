import { describe, it, expect, beforeEach } from 'vitest';
import { LegalSearchEngine } from '../../../src/search/engine.js';
import { KnowledgeGapQueue } from '../../../src/search/gap-queue.js';
import { LegalChunk } from '../../../src/ingestion/types.js';

describe('Feature 002: Legal Search, Fallback Guard & Knowledge Gap Queue', () => {
  let gapQueue: KnowledgeGapQueue;
  let engine: LegalSearchEngine;

  // Mock một số chunks luật đại diện từ Nghị định 168 & Luật Lao động
  const sampleChunks: LegalChunk[] = [
    {
      id: '168_2024_ND-CP_D6_K2_Pa',
      docNumber: '168/2024/NĐ-CP',
      domain: 'TRAFFIC',
      article: 'Điều 6',
      clause: 'Khoản 2',
      point: 'Điểm a',
      fullReference: 'Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP',
      content:
        'Điều 6. Xử phạt, trừ điểm giấy phép lái xe của người điều khiển xe ô tô...\n' +
        '2. Phạt tiền từ 600.000 đồng đến 800.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây:\n' +
        'a) Chuyển làn đường không đúng nơi cho phép hoặc không có tín hiệu báo trước...',
      keywords: ['600.000 đồng', '800.000 đồng', 'xe ô tô', 'ô tô', 'chuyển làn đường'],
    },
    {
      id: '45_2019_QH14_D25',
      docNumber: '45/2019/QH14',
      domain: 'LABOR',
      article: 'Điều 25',
      fullReference: 'Điều 25 Bộ luật Lao động 2019',
      content:
        'Điều 25. Thời giờ làm việc bình thường\n' +
        '1. Thời giờ làm việc bình thường không quá 08 giờ trong 01 ngày và không quá 48 giờ trong 01 tuần.',
      keywords: ['người lao động', 'thời giờ làm việc', 'tiền lương'],
    },
  ];

  beforeEach(() => {
    gapQueue = new KnowledgeGapQueue();
    engine = new LegalSearchEngine(sampleChunks, gapQueue);
  });

  it('Kịch bản 1: Phải tìm thấy đúng điều luật và trả về căn cứ trích dẫn chính xác khi câu hỏi có trong dữ liệu', () => {
    const response = engine.search({
      text: 'lỗi chuyển làn đường xe ô tô không có tín hiệu báo trước phạt bao nhiêu',
    });

    expect(response.isFound).toBe(true);
    expect(response.topScore).toBeGreaterThanOrEqual(0.65);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].chunk.fullReference).toBe(
      'Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP'
    );
    expect(response.loggedToKnowledgeGap).toBe(false);
  });

  it('Kịch bản 2: Phải kích hoạt Fallback Guard và ghi nhận vào Knowledge Gap Queue khi câu hỏi ngoài phạm vi 5 bộ luật', () => {
    const response = engine.search({
      text: 'quy định về thuế thu nhập cá nhân khi trúng số độc đắc 2 tỷ đồng',
    });

    expect(response.isFound).toBe(false);
    expect(response.topScore).toBeLessThan(0.65);
    expect(response.results).toHaveLength(0);
    expect(response.loggedToKnowledgeGap).toBe(true);
    expect(response.message).toContain('Hệ thống chưa tìm thấy căn cứ pháp lý');

    // Kiểm tra đã được ghi nhận vào hàng đợi
    const gaps = gapQueue.getAll();
    expect(gaps).toHaveLength(1);
    expect(gaps[0].queryText).toBe(
      'quy định về thuế thu nhập cá nhân khi trúng số độc đắc 2 tỷ đồng'
    );
    expect(gaps[0].hitCount).toBe(1);
    expect(gaps[0].status).toBe('unreviewed');
  });

  it('Kịch bản 3: Phải tự động tăng hitCount và khử trùng lặp khi nhiều người hỏi về cùng một khoảng trống tri thức', () => {
    engine.search({ text: 'thuế thu nhập cá nhân trúng vé số vietlott' });
    engine.search({ text: 'cách tính thuế thu nhập cá nhân trúng số vietlott' });

    const gaps = gapQueue.getAll();
    // Không tạo 2 bản ghi riêng biệt, mà chỉ gom thành 1 bản ghi với hitCount = 2
    expect(gaps).toHaveLength(1);
    expect(gaps[0].hitCount).toBe(2);
  });

  it('Kịch bản 4: Phải tự động dự đoán domain hợp lý cho câu hỏi thiếu', () => {
    engine.search({ text: 'tai nạn xe mô tô đâm vào dải phân cách' });
    const gaps = gapQueue.getAll();
    expect(gaps).toHaveLength(1);
    expect(gaps[0].domainGuess).toBe('TRAFFIC');
  });
});
