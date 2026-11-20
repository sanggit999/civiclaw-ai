import { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Cấu hình của API Gateway
 */
export interface GatewayConfig {
  port?: number;
  host?: string;
  corsOrigins?: string[];
  enableSse?: boolean;
  requestTimeoutMs?: number;
}

/**
 * Định nghĩa hàm xử lý Route trong Gateway
 */
export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params?: Record<string, string>
) => Promise<void> | void;

/**
 * Chuẩn hóa lỗi hệ thống (Standard Error Envelope)
 */
export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * Giới hạn kích thước payload tối đa (10MB) phòng chống OOM DoS
 */
export const MAX_BODY_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Helper đọc toàn bộ JSON body từ IncomingMessage
 */
export async function parseJsonBody<T = any>(req: IncomingMessage, maxBytes = MAX_BODY_SIZE_BYTES): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesReceived = 0;

    req.on('data', (chunk) => {
      bytesReceived += chunk.length;
      if (bytesReceived > maxBytes) {
        req.destroy();
        reject(new Error(`Payload vượt quá giới hạn tối đa cho phép (${maxBytes} bytes).`));
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({} as T);
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(`JSON không hợp lệ: ${err.message}`));
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Helper gửi JSON Response chuẩn
 */
export function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: unknown,
  extraHeaders?: Record<string, string>
): void {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload).toString(),
    ...extraHeaders,
  });
  res.end(payload);
}

/**
 * Helper gửi lỗi chuẩn
 */
export function sendError(
  res: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  sendJson(res, statusCode, {
    success: false,
    error: {
      code,
      message,
      statusCode,
      details,
    },
  });
}
