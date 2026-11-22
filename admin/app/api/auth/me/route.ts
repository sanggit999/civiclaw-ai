import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth-service';
import { DEFAULT_AUTH_CONFIG } from '@/lib/auth-types';

export async function GET(request: Request) {
  let token: string | undefined;

  // Hỗ trợ đọc từ request cookie header (khi gọi qua API hoặc test runner)
  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${DEFAULT_AUTH_CONFIG.sessionCookieName}=`));
    if (match) {
      token = match.substring(DEFAULT_AUTH_CONFIG.sessionCookieName.length + 1);
    }
  }

  // Nếu không có trong header, đọc từ cookies() của Next.js
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(DEFAULT_AUTH_CONFIG.sessionCookieName)?.value;
    } catch {
      // Môi trường test không có Next.js requestAsyncStorage context
    }
  }

  if (!token) {
    return NextResponse.json(
      { authenticated: false, error: 'Chưa đăng nhập hoặc phiên đã kết thúc.' },
      { status: 401 }
    );
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return NextResponse.json(
      { authenticated: false, error: 'Phiên làm việc không hợp lệ hoặc đã hết hạn.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
    },
  });
}
