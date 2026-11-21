'use client';

import React from 'react';
import {
  VStack,
  HStack,
  Heading,
  Text,
  Divider,
  StackItem,
  Section,
} from '@astryxdesign/core';

export interface PageContainerProps {
  title: string;
  description?: string;
  headerEndContent?: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Reusable Root Page Layout Container
 * Chuẩn hóa padding, margin, max-width và header cấu trúc thống nhất cho toàn bộ các trang Web Admin
 * Tuân thủ quy chuẩn Meta Astryx Design System và Modern Web CSS Layout (logical properties)
 */
export function PageContainer({
  title,
  description,
  headerEndContent,
  maxWidth = '1440px',
  children,
}: PageContainerProps) {
  return (
    <Section
      padding={0}
      style={{
        maxInlineSize: maxWidth,
        marginInline: 'auto',
        paddingBlock: '28px',
        paddingInline: '32px',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <VStack gap={6}>
        {/* Header Trang Thống Nhất */}
        <HStack gap={4} vAlign="center" wrap="wrap">
          <StackItem size="fill">
            <VStack gap={1}>
              <Heading level={1}>{title}</Heading>
              {description && (
                <Text type="supporting">{description}</Text>
              )}
            </VStack>
          </StackItem>
          {headerEndContent && (
            <StackItem>
              {headerEndContent}
            </StackItem>
          )}
        </HStack>

        <Divider />

        {/* Nội Dung Trang */}
        {children}
      </VStack>
    </Section>
  );
}
