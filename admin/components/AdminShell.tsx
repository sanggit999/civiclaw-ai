'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Theme,
  AppShell,
  TopNav,
  TopNavHeading,
  TopNavItem,
  SideNav,
  SideNavItem,
  HStack,
  VStack,
  Badge,
  Text,
  Section,
} from '@astryxdesign/core';
import { themes, defaultThemeSlug } from '../astryx-themes';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const topNav = (
    <TopNav
      label="CivicLaw Top Navigation"
      heading={
        <TopNavHeading
          heading="CivicLaw Admin"
          headingHref="/"
          superheading="Hệ Thống Trợ Lý Pháp Lý AI"
          headerEndContent={<Badge label="Grounded v1.0" variant="success" />}
        />
      }
      startContent={
        <HStack gap={1} vAlign="center">
          <TopNavItem label="Tổng quan" href="/" isSelected={pathname === '/'} />
          <TopNavItem label="Kho Luật (4.715 Chunks)" href="/laws" isSelected={pathname === '/laws'} />
          <TopNavItem label="Khoảng trống Tri thức" href="/gaps" isSelected={pathname === '/gaps'} />
          <TopNavItem label="Cấu hình Động" href="/configs" isSelected={pathname === '/configs'} />
        </HStack>
      }
      endContent={
        <HStack gap={2} vAlign="center">
          <Badge label="Gateway :3000" variant="teal" />
          <Badge label="pgvector Hybrid" variant="blue" />
        </HStack>
      }
    />
  );

  const sideNav = (
    <SideNav>
      <SideNavItem
        label="Tổng quan & Gateway"
        href="/"
        isSelected={pathname === '/'}
      />
      <SideNavItem
        label="Tra cứu 4.715 Chunks Luật"
        href="/laws"
        isSelected={pathname === '/laws'}
      />
      <SideNavItem
        label="Khoảng trống Tri thức"
        href="/gaps"
        isSelected={pathname === '/gaps'}
      />
      <SideNavItem
        label="Cấu hình Động Hệ thống"
        href="/configs"
        isSelected={pathname === '/configs'}
      />
    </SideNav>
  );

  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <AppShell
        height="fill"
        variant="elevated"
        contentPadding={4}
        topNav={topNav}
        sideNav={sideNav}
      >
        <Section padding={0}>
          {children}
        </Section>
      </AppShell>
    </Theme>
  );
}
