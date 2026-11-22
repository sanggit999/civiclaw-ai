import { NextResponse } from 'next/server';
import { verifyAdminCredentials, createSessionToken } from '@/lib/auth-service';
import { DEFAULT_AUTH_CONFIG } from '@/lib/auth-types';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng cung cấp đầy đủ email và mật khẩu.' },
        { status: 400 }
      );
    }

    const result = await verifyAdminCredentials(body);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || 'Đăng nhập không thành công.' },
        { status: 401 }
      );
    }

    const token = createSessionToken(result.user);
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    response.cookies.set({
      name: DEFAULT_AUTH_CONFIG.sessionCookieName,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: DEFAULT_AUTH_CONFIG.sessionDurationSeconds,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Yêu cầu không hợp lệ. Vui lòng cung cấp email và mật khẩu.' },
      { status: 400 }
    );
  }
}
