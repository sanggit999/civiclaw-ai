import crypto from 'crypto';
import type {
  AdminAuthConfig,
  AdminSessionPayload,
  AdminUser,
  AuthVerificationResult,
  LoginCredentials,
} from './auth-types';
import { DEFAULT_AUTH_CONFIG } from './auth-types';
import { getSupabaseServerClient } from './supabase-server';

// Tái xuất các hàm Edge-safe để tương thích ngược hoàn toàn
export { decodeBase64Url, extractSessionPayload, resolveRouteAccess } from './auth-edge';

/**
 * Mã hóa payload sang chuỗi Base64URL
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Giải mã chuỗi Base64URL
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Tạo chữ ký HMAC SHA-256 an toàn
 */
function createSignature(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Tạo Session Token có chữ ký HMAC SHA-256
 */
export function createSessionToken(
  user: AdminUser,
  config: AdminAuthConfig = DEFAULT_AUTH_CONFIG
): string {
  const now = Date.now();
  const expiresAt = now + config.sessionDurationSeconds * 1000;

  const payload: AdminSessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    issuedAt: now,
    expiresAt,
  };

  const serializedPayload = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(serializedPayload);
  const signature = createSignature(encodedPayload, config.secretKey);

  return `${encodedPayload}.${signature}`;
}

/**
 * Xác minh tính toàn vẹn và hạn sử dụng của Session Token
 */
export function verifySessionToken(
  token: string,
  config: AdminAuthConfig = DEFAULT_AUTH_CONFIG
): AdminSessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  // Kiểm tra chữ ký HMAC
  const expectedSignature = createSignature(encodedPayload, config.secretKey);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const rawJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(rawJson) as AdminSessionPayload;

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
 * Xác thực thông tin đăng nhập Admin
 * Hỗ trợ Supabase Auth nếu có sẵn, hoặc fallback kiểm tra tài khoản quản trị từ cấu hình
 */
export async function verifyAdminCredentials(
  credentials: LoginCredentials,
  config: AdminAuthConfig = DEFAULT_AUTH_CONFIG
): Promise<AuthVerificationResult> {
  const email = credentials?.email?.trim();
  const password = credentials?.password;

  // 1. Kiểm tra ranh giới dữ liệu đầu vào (Input validation)
  if (!email || !password) {
    return {
      success: false,
      error: 'Vui lòng nhập đầy đủ email và mật khẩu.',
    };
  }

  // 2. Thử xác thực với Supabase Cloud nếu client đã được cấu hình
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user) {
        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email || email,
            role: (data.user.user_metadata?.role as 'superadmin') || 'superadmin',
            fullName:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              'Quản Trị Viên',
            createdAt: data.user.created_at,
          },
        };
      }
    } catch {
      // Bỏ qua lỗi kết nối Supabase để chuyển sang fallback
    }
  }

  // 3. Fallback: Xác thực với tài khoản cấu hình trong môi trường dev/offline
  const targetEmail = config.defaultEmail || DEFAULT_AUTH_CONFIG.defaultEmail;
  const targetPassword = config.defaultPassword || DEFAULT_AUTH_CONFIG.defaultPassword;

  if (targetEmail && targetPassword && email.toLowerCase() === targetEmail.toLowerCase()) {
    if (password === targetPassword) {
      return {
        success: true,
        user: {
          id: 'admin-local-master-001',
          email: targetEmail,
          role: 'superadmin',
          fullName: 'Quản Trị Viên Hệ Thống',
        },
      };
    }
    return {
      success: false,
      error: 'Mật khẩu quản trị không chính xác.',
    };
  }

  return {
    success: false,
    error: 'Tài khoản quản trị không tồn tại hoặc mật khẩu không chính xác.',
  };
}
