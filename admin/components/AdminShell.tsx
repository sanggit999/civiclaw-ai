'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Theme,
  AppShell,
  TopNav,
  SideNav,
  SideNavItem,
  Breadcrumbs,
  BreadcrumbItem,
  Avatar,
  StatusDot,
  HStack,
  VStack,
  Badge,
  Text,
  Divider,
  Section,
  Button,
} from '@astryxdesign/core';
import { themes, defaultThemeSlug } from '../astryx-themes';
import { GlobalSearchInput } from './GlobalSearchInput';

interface CurrentUser {
  id?: string;
  email: string;
  role: string;
  fullName: string;
}

const ROUTE_CONFIG: Record<string, { name: string }> = {
  '/': { name: 'Tổng Quan Gateway' },
  '/sessions': { name: 'Kiểm Toán Phiên AI' },
  '/laws': { name: 'Tra Cứu Kho Luật' },
  '/gaps': { name: 'Khoảng Trống Tri Thức' },
  '/contracts': { name: 'Thử Nghiệm Hợp Đồng' },
  '/configs': { name: 'Cấu Hình Động Hệ Thống' },
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Lấy thông tin phiên người dùng hiện tại
  useEffect(() => {
    if (pathname === '/login') return;

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  // Trang /login hiển thị độc lập, không bọc bởi AppShell
  if (pathname === '/login') {
    return (
      <Theme theme={themes[defaultThemeSlug]}>
        <Section padding={0} style={{ minHeight: '100vh', width: '100%', backgroundColor: '#090D16' }}>
          {children}
        </Section>
      </Theme>
    );
  }

  const currentRoute = ROUTE_CONFIG[pathname] || { group: 'Hệ Thống', name: 'Quản Trị' };

  // TopNav chuẩn SaaS / Enterprise Header: Breadcrumbs + Omni-Search + User Profile
  const topNav = (
    <TopNav
      label="CivicLaw Application Navigation"
      startContent={
        <HStack gap={3} vAlign="center">
          {/* Logo, Thương hiệu & Cổng Quản Trị Nội Bộ đẩy lên Header */}
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <HStack gap={2} vAlign="center" style={{ cursor: 'pointer', paddingRight: '4px' }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>🏛️</span>
              <VStack gap={0}>
                <HStack gap={1.5} vAlign="center">
                  <Text type="body" style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '-0.02em', color: '#F8FAFC', lineHeight: 1.2 }}>
                    CivicLaw AI
                  </Text>
                  <Badge label="v1.0" variant="blue" />
                </HStack>
                <Text type="supporting" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', fontWeight: 600, lineHeight: 1.2 }}>
                  CỔNG QUẢN TRỊ NỘI BỘ
                </Text>
              </VStack>
            </HStack>
          </Link>

          {/* Divider ngăn cách thương hiệu và Breadcrumbs */}
          <Divider orientation="vertical" style={{ height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Breadcrumbs dẫn hướng */}
          <Breadcrumbs variant="supporting">
            <BreadcrumbItem href="/">CivicLaw AI</BreadcrumbItem>
            <BreadcrumbItem isCurrent>{currentRoute.name}</BreadcrumbItem>
          </Breadcrumbs>
        </HStack>
      }
      centerContent={<GlobalSearchInput />}
      endContent={
        <HStack gap={3} vAlign="center">
          {/* Trạng thái Gateway trực tiếp - duy nhất một nơi trên thanh header */}
          <HStack gap={1} vAlign="center">
            <StatusDot variant="success" label="Online" isPulsing />
            <Badge label="Gateway :3001" variant="teal" />
          </HStack>

          <Divider orientation="vertical" style={{ height: '16px' }} />

          {/* User Profile Avatar chuẩn Enterprise & Nút Đăng xuất */}
          <HStack gap={2} vAlign="center">
            <Avatar
              name={currentUser?.fullName || 'Superadmin'}
              size="sm"
              shape="circle"
              status={<StatusDot variant="success" label="Active" />}
            />
            <VStack gap={0}>
              <Text type="body" style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.2 }}>
                {currentUser?.fullName || 'Superadmin'}
              </Text>
              <Text type="supporting" style={{ fontSize: '11px', lineHeight: 1.2 }}>
                {currentUser?.email || 'admin@civiclaw.vn'}
              </Text>
            </VStack>

            <Button
              label="Đăng xuất"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              style={{
                fontSize: '11px',
                paddingBlock: '4px',
                paddingInline: '8px',
                marginLeft: '4px',
                cursor: 'pointer',
              }}
            />
          </HStack>
        </HStack>
      }
    />
  );

  // SideNav phẳng (flat list), loại bỏ toàn bộ group thừa, tăng kích thước menu item
  const sideNav = (
    <SideNav
      footer={
        <Section padding={3} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Text type="supporting" style={{ fontSize: '11.5px', textAlign: 'center', display: 'block', color: '#64748B' }}>
            CivicLaw AI • Grounded Legal Assistant
          </Text>
        </Section>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingBlock: '8px' }}>
        <SideNavItem
          size="lg"
          icon={<span style={{ fontSize: '18px', marginRight: '6px' }}>⚡</span>}
          label="Tổng quan Gateway"
          href="/"
          isSelected={pathname === '/'}
        />
        <SideNavItem
          size="lg"
          icon={<span style={{ fontSize: '18px', marginRight: '6px' }}>💬</span>}
          label="Kiểm toán Phiên AI"
          href="/sessions"
          isSelected={pathname === '/sessions'}
          endContent={<StatusDot variant="success" label="100% Grounded" tooltip="100% Grounded" />}
        />
        <SideNavItem
          size="lg"
          icon={<span style={{ fontSize: '18px', marginRight: '6px' }}>📚</span>}
          label="Tra cứu Kho Luật"
          href="/laws"
          isSelected={pathname === '/laws'}
          endContent={<Badge label="4.7k" variant="teal" />}
        />
        <SideNavItem
          size="lg"
          icon={<span style={{ fontSize: '18px', marginRight: '6px' }}>⚠️</span>}
          label="Khoảng trống Tri thức"
          href="/gaps"
          isSelected={pathname === '/gaps'}
          endContent={<Badge label="Triage" variant="warning" />}
        />
        <SideNavItem
          size="lg"
          icon={<span style={{ fontSize: '18px', marginRight: '6px' }}>⚖️</span>}
          label="Thử nghiệm Hợp đồng"
          href="/contracts"
          isSelected={pathname === '/contracts'}
          endContent={<Badge label="AI" variant="blue" />}
        />
        <SideNavItem
          size="lg"
          icon={<span style={{ fontSize: '18px', marginRight: '6px' }}>⚙️</span>}
          label="Cấu hình Hệ thống"
          href="/configs"
          isSelected={pathname === '/configs'}
        />
      </div>
    </SideNav>
  );

  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <AppShell
        height="fill"
        variant="elevated"
        contentPadding={0}
        topNav={topNav}
        sideNav={sideNav}
      >
        <Section padding={0} style={{ scrollbarGutter: 'stable', minHeight: '100%' }}>
          {children}
        </Section>
      </AppShell>
    </Theme>
  );
}
