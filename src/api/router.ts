import { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { GatewayConfig, RouteHandler, sendError } from './types.js';

interface RouteEntry {
  method: string;
  path: string;
  handler: RouteHandler;
}

/**
 * Bộ Điều Hướng HTTP (Lightweight Native Router)
 * Hỗ trợ tra cứu nhanh, xử lý CORS Preflight, chuẩn hóa trailing slash, Request ID và xử lý lỗi 404/500 chuẩn.
 */
export class HttpRouter {
  private routes: RouteEntry[] = [];
  private corsOrigins: string[];

  constructor(config?: Partial<GatewayConfig>) {
    this.corsOrigins = config?.corsOrigins || ['*'];
  }

  /**
   * Đăng ký một route mới
   */
  register(method: string, path: string, handler: RouteHandler): void {
    const normalizedPath = this.normalizePath(path);
    this.routes.push({
      method: method.toUpperCase(),
      path: normalizedPath,
      handler,
    });
  }

  /**
   * Chuẩn hóa đường dẫn: bỏ query string và loại bỏ trailing slash thừa
   */
  private normalizePath(rawPath: string): string {
    let clean = (rawPath || '/').split('?')[0];
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  }

  /**
   * Tìm kiếm handler tương ứng với method và path
   */
  lookup(method: string, path: string): RouteHandler | null {
    const cleanMethod = method.toUpperCase();
    const cleanPath = this.normalizePath(path);

    const match = this.routes.find(
      (r) => r.method === cleanMethod && r.path === cleanPath
    );

    return match ? match.handler : null;
  }

  private applyCorsHeaders(res: ServerResponse, corsHeaders: Record<string, string>): void {
    if (typeof res.setHeader === 'function') {
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.setHeader(k, v);
      }
    }
  }

  /**
   * Xử lý request HTTP đến
   */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const origin = req.headers.origin || '*';
    const allowedOrigin = this.corsOrigins.includes('*')
      ? '*'
      : (this.corsOrigins.includes(origin) ? origin : this.corsOrigins[0]);

    // Gán mã định danh phân tích truy vết (Correlation ID)
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    // Thiết lập CORS Headers chuẩn
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Request-Id',
      'Access-Control-Expose-Headers': 'X-Request-Id, Content-Length',
      'Access-Control-Max-Age': '86400',
      'X-Request-Id': requestId,
    };

    // 1. Xử lý CORS Preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    // 2. Tra cứu route
    const rawUrl = req.url || '/';
    const cleanPath = this.normalizePath(rawUrl);
    const handler = this.lookup(req.method || 'GET', cleanPath);

    this.applyCorsHeaders(res, corsHeaders);

    if (!handler) {
      sendError(res, 404, 'NOT_FOUND', `Không tìm thấy endpoint: ${req.method} ${cleanPath}`);
      return;
    }

    try {
      await handler(req, res);
    } catch (err: any) {
      console.error(`[HttpRouter Error] [${requestId}] ${req.method} ${cleanPath}:`, err);
      if (!res.headersSent) {
        sendError(
          res,
          500,
          'INTERNAL_SERVER_ERROR',
          err.message || 'Lỗi xử lý nội bộ tại API Gateway',
          { requestId }
        );
      }
    }
  }
}
