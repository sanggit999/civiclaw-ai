'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  Button,
  Badge,
  Banner,
  TextInput,
  Divider,
} from '@astryxdesign/core';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại.');
        setLoading(false);
        return;
      }

      // Đăng nhập thành công -> Chuyển hướng
      router.push(redirectTarget);
      router.refresh();
    } catch {
      setErrorMessage('Lỗi kết nối tới máy chủ xác thực. Vui lòng thử lại sau.');
      setLoading(false);
    }
  };

  return (
    <Card
      padding={4}
      style={{
        width: '100%',
        maxWidth: '440px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(24, 24, 27, 0.85)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
      }}
    >
      <form onSubmit={handleSubmit}>
        <VStack gap={5}>
          {/* Header & Logo */}
          <VStack gap={1} hAlign="center" style={{ textAlign: 'center' }}>
            <HStack gap={2} vAlign="center">
              <Heading level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
                CivicLaw AI
              </Heading>
              <Badge label="Admin Portal" variant="blue" />
            </HStack>
            <Text type="supporting" style={{ fontSize: '13px' }}>
              Cổng Quản Trị Dữ Liệu Pháp Luật & Giám Sát Hạ Tầng
            </Text>
          </VStack>

          <Divider />

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <Banner
              status="error"
              title="Không thể đăng nhập"
              description={errorMessage}
            />
          )}

          {/* Form Fields */}
          <VStack gap={4}>
            <TextInput
              type="email"
              label="Email Quản Trị"
              placeholder="admin@civiclaw.vn"
              value={email}
              onChange={(val: string) => setEmail(val)}
              isDisabled={loading}
            />

            <TextInput
              type="password"
              label="Mật Khẩu"
              placeholder="Nhập mật khẩu an toàn..."
              value={password}
              onChange={(val: string) => setPassword(val)}
              isDisabled={loading}
            />
          </VStack>

          {/* Submit Button */}
          <Button
            type="submit"
            label={loading ? 'Đang xác thực...' : '🔒 Đăng Nhập Quản Trị'}
            variant="primary"
            isDisabled={loading}
            isLoading={loading}
            style={{ width: '100%', paddingBlock: '10px', fontWeight: 600 }}
          />

          {/* Chú thích an toàn */}
          <VStack gap={1} hAlign="center" style={{ textAlign: 'center', marginTop: '4px' }}>
            <Text type="supporting" style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Phiên đăng nhập được mã hóa an toàn qua HTTP-Only Cookie.
            </Text>
            <Text type="supporting" style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
              CivicLaw AI • Grounded Legal Assistant System
            </Text>
          </VStack>
        </VStack>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 50%, #020617 100%)',
        boxSizing: 'border-box',
      }}
    >
      <Suspense fallback={<div>Đang tải giao diện đăng nhập...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
