/**
 * CivicLaw AI - Web Admin Authentication Types
 * Định nghĩa các kiểu dữ liệu và cấu hình cho module xác thực Web Admin.
 * Tuân thủ quy tắc Anti-Hardcode: Mọi thông số đều có thể ghi đè qua biến môi trường.
 */

export interface AdminUser {
  id: string;
  email: string;
  role: 'superadmin' | 'curator' | 'admin';
  fullName: string;
  createdAt?: string;
}

export interface AdminSessionPayload {
  userId: string;
  email: string;
  role: 'superadmin' | 'curator' | 'admin';
  fullName: string;
  issuedAt: number;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthVerificationResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
}

export interface AdminAuthConfig {
  readonly sessionCookieName: string;
  readonly sessionDurationSeconds: number;
  readonly secretKey: string;
  readonly defaultEmail?: string;
  readonly defaultPassword?: string;
}

export interface RouteAccessDecision {
  action: 'allow' | 'redirect';
  destination?: string;
}

export const DEFAULT_AUTH_CONFIG: AdminAuthConfig = {
  sessionCookieName: 'admin_session',
  sessionDurationSeconds: 7 * 24 * 3600, // 7 ngày
  secretKey: process.env.ADMIN_SESSION_SECRET || 'civiclaw-admin-secret-key-salt-2026',
  defaultEmail: process.env.ADMIN_DEFAULT_EMAIL || 'admin@civiclaw.vn',
  defaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'CivicLaw@2026',
};
