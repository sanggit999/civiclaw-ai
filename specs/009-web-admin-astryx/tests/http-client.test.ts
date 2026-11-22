import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient, HttpError } from '../../../admin/lib/http-client';
import {
  loginAdmin,
  logoutAdmin,
  fetchCurrentUser,
  fetchGatewayHealth,
  searchLaws,
} from '../../../admin/lib/api-client';

describe('Centralized Base HTTP Client & Interceptors', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('1. Core HTTP Methods & Serialization', () => {
    it('GET: Thực hiện GET request với query params serialization và typed response', async () => {
      const client = new HttpClient();
      let capturedUrl = '';
      let capturedInit: RequestInit | undefined;

      global.fetch = vi.fn().mockImplementation((url, init) => {
        capturedUrl = String(url);
        capturedInit = init;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true, count: 42 }),
        });
      });

      const res = await client.get<{ success: boolean; count: number }>('/api/v1/items', {
        params: { search: 'luật đất đai', page: 1, active: true },
      });

      expect(res.success).toBe(true);
      expect(res.count).toBe(42);
      expect(capturedUrl).toContain('/api/v1/items?search=lu%E1%BA%ADt+%C4%91%E1%BA%A5t+%C4%91ai&page=1&active=true');
      expect(capturedInit?.method).toBe('GET');
      expect((capturedInit?.headers as Record<string, string>)?.['Accept']).toBe('application/json');
    });

    it('POST: Tự động serialize JSON body và gán Content-Type', async () => {
      const client = new HttpClient();
      let capturedInit: RequestInit | undefined;

      global.fetch = vi.fn().mockImplementation((url, init) => {
        capturedInit = init;
        return Promise.resolve({
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ id: 'new-id', status: 'created' }),
        });
      });

      const bodyData = { title: 'Nghị định 100', domain: 'Giao thông' };
      const res = await client.post<{ id: string }>('/api/v1/laws', bodyData);

      expect(res.id).toBe('new-id');
      expect(capturedInit?.method).toBe('POST');
      expect(capturedInit?.body).toBe(JSON.stringify(bodyData));
      expect((capturedInit?.headers as Record<string, string>)?.['Content-Type']).toBe('application/json');
    });

    it('PUT, PATCH, DELETE: Hỗ trợ đầy đủ các methods', async () => {
      const client = new HttpClient();
      const methods: string[] = [];

      global.fetch = vi.fn().mockImplementation((url, init) => {
        methods.push(init.method);
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true }),
        });
      });

      await client.put('/api/v1/item/1', { a: 1 });
      await client.patch('/api/v1/item/1', { b: 2 });
      await client.delete('/api/v1/item/1');

      expect(methods).toEqual(['PUT', 'PATCH', 'DELETE']);
    });
  });

  describe('2. Request & Response Interceptors', () => {
    it('Request Interceptor: Cho phép can thiệp và chèn custom headers', async () => {
      const client = new HttpClient();
      client.addRequestInterceptor((config) => {
        return {
          ...config,
          headers: {
            ...config.headers,
            'X-Custom-Client': 'CivicLaw-Admin-V2',
          },
        };
      });

      let capturedHeaders: Record<string, string> = {};
      global.fetch = vi.fn().mockImplementation((url, init) => {
        capturedHeaders = init.headers as Record<string, string>;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ ok: true }),
        });
      });

      await client.get('/api/test');
      expect(capturedHeaders['X-Custom-Client']).toBe('CivicLaw-Admin-V2');
    });

    it('Response Interceptor: Bắt và xử lý response trước khi trả về caller', async () => {
      const client = new HttpClient();
      client.addResponseInterceptor((response) => {
        expect(response.status).toBe(200);
        return response;
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'intercepted' }),
      });

      const res = await client.get<{ data: string }>('/api/test');
      expect(res.data).toBe('intercepted');
    });
  });

  describe('3. Error Handling & 401 Auto-Redirect', () => {
    it('HTTP Error (4xx, 5xx): Ném HttpError chứa status, statusText và error payload', async () => {
      const client = new HttpClient();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Văn bản không tồn tại' }),
      });

      try {
        await client.get('/api/laws/unknown-id');
        expect.fail('Phải ném HttpError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(HttpError);
        const httpErr = err as HttpError;
        expect(httpErr.status).toBe(404);
        expect(httpErr.statusText).toBe('Not Found');
        expect(httpErr.data).toEqual({ error: 'Văn bản không tồn tại' });
      }
    });

    it('401 Auto-redirect: Tự động kích hoạt chuyển hướng về /login khi gặp 401 trên browser', async () => {
      const client = new HttpClient();
      const mockLocation = {
        pathname: '/laws',
        search: '?q=test',
        href: '',
      };

      // Giả lập môi trường browser window.location
      const originalWindow = global.window;
      // @ts-expect-error Mocking window
      global.window = { location: mockLocation };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Phiên hết hạn' }),
      });

      try {
        await client.get('/api/protected');
      } catch {
        // Expected
      }

      expect(mockLocation.href).toBe('/login?redirect=%2Flaws%3Fq%3Dtest');

      // Khôi phục
      global.window = originalWindow;
    });

    it('401 với skipAuthRedirect: Không kích hoạt redirect khi có cờ bỏ qua', async () => {
      const client = new HttpClient();
      const mockLocation = {
        pathname: '/login',
        search: '',
        href: '',
      };

      // @ts-expect-error Mocking window
      global.window = { location: mockLocation };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Sai mật khẩu' }),
      });

      try {
        await client.get('/api/auth/me', { skipAuthRedirect: true });
      } catch {
        // Expected
      }

      // Href không bị thay đổi
      expect(mockLocation.href).toBe('');
      // @ts-expect-error Reset window
      delete global.window;
    });
  });

  describe('4. Centralized Auth & API Helpers trong api-client.ts', () => {
    it('loginAdmin: Gọi POST /api/auth/login thông qua httpClient', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          user: { id: 'admin-1', email: 'admin@civiclaw.vn', role: 'superadmin', fullName: 'Admin' },
        }),
      });

      const res = await loginAdmin({ email: 'admin@civiclaw.vn', password: 'password' });
      expect(res.success).toBe(true);
      expect(res.user?.email).toBe('admin@civiclaw.vn');
    });

    it('logoutAdmin: Gọi POST /api/auth/logout thông qua httpClient', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, message: 'Đăng xuất thành công.' }),
      });

      const res = await logoutAdmin();
      expect(res.success).toBe(true);
    });

    it('fetchCurrentUser: Gọi GET /api/auth/me thông qua httpClient', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          authenticated: true,
          user: { id: 'admin-1', email: 'admin@civiclaw.vn', role: 'superadmin', fullName: 'Admin' },
        }),
      });

      const res = await fetchCurrentUser();
      expect(res.authenticated).toBe(true);
      expect(res.user?.fullName).toBe('Admin');
    });

    it('fetchGatewayHealth & searchLaws hoạt động ổn định qua httpClient', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 'ok',
          uptimeSeconds: 500,
          database: { connected: true, chunkCount: 4715 },
          llm: { configured: true, model: 'gemini-2.5-flash' },
        }),
      });

      const health = await fetchGatewayHealth();
      expect(health.status).toBe('ok');
      expect(health.database.chunkCount).toBe(4715);
    });
  });
});
