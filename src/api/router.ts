import { IncomingMessage, ServerResponse } from 'node:http';
import { GatewayConfig, RouteHandler, sendError } from './types.js';

interface RouteEntry {
  method: string;
  path: string;
  handler: RouteHandler;
}

/**
 * Bộ Điều Hướng HTTP (Lightweight Native Router)
 * Hỗ trợ tra cứu nhanh, xử lý CORS Preflight và xử lý lỗi 404/500 chuẩn.
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
    this.routes.push({
      method: method.toUpperCase(),
      path,
      handler,
    });
  }

  /**
   * Tìm kiếm handler tương ứng với method và path
   */
  lookup(method: string, path: string): RouteHandler | null {
    const cleanMethod = method.toUpperCase();
    const cleanPath = path.split('?')[0]; // Bỏ query string nếu có

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

    // Thiết lập CORS Headers chuẩn
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      'Access-Control-Max-Age': '86400',
    };

    // 1. Xử lý CORS Preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    // 2. Tra cứu route
    const url = req.url || '/';
    const cleanPath = url.split('?')[0];
    const handler = this.lookup(req.method || 'GET', cleanPath);

    this.applyCorsHeaders(res, corsHeaders);

    if (!handler) {
      sendError(res, 404, 'NOT_FOUND', `Không tìm thấy endpoint: ${req.method} ${cleanPath}`);
      return;
    }

    try {
      await handler(req, res);
    } catch (err: any) {
      console.error(`[HttpRouter Error] ${req.method} ${cleanPath}:`, err);
      if (!res.headersSent) {
        sendError(
          res,
          500,
          'INTERNAL_SERVER_ERROR',
          err.message || 'Lỗi xử lý nội bộ tại API Gateway'
        );
      }
    }
  }
}
