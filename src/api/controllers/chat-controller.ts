import { IncomingMessage, ServerResponse } from 'node:http';
import { IContextualRagPipeline } from '../../session/pipeline.js';
import { parseJsonBody, sendError, sendJson } from '../types.js';
import { SseStreamWriter } from '../sse-writer.js';

export interface ChatRequestBody {
  query: string;
  sessionId?: string;
  domain?: string;
  confidenceThreshold?: number;
}

/**
 * Controller xử lý hỏi đáp pháp lý qua REST và Server-Sent Events (SSE) Streaming
 */
export class ChatController {
  constructor(private ragPipeline: IContextualRagPipeline) {}

  /**
   * Endpoint REST: POST /api/v1/chat
   */
  async handleChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await parseJsonBody<ChatRequestBody>(req);

    if (!body || !body.query || !body.query.trim()) {
      sendError(res, 400, 'BAD_REQUEST', 'Trường "query" không được để trống.');
      return;
    }

    try {
      const result = await this.ragPipeline.chat({
        sessionId: body.sessionId || '',
        query: body.query.trim(),
        domain: body.domain,
        confidenceThreshold: body.confidenceThreshold,
      });

      sendJson(res, 200, {
        success: true,
        data: result,
      });
    } catch (err: any) {
      sendError(res, 500, 'RAG_PIPELINE_ERROR', err.message);
    }
  }

  /**
   * Endpoint Streaming: POST /api/v1/chat/stream
   */
  async handleChatStream(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await parseJsonBody<ChatRequestBody>(req);

    if (!body || !body.query || !body.query.trim()) {
      sendError(res, 400, 'BAD_REQUEST', 'Trường "query" không được để trống.');
      return;
    }

    const sse = new SseStreamWriter(res);

    try {
      // 1. Báo tiến trình: Đang xử lý ngữ cảnh
      sse.sendProgress('CONDENSING', 'Đang phân tích và tái tạo ngữ cảnh câu hỏi...');

      const result = await this.ragPipeline.chat({
        sessionId: body.sessionId || '',
        query: body.query.trim(),
        domain: body.domain,
        confidenceThreshold: body.confidenceThreshold,
      });

      // 2. Phát câu hỏi độc lập (nếu có tái tạo)
      if (result.standaloneQuery && result.standaloneQuery !== body.query) {
        sse.sendEvent('query_condensed', {
          originalQuery: body.query,
          standaloneQuery: result.standaloneQuery,
        });
      }

      // 3. Phát danh sách trích dẫn căn cứ pháp luật
      sse.sendEvent('citations', result.citations);

      // 4. Stream từng phần câu trả lời (token streaming mô phỏng câu trả lời hoàn chỉnh)
      const answer = result.answer;
      // Chia thành các chunks nhỏ (khoảng 20 ký tự) để mô phỏng streaming mượt mà ra giao diện
      const chunkSize = 20;
      for (let i = 0; i < answer.length; i += chunkSize) {
        if (sse.isDisconnected()) {
          // Client đã đóng tab / ngắt kết nối giữa chừng, dừng stream ngay lập tức
          break;
        }
        const chunk = answer.slice(i, i + chunkSize);
        sse.sendToken(chunk);
      }

      // 5. Phát sự kiện hoàn tất (done)
      sse.sendEvent('done', {
        sessionId: result.sessionId,
        isGrounded: result.isGrounded,
        confidenceScore: result.confidenceScore,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

      sse.close();
    } catch (err: any) {
      sse.sendError(err);
    }
  }
}
