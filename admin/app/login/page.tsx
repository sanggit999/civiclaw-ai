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
        setErrorMessage(data.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản và mật khẩu.');
        setLoading(false);
        return;
      }

      // Đăng nhập thành công -> Chuyển hướng tới trang dự định hoặc dashboard
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
        maxWidth: '420px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        backgroundColor: '#131B2E',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        boxSizing: 'border-box',
      }}
    >
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <VStack gap={5}>
          {/* Header & Logo Thương Hiệu */}
          <VStack gap={2} hAlign="center" style={{ textAlign: 'center', paddingTop: '4px' }}>
            <HStack gap={2} vAlign="center">
              <Heading
                level={2}
                style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: '#F8FAFC',
                }}
              >
                CivicLaw AI
              </Heading>
              <Badge label="Portal" variant="blue" />
            </HStack>
            <Text
              type="supporting"
              style={{
                fontSize: '12.5px',
                color: '#94A3B8',
                lineHeight: 1.4,
              }}
            >
              Cổng Quản Trị Trung Tâm • CivicLaw Assistant
            </Text>
          </VStack>

          <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Banner Thông Báo Lỗi */}
          {errorMessage && (
            <Banner
              status="error"
              role="alert"
              title="Không thể đăng nhập"
              description={errorMessage}
            />
          )}

          {/* Form Fields với Astryx TextInput */}
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

          {/* Submit Button với Brand Deep Indigo #2563EB */}
          <Button
            type="submit"
            label={loading ? 'Đang xác thực...' : '🔒 Đăng Nhập Quản Trị'}
            variant="primary"
            isDisabled={loading}
            isLoading={loading}
            style={{
              width: '100%',
              paddingBlock: '10px',
              fontWeight: 600,
              fontSize: '13.5px',
              backgroundColor: '#2563EB',
              borderRadius: '8px',
            }}
          />

          {/* Footer An Ninh & Bản Quyền */}
          <VStack gap={1} hAlign="center" style={{ textAlign: 'center', marginTop: '6px' }}>
            <Text
              type="supporting"
              style={{
                fontSize: '11px',
                color: '#64748B',
                lineHeight: 1.4,
              }}
            >
              Mã hóa phiên chuẩn Enterprise qua HTTP-Only Cookie.
            </Text>
            <Text
              type="supporting"
              style={{
                fontSize: '11px',
                color: '#475569',
              }}
            >
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
        padding: '24px',
        backgroundColor: '#090D16',
        backgroundImage: `
          radial-gradient(circle at 50% 15%, rgba(37, 99, 235, 0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)
        `,
        boxSizing: 'border-box',
      }}
    >
      <Suspense fallback={<div style={{ color: '#94A3B8', fontSize: '13px' }}>Đang nạp giao diện quản trị...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
