'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Theme,
  AppShell,
  TopNav,
  TopNavHeading,
  SideNav,
  SideNavSection,
  SideNavItem,
  SideNavHeading,
  HStack,
  VStack,
  Badge,
  Text,
  Section,
} from '@astryxdesign/core';
import { themes, defaultThemeSlug } from '../astryx-themes';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // TopNav tinh gọn: Tập trung vào Nhận diện Hệ thống, Trạng thái Kết nối và Profile
  const topNav = (
    <TopNav
      label="CivicLaw Top Navigation"
      heading={
        <TopNavHeading
          heading="CivicLaw Admin"
          headingHref="/"
          superheading="HỆ THỐNG TRỢ LÝ PHÁP LÝ AI"
          headerEndContent={<Badge label="Grounded v1.0" variant="success" />}
        />
      }
      startContent={
        <HStack gap={2} vAlign="center">
          <Badge label="Chế độ Quản trị Nội bộ (Admin Only)" variant="neutral" />
        </HStack>
      }
      endContent={
        <HStack gap={2} vAlign="center">
          <Badge label="Gateway :3000" variant="teal" />
          <Badge label="PostgreSQL pgvector" variant="blue" />
          <Badge label="Superadmin" variant="success" />
        </HStack>
      }
    />
  );

  // SideNav đẳng cấp doanh nghiệp: Phân nhóm 3 phân hệ chức năng chuyên nghiệp
  const sideNav = (
    <SideNav
      header={
        <SideNavHeading
          heading="CivicLaw AI"
          superheading="BẢNG ĐIỀU KHIỂN NỘI BỘ"
          headingHref="/"
          headerEndContent={<Badge label="v1.0" variant="blue" />}
        />
      }
      footer={
        <Section padding={3} style={{ borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center">
              <Badge label="● Gateway :3000" variant="success" />
              <Badge label="pgvector" variant="teal" />
            </HStack>
            <Text type="supporting" style={{ fontSize: '12px' }}>
              CivicLaw AI • Grounded Legal Assistant
            </Text>
          </VStack>
        </Section>
      }
    >
      {/* Phân nhóm 1: Vận hành & Giám sát */}
      <SideNavSection title="VẬN HÀNH & GIÁM SÁT">
        <SideNavItem
          label="📊 Tổng quan & Gateway"
          href="/"
          isSelected={pathname === '/'}
        />
        <SideNavItem
          label="💬 Kiểm toán Phiên AI"
          href="/sessions"
          isSelected={pathname === '/sessions'}
          endContent={<Badge label="100% Grounded" variant="success" />}
        />
      </SideNavSection>

      {/* Phân nhóm 2: Kho Tri Thức Pháp Luật */}
      <SideNavSection title="KHO DỮ LIỆU PHÁP LUẬT">
        <SideNavItem
          label="⚖️ Tra cứu Kho Luật"
          href="/laws"
          isSelected={pathname === '/laws'}
          endContent={<Badge label="4.715 Chunks" variant="teal" />}
        />
        <SideNavItem
          label="🧠 Khoảng trống Tri thức"
          href="/gaps"
          isSelected={pathname === '/gaps'}
        />
      </SideNavSection>

      {/* Phân nhóm 3: Công Cụ & Thử Nghiệm AI */}
      <SideNavSection title="CÔNG CỤ PHÁP LÝ AI">
        <SideNavItem
          label="📑 Sân thử nghiệm Hợp đồng"
          href="/contracts"
          isSelected={pathname === '/contracts'}
          endContent={<Badge label="Agentic" variant="blue" />}
        />
        <SideNavItem
          label="⚙️ Cấu hình Động Hệ thống"
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
