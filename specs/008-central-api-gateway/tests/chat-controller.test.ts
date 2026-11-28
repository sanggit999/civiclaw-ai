import { describe, it, expect } from 'vitest';
import { ChatController } from '../../../src/api/controllers/chat-controller.js';
import { IContextualRagPipeline } from '../../../src/session/pipeline.js';
import { ContextualRagRequest, ContextualRagResponse } from '../../../src/session/types.js';
import { IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';

class MockContextualRagPipeline implements IContextualRagPipeline {
  async chat(request: ContextualRagRequest): Promise<ContextualRagResponse> {
    return {
      sessionId: request.sessionId || 'mock-session-123',
      query: request.query,
      standaloneQuery: 'Hành vi vượt đèn đỏ xe máy bị xử phạt bao nhiêu tiền?',
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
  }
}

function createMockRequest(body: unknown): IncomingMessage {
  const req = new EventEmitter() as unknown as IncomingMessage;
  req.headers = { 'content-type': 'application/json' };
  req.method = 'POST';

  process.nextTick(() => {
    req.emit('data', Buffer.from(JSON.stringify(body)));
    req.emit('end');
  });

  return req;
}

function createMockResponse(): { res: ServerResponse; getOutput: () => string; getStatusCode: () => number; getHeaders: () => Record<string, string> } {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  let output = '';

  const res = {
    writeHead: (code: number, h?: Record<string, string>) => {
      statusCode = code;
      if (h) Object.assign(headers, h);
      return res;
    },
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    write: (data: string) => {
      output += data;
      return true;
    },
    end: (data?: string) => {
      if (data) output += data;
    },
  } as unknown as ServerResponse;

  return {
    res,
    getOutput: () => output,
    getStatusCode: () => statusCode,
    getHeaders: () => headers,
  };
}

describe('Slice 2: Chat Controller (REST & SSE Streaming)', () => {
  const mockPipeline = new MockContextualRagPipeline();
  const controller = new ChatController(mockPipeline);

  it('handleChat: trả về HTTP 200 JSON với đầy đủ thông tin trích dẫn nguồn luật', async () => {
    const req = createMockRequest({ query: 'Vượt đèn đỏ xe máy phạt bao nhiêu?' });
    const { res, getOutput, getStatusCode, getHeaders } = createMockResponse();

    await controller.handleChat(req, res);

    expect(getStatusCode()).toBe(200);
    expect(getHeaders()['Content-Type']).toContain('application/json');

    const json = JSON.parse(getOutput());
    expect(json.success).toBe(true);
    expect(json.data.answer).toContain('Phạt tiền từ 400.000');
    expect(json.data.citations).toHaveLength(1);
    expect(json.data.citations[0].fullReference).toContain('168/2024/NĐ-CP');
  });

  it('handleChat: từ chối request với HTTP 400 khi query rỗng', async () => {
    const req = createMockRequest({ query: '   ' });
    const { res, getOutput, getStatusCode } = createMockResponse();

    await controller.handleChat(req, res);

    expect(getStatusCode()).toBe(400);
    const json = JSON.parse(getOutput());
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('BAD_REQUEST');
  });

  it('handleChatStream: stream định dạng text/event-stream với các events tuần tự', async () => {
    const req = createMockRequest({
      query: 'Thế còn ô tô?',
      sessionId: 'session-xyz',
    });
    const { res, getOutput, getStatusCode, getHeaders } = createMockResponse();

    await controller.handleChatStream(req, res);

    expect(getStatusCode()).toBe(200);
    expect(getHeaders()['Content-Type']).toContain('text/event-stream');

    const streamOutput = getOutput();
    expect(streamOutput).toContain('event: progress');
    expect(streamOutput).toContain('event: query_condensed');
    expect(streamOutput).toContain('event: citations');
    expect(streamOutput).toContain('event: token');
    expect(streamOutput).toContain('event: done');
    expect(streamOutput).toContain('"isGrounded":true');
    expect(streamOutput).toContain('"standaloneQuery"');
  });
});
