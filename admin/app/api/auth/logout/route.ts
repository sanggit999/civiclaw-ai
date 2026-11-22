import { NextResponse } from 'next/server';
import { DEFAULT_AUTH_CONFIG } from '@/lib/auth-types';

export async function POST(_request: Request) {
  const response = NextResponse.json({ success: true, message: 'Đăng xuất thành công.' });

  response.cookies.set({
    name: DEFAULT_AUTH_CONFIG.sessionCookieName,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
