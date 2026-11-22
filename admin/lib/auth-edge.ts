import type { AdminAuthConfig, AdminSessionPayload, RouteAccessDecision } from './auth-types';
import { DEFAULT_AUTH_CONFIG } from './auth-types';

/**
 * Giải mã chuỗi Base64URL an toàn trên Edge runtime (dùng built-in atob, không cần Buffer hay Node crypto)
 */
export function decodeBase64Url(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Trích xuất và kiểm tra sơ bộ hạn dùng của Session Token trên Edge Runtime
 */
export function extractSessionPayload(token: string | null): AdminSessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  try {
    const jsonStr = decodeBase64Url(parts[0]);
    const payload = JSON.parse(jsonStr) as AdminSessionPayload;

    // Kiểm tra thời hạn hiệu lực
    if (payload.expiresAt && payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Quyết định phân luồng truy cập Route (Route Protection Logic)
 * Chạy an toàn 100% trên Next.js Edge Runtime Middleware và Browser
 */
export function resolveRouteAccess(
  pathname: string,
  token: string | null,
  config: AdminAuthConfig = DEFAULT_AUTH_CONFIG
): RouteAccessDecision {
  // Cho phép bỏ qua các tài nguyên tĩnh và API xác thực
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return { action: 'allow' };
  }

  const payload = extractSessionPayload(token);
  const isValidSession = Boolean(payload);

  // Khi đang ở trang /login
  if (pathname === '/login') {
    if (isValidSession) {
      return { action: 'redirect', destination: '/' };
    }
    return { action: 'allow' };
  }

  // Đối với mọi trang admin nội bộ khác
  if (!isValidSession) {
    const encodedRedirect = encodeURIComponent(pathname);
    return { action: 'redirect', destination: `/login?redirect=${encodedRedirect}` };
  }

  return { action: 'allow' };
}
