import { describe, it, expect, beforeEach } from 'vitest';
import {
  verifyAdminCredentials,
  createSessionToken,
  verifySessionToken,
  resolveRouteAccess,
} from '../../../admin/lib/auth-service';
import type { AdminAuthConfig, AdminUser } from '../../../admin/lib/auth-types';
import { DEFAULT_AUTH_CONFIG } from '../../../admin/lib/auth-types';
import { POST as loginHandler } from '../../../admin/app/api/auth/login/route';
import { POST as logoutHandler } from '../../../admin/app/api/auth/logout/route';
import { GET as meHandler } from '../../../admin/app/api/auth/me/route';

describe('Spec 010: Web Admin Authentication & Access Control', () => {
  const customConfig: AdminAuthConfig = {
    sessionCookieName: 'test_session',
    sessionDurationSeconds: 3600,
    secretKey: 'custom-test-secret-salt-civiclaw',
    defaultEmail: 'testadmin@civiclaw.vn',
    defaultPassword: 'TestPassword@123',
  };

  const sampleUser: AdminUser = {
    id: 'user-001',
    email: 'testadmin@civiclaw.vn',
    role: 'superadmin',
    fullName: 'Quản Trị Viên Test',
  };

  describe('Lát 1: Auth Core Service', () => {
    it('Given credentials hợp lệ, When xác thực, Then trả về thành công với thông tin AdminUser', async () => {
      const result = await verifyAdminCredentials(
        { email: 'testadmin@civiclaw.vn', password: 'TestPassword@123' },
        customConfig
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('testadmin@civiclaw.vn');
      expect(result.user?.role).toBe('superadmin');
    });

    it('Given mật khẩu sai, When xác thực, Then từ chối và trả về lỗi 401', async () => {
      const result = await verifyAdminCredentials(
        { email: 'testadmin@civiclaw.vn', password: 'WrongPassword' },
        customConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/mật khẩu|không chính xác/i);
      expect(result.user).toBeUndefined();
    });

    it('Given email hoặc mật khẩu rỗng, When xác thực, Then từ chối ngay tại trust boundary', async () => {
      const emptyEmailResult = await verifyAdminCredentials(
        { email: '', password: 'SomePassword' },
        customConfig
      );
      expect(emptyEmailResult.success).toBe(false);

      const emptyPassResult = await verifyAdminCredentials(
        { email: 'testadmin@civiclaw.vn', password: '' },
        customConfig
      );
      expect(emptyPassResult.success).toBe(false);
    });

    it('Given đối tượng AdminUser, When tạo token, Then sinh token có chữ ký bảo mật và verify thành công', () => {
      const token = createSessionToken(sampleUser, customConfig);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      const payload = verifySessionToken(token, customConfig);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(sampleUser.id);
      expect(payload?.email).toBe(sampleUser.email);
      expect(payload?.role).toBe(sampleUser.role);
    });

    it('Given token bị sửa đổi hoặc sai secret, When verify, Then trả về null', () => {
      const token = createSessionToken(sampleUser, customConfig);
      const tamperedToken = token.slice(0, -4) + 'abcd';

      const result = verifySessionToken(tamperedToken, customConfig);
      expect(result).toBeNull();

      // Dùng secret khác để verify
      const otherSecretConfig: AdminAuthConfig = {
        ...customConfig,
        secretKey: 'different-secret-key-attacker',
      };
      const resultOtherSecret = verifySessionToken(token, otherSecretConfig);
      expect(resultOtherSecret).toBeNull();
    });

    it('Given token đã hết hạn, When verify, Then từ chối và trả về null', () => {
      const expiredConfig: AdminAuthConfig = {
        ...customConfig,
        sessionDurationSeconds: -10, // đã hết hạn 10 giây trước
      };
      const expiredToken = createSessionToken(sampleUser, expiredConfig);

      const payload = verifySessionToken(expiredToken, customConfig);
      expect(payload).toBeNull();
    });

    it('Given cấu hình linh hoạt (Anti-Hardcode), When dùng credentials tùy biến, Then hệ thống tuân thủ cấu hình được nạp', async () => {
      const dedicatedConfig: AdminAuthConfig = {
        sessionCookieName: 'custom_cookie',
        sessionDurationSeconds: 1800,
        secretKey: 'custom-isolated-key',
        defaultEmail: 'officer@justice.gov.vn',
        defaultPassword: 'GovSecurePassword!999',
      };

      const validResult = await verifyAdminCredentials(
        { email: 'officer@justice.gov.vn', password: 'GovSecurePassword!999' },
        dedicatedConfig
      );
      expect(validResult.success).toBe(true);
      expect(validResult.user?.email).toBe('officer@justice.gov.vn');

      // Thử dùng mật khẩu cũ sẽ bị từ chối
      const oldPassResult = await verifyAdminCredentials(
        { email: 'officer@justice.gov.vn', password: 'TestPassword@123' },
        dedicatedConfig
      );
      expect(oldPassResult.success).toBe(false);
    });
  });

  describe('Lát 2: Auth API Routes', () => {
    it('POST /api/auth/login: Thành công cấp cookie khi thông tin hợp lệ', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: DEFAULT_AUTH_CONFIG.defaultEmail,
          password: DEFAULT_AUTH_CONFIG.defaultPassword,
        }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(DEFAULT_AUTH_CONFIG.defaultEmail);

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain(`${DEFAULT_AUTH_CONFIG.sessionCookieName}=`);
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Path=/');
    });

    it('POST /api/auth/login: Trả về lỗi 401 khi mật khẩu sai', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: DEFAULT_AUTH_CONFIG.defaultEmail,
          password: 'WrongPassword!999',
        }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('POST /api/auth/login: Trả về lỗi 400 khi thiếu email hoặc mật khẩu', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('POST /api/auth/logout: Xóa cookie admin_session và trả về success: true', async () => {
      const request = new Request('http://localhost:3000/api/auth/logout', { method: 'POST' });
      const response = await logoutHandler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toMatch(new RegExp(`${DEFAULT_AUTH_CONFIG.sessionCookieName}=`));
      expect(setCookie).toMatch(/max-age=0/i);
    });

    it('GET /api/auth/me: Trả về thông tin user khi có session cookie hợp lệ', async () => {
      const token = createSessionToken(sampleUser);
      const request = new Request('http://localhost:3000/api/auth/me', {
        headers: {
          cookie: `${DEFAULT_AUTH_CONFIG.sessionCookieName}=${token}`,
        },
      });

      const response = await meHandler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.authenticated).toBe(true);
      expect(data.user.id).toBe(sampleUser.id);
      expect(data.user.email).toBe(sampleUser.email);
    });

    it('GET /api/auth/me: Trả về 401 khi không có cookie hoặc token không hợp lệ', async () => {
      const requestWithoutCookie = new Request('http://localhost:3000/api/auth/me');
      const resUnauth = await meHandler(requestWithoutCookie);
      expect(resUnauth.status).toBe(401);
      const dataUnauth = await resUnauth.json();
      expect(dataUnauth.authenticated).toBe(false);

      const requestInvalidToken = new Request('http://localhost:3000/api/auth/me', {
        headers: {
          cookie: `${DEFAULT_AUTH_CONFIG.sessionCookieName}=invalid-forged-token`,
        },
      });
      const resInvalid = await meHandler(requestInvalidToken);
      expect(resInvalid.status).toBe(401);
      const dataInvalid = await resInvalid.json();
      expect(dataInvalid.authenticated).toBe(false);
    });
  });

  describe('Lát 3: Route Protection Middleware Logic', () => {
    it('Given người dùng CHƯA đăng nhập, When truy cập trang nội bộ (/laws), Then chuyển hướng về /login kèm redirect query', () => {
      const decision = resolveRouteAccess('/laws', null, customConfig);
      expect(decision.action).toBe('redirect');
      expect(decision.destination).toBe('/login?redirect=%2Flaws');
    });

    it('Given người dùng ĐÃ đăng nhập, When truy cập trang nội bộ (/laws), Then cho phép truy cập tiếp', () => {
      const validToken = createSessionToken(sampleUser, customConfig);
      const decision = resolveRouteAccess('/laws', validToken, customConfig);
      expect(decision.action).toBe('allow');
    });

    it('Given người dùng ĐÃ đăng nhập, When mở trang /login, Then tự động chuyển hướng về trang chủ /', () => {
      const validToken = createSessionToken(sampleUser, customConfig);
      const decision = resolveRouteAccess('/login', validToken, customConfig);
      expect(decision.action).toBe('redirect');
      expect(decision.destination).toBe('/');
    });

    it('Given người dùng CHƯA đăng nhập, When mở trang /login, Then cho phép truy cập để nhập credentials', () => {
      const decision = resolveRouteAccess('/login', null, customConfig);
      expect(decision.action).toBe('allow');
    });

    it('Given yêu cầu đến tài nguyên tĩnh hoặc API auth (/api/auth/login), Then luôn luôn cho phép bỏ qua', () => {
      const staticCssDecision = resolveRouteAccess('/_next/static/chunks/main.js', null, customConfig);
      expect(staticCssDecision.action).toBe('allow');

      const apiAuthDecision = resolveRouteAccess('/api/auth/login', null, customConfig);
      expect(apiAuthDecision.action).toBe('allow');

      const faviconDecision = resolveRouteAccess('/favicon.ico', null, customConfig);
      expect(faviconDecision.action).toBe('allow');
    });
  });
});
