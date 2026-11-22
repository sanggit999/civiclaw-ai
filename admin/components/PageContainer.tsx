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
 * Reusable Root Page Layout Container - Enterprise HRM/CRM Standard
 * Chuẩn hóa padding, typography, max-width và cấu trúc header thống nhất cho toàn bộ các trang Web Admin.
 * Lấy cảm hứng từ Linear, Stripe, Vercel Dashboard (High density, crisp 1px borders, subtle transitions).
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
        paddingBlock: '24px',
        paddingInline: '32px',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <VStack gap={4}>
        {/* Header Trang Thống Nhất */}
        <HStack gap={4} vAlign="center" wrap="wrap">
          <StackItem size="fill">
            <VStack gap={1}>
              <Heading
                level={2}
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  color: '#F8FAFC',
                  margin: 0,
                }}
              >
                {title}
              </Heading>
              {description && (
                <Text
                  type="supporting"
                  style={{
                    fontSize: '13px',
                    color: '#94A3B8',
                    lineHeight: 1.4,
                  }}
                >
                  {description}
                </Text>
              )}
            </VStack>
          </StackItem>
          {headerEndContent && (
            <StackItem>
              {headerEndContent}
            </StackItem>
          )}
        </HStack>

        <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Nội Dung Trang */}
        {children}
      </VStack>
    </Section>
  );
}
