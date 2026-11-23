import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendChatMessage,
  streamChatMessage,
  ChatApiRequest,
  ChatCitation,
} from '../../../admin/lib/api-client.js';
import { httpClient, HttpError } from '../../../admin/lib/http-client.js';

describe('Spec 011: Admin Chatbot Playground (Lát 1: Core API Service)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('T1.1 & T1.2: sendChatMessage trả về câu trả lời và trích dẫn căn cứ luật thành công', async () => {
    const mockResponse = {
      sessionId: 'session-test-011',
      query: 'Vượt đèn đỏ xe máy phạt bao nhiêu?',
      standaloneQuery: 'Hành vi vượt đèn đỏ xe máy phạt bao nhiêu tiền?',
      answer: 'Phạt tiền từ 400.000 đồng đến 600.000 đồng theo quy định.',
      citations: [
        {
          docNumber: '168/2024/NĐ-CP',
          article: 'Điều 6',
          clause: 'Khoản 3',
          point: 'Điểm đ',
          fullReference: 'Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP',
          isVerified: true,
        },
      ],
      isGrounded: true,
      confidenceScore: 0.95,
    };

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      success: true,
      data: mockResponse,
    });

    const request: ChatApiRequest = {
      query: 'Vượt đèn đỏ xe máy phạt bao nhiêu?',
      sessionId: 'session-test-011',
      domain: 'Giao thông',
      confidenceThreshold: 0.85,
    };

    const result = await sendChatMessage(request);

    expect(result.answer).toContain('Phạt tiền từ 400.000');
    expect(result.isGrounded).toBe(true);
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].docNumber).toBe('168/2024/NĐ-CP');
    expect(result.sessionId).toBe('session-test-011');
  });

  it('T1.2: sendChatMessage ném lỗi khi query rỗng (Validation Guard)', async () => {
    await expect(sendChatMessage({ query: '   ' })).rejects.toThrow('Câu hỏi không được để trống');
  });

  it('T1.2: sendChatMessage xử lý an toàn khi Gateway trả về lỗi 500 hoặc 400', async () => {
    vi.spyOn(httpClient, 'post').mockRejectedValueOnce(
      new HttpError({
        message: 'HTTP 500: RAG_PIPELINE_ERROR',
        status: 500,
        statusText: 'Internal Server Error',
      })
    );

    await expect(
      sendChatMessage({ query: 'Hỏi câu gây lỗi hệ thống' })
    ).rejects.toThrow('HTTP 500');
  });

  it('T1.2: streamChatMessage gọi onToken và onProgress khi nhận dữ liệu', async () => {
    const mockData = {
      sessionId: 'session-stream-011',
      query: 'Thời gian thử việc tối đa?',
      answer: 'Thời gian thử việc tối đa là 180 ngày đối với người quản lý doanh nghiệp.',
      citations: [
        {
          docNumber: '45/2019/QH14',
          article: 'Điều 25',
          fullReference: 'Điều 25 Bộ luật Lao động 2019',
          isVerified: true,
        },
      ],
      isGrounded: true,
      confidenceScore: 0.92,
    };

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      success: true,
      data: mockData,
    });

    const tokens: string[] = [];
    const steps: string[] = [];
    let receivedCitations: ChatCitation[] = [];

    const result = await streamChatMessage(
      { query: 'Thời gian thử việc tối đa?' },
      (token) => tokens.push(token),
      (step) => steps.push(step),
      (cits) => {
        receivedCitations = cits;
      }
    );

    expect(result.answer).toContain('180 ngày');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.join('')).toBe(mockData.answer);
    expect(steps.length).toBeGreaterThan(0);
    expect(receivedCitations).toHaveLength(1);
  });
});
