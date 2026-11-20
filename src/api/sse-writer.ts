import { ServerResponse } from 'node:http';

/**
 * Trình ghi luồng Server-Sent Events (SSE Stream Writer)
 * Chuẩn hóa giao thức truyền phát dữ liệu thời gian thực qua HTTP thuần Node.js.
 */
export class SseStreamWriter {
  private isClosed: boolean = false;

  constructor(private res: ServerResponse) {
    this.initHeaders();
    if (typeof this.res.on === 'function') {
      this.res.on('close', () => {
        this.isClosed = true;
      });
    }
  }

  /**
   * Khởi tạo các HTTP Header bắt buộc cho Server-Sent Events
   */
  private initHeaders(): void {
    this.res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Chống Nginx buffer dữ liệu SSE
    });

    if (typeof this.res.flushHeaders === 'function') {
      this.res.flushHeaders();
    }
  }

  /**
   * Kiểm tra xem kết nối client đã bị đóng hay ngắt kết nối giữa chừng
   */
  isDisconnected(): boolean {
    return this.isClosed || Boolean(this.res.destroyed) || Boolean(this.res.writableEnded);
  }

  /**
   * Gửi một sự kiện có tên (Named SSE Event)
   */
  sendEvent(event: string, data: unknown): void {
    if (this.isDisconnected()) return;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.res.write(`event: ${event}\ndata: ${payload}\n\n`);
  }

  /**
   * Gửi một chunk ký tự (Token streaming) cho phản hồi chat
   */
  sendToken(chunk: string): void {
    this.sendEvent('token', { chunk });
  }

  /**
   * Gửi thông báo tiến trình (Progress update)
   */
  sendProgress(phase: string, message: string): void {
    this.sendEvent('progress', { phase, message });
  }

  /**
   * Gửi sự kiện lỗi (Error event)
   */
  sendError(error: unknown): void {
    if (this.isDisconnected()) return;
    const errObj = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    this.sendEvent('error', errObj);
    this.close();
  }

  /**
   * Đóng luồng SSE an toàn
   */
  close(): void {
    if (this.isDisconnected()) return;
    this.isClosed = true;
    this.res.end();
  }
}
