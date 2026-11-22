'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Theme,
  AppShell,
  TopNav,
  SideNav,
  SideNavSection,
  SideNavItem,
  SideNavHeading,
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
  StackItem,
} from '@astryxdesign/core';
import { themes, defaultThemeSlug } from '../astryx-themes';

const ROUTE_CONFIG: Record<string, { group: string; name: string }> = {
  '/': { group: 'Vận Hành & Giám Sát', name: 'Tổng Quan Gateway' },
  '/sessions': { group: 'Vận Hành & Giám Sát', name: 'Kiểm Toán Phiên AI' },
  '/laws': { group: 'Kho Dữ Liệu Pháp Luật', name: 'Tra Cứu Kho Luật' },
  '/gaps': { group: 'Kho Dữ Liệu Pháp Luật', name: 'Khoảng Trống Tri Thức' },
  '/contracts': { group: 'Công Cụ Pháp Lý AI', name: 'Thử Nghiệm Hợp Đồng' },
  '/configs': { group: 'Hệ Thống', name: 'Cấu Hình Động' },
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentRoute = ROUTE_CONFIG[pathname] || { group: 'Hệ Thống', name: 'Quản Trị' };

  // TopNav chuẩn SaaS / Enterprise Header: Breadcrumbs + Omni-Search + User Profile
  const topNav = (
    <TopNav
      label="CivicLaw Application Navigation"
      startContent={
        <Breadcrumbs variant="supporting">
          <BreadcrumbItem href="/">CivicLaw AI</BreadcrumbItem>
          <BreadcrumbItem>{currentRoute.group}</BreadcrumbItem>
          <BreadcrumbItem isCurrent>{currentRoute.name}</BreadcrumbItem>
        </Breadcrumbs>
      }
      centerContent={
        <HStack
          gap={2}
          vAlign="center"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            paddingInline: '14px',
            paddingBlock: '5px',
            cursor: 'pointer',
            minWidth: '340px',
          }}
        >
          <Text type="supporting" style={{ fontSize: '12px' }}>
            🔍 Tìm kiếm điều luật, phiên hỏi đáp, hợp đồng...
          </Text>
          <StackItem size="fill" />
          <Badge label="Ctrl + K" variant="neutral" />
        </HStack>
      }
      endContent={
        <HStack gap={3} vAlign="center">
          {/* Trạng thái Gateway trực tiếp - duy nhất một nơi trên thanh header */}
          <HStack gap={1} vAlign="center">
            <StatusDot variant="success" label="Online" isPulsing />
            <Badge label="Gateway :3001" variant="teal" />
          </HStack>

          <Divider orientation="vertical" style={{ height: '16px' }} />

          {/* User Profile Avatar chuẩn Enterprise */}
          <HStack gap={2} vAlign="center">
            <Avatar
              name="Superadmin"
              size="sm"
              shape="circle"
              status={<StatusDot variant="success" label="Active" />}
            />
            <VStack gap={0}>
              <Text type="body" style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.2 }}>
                Superadmin
              </Text>
              <Text type="supporting" style={{ fontSize: '11px', lineHeight: 1.2 }}>
                Quản trị viên
              </Text>
            </VStack>
          </HStack>
        </HStack>
      }
    />
  );

  // SideNav tinh gọn: Không trùng lặp branding với TopNav, nhãn không bị cắt chữ (Anti-Truncation)
  const sideNav = (
    <SideNav
      header={
        <SideNavHeading
          heading="CivicLaw AI"
          superheading="CỔNG QUẢN TRỊ NỘI BỘ"
          headingHref="/"
          headerEndContent={<Badge label="v1.0" variant="blue" />}
        />
      }
      footer={
        <Section padding={3} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Text type="supporting" style={{ fontSize: '11px', textAlign: 'center', display: 'block' }}>
            CivicLaw AI • Grounded Legal Assistant
          </Text>
        </Section>
      }
    >
      {/* Phân nhóm 1: Vận hành & Giám sát */}
      <SideNavSection title="VẬN HÀNH & GIÁM SÁT">
        <SideNavItem
          label="Tổng quan Gateway"
          href="/"
          isSelected={pathname === '/'}
        />
        <SideNavItem
          label="Kiểm toán Phiên AI"
          href="/sessions"
          isSelected={pathname === '/sessions'}
          endContent={<StatusDot variant="success" label="100% Grounded" tooltip="100% Grounded" />}
        />
      </SideNavSection>

      {/* Phân nhóm 2: Kho Tri Thức Pháp Luật */}
      <SideNavSection title="KHO DỮ LIỆU PHÁP LUẬT">
        <SideNavItem
          label="Tra cứu Kho Luật"
          href="/laws"
          isSelected={pathname === '/laws'}
          endContent={<Badge label="4.7k" variant="teal" />}
        />
        <SideNavItem
          label="Khoảng trống Tri thức"
          href="/gaps"
          isSelected={pathname === '/gaps'}
          endContent={<Badge label="Triage" variant="warning" />}
        />
      </SideNavSection>

      {/* Phân nhóm 3: Công Cụ & Thử Nghiệm AI */}
      <SideNavSection title="CÔNG CỤ PHÁP LÝ AI">
        <SideNavItem
          label="Thử nghiệm Hợp đồng"
          href="/contracts"
          isSelected={pathname === '/contracts'}
          endContent={<Badge label="AI" variant="blue" />}
        />
        <SideNavItem
          label="Cấu hình Hệ thống"
          href="/configs"
          isSelected={pathname === '/configs'}
        />
      </SideNavSection>
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
