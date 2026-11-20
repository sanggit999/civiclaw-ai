import { describe, it, expect, beforeEach } from 'vitest';
import { HttpRouter } from '../../../src/api/router.js';
import { HealthController } from '../../../src/api/controllers/health-controller.js';
import { ApiGatewayServer } from '../../../src/api/gateway-server.js';
import { IncomingMessage, ServerResponse } from 'node:http';

describe('Slice 1: Router, CORS & Healthcheck API', () => {
  let router: HttpRouter;

  beforeEach(() => {
    router = new HttpRouter({ corsOrigins: ['*'] });
  });

  it('đăng ký route và tìm kiếm chính xác theo HTTP Method và Path', () => {
    const dummyHandler = async () => {};
    router.register('GET', '/api/v1/health', dummyHandler);
    router.register('POST', '/api/v1/chat', dummyHandler);

    expect(router.lookup('GET', '/api/v1/health')).toBe(dummyHandler);
    expect(router.lookup('POST', '/api/v1/chat')).toBe(dummyHandler);
    expect(router.lookup('GET', '/api/v1/chat')).toBeNull();
    expect(router.lookup('GET', '/api/v1/unknown')).toBeNull();
  });

  it('xử lý preflight CORS OPTIONS trả về HTTP 204 với các headers hợp lệ', async () => {
    let statusCode = 0;
    const headers: Record<string, string> = {};

    const mockReq = {
      method: 'OPTIONS',
      url: '/api/v1/chat',
      headers: { origin: 'http://localhost:3000' },
    } as unknown as IncomingMessage;

    const mockRes = {
      writeHead: (code: number, h: Record<string, string>) => {
        statusCode = code;
        Object.assign(headers, h);
        return mockRes;
      },
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      end: () => {},
    } as unknown as ServerResponse;

    await router.handle(mockReq, mockRes);

    expect(statusCode).toBe(204);
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
    expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
  });

  it('HealthController trả về HTTP 200 kèm status: "ok" và thông tin uptime', async () => {
    const controller = new HealthController();
    router.register('GET', '/api/v1/health', (req, res) => controller.handleHealth(req, res));

    let statusCode = 0;
    let responseBody = '';
    const headers: Record<string, string> = {};

    const mockReq = {
      method: 'GET',
      url: '/api/v1/health',
      headers: {},
    } as unknown as IncomingMessage;

    const mockRes = {
      writeHead: (code: number, h: Record<string, string>) => {
        statusCode = code;
        Object.assign(headers, h);
        return mockRes;
      },
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      end: (data: string) => {
        responseBody = data;
      },
    } as unknown as ServerResponse;

    await router.handle(mockReq, mockRes);

    expect(statusCode).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');

    const json = JSON.parse(responseBody);
    expect(json.status).toBe('ok');
    expect(json.service).toBe('CivicLaw AI Central API Gateway');
    expect(typeof json.uptimeSeconds).toBe('number');
    expect(json.timestamp).toBeDefined();
  });

  it('trả về HTTP 404 với JSON error chuẩn khi truy cập đường dẫn không tồn tại', async () => {
    let statusCode = 0;
    let responseBody = '';
    const headers: Record<string, string> = {};

    const mockReq = {
      method: 'GET',
      url: '/api/v1/not-found',
      headers: {},
    } as unknown as IncomingMessage;

    const mockRes = {
      writeHead: (code: number, h?: Record<string, string>) => {
        statusCode = code;
        if (h) Object.assign(headers, h);
        return mockRes;
      },
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      end: (data: string) => {
        responseBody = data;
      },
    } as unknown as ServerResponse;

    await router.handle(mockReq, mockRes);

    expect(statusCode).toBe(404);
    const json = JSON.parse(responseBody);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('ApiGatewayServer khởi động và dừng sạch sẽ (Graceful Start & Stop)', async () => {
    const server = new ApiGatewayServer({ port: 0 }); // Cổng 0 để hệ điều hành cấp port ngẫu nhiên
    await server.start();
    expect(server.getPort()).toBeGreaterThan(0);
    await server.stop();
  });
});
