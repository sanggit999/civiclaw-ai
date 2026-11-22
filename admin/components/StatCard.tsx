'use client';

import React from 'react';
import {
  Card,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  ProgressBar,
  StackItem,
} from '@astryxdesign/core';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeLabel?: string;
  badgeVariant?: 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'blue' | 'green' | 'teal';
  trendLabel?: string;
  trendPositive?: boolean;
  progress?: number; // 0 - 100
  progressVariant?: 'accent' | 'success' | 'warning' | 'error';
}

/**
 * StatCard phong cách CRM / HRM High-Density Luxury Metric Card
 * - Chuẩn hóa typography 'Inter' với tabular numbers
 * - Nền #131B2E, viền 1px subtle border rgba(255, 255, 255, 0.08)
 * - Tối ưu tỷ lệ thông tin, thanh tiến trình vi mô (subtle progress bar) 4px
 * - Phân cấp nhãn xu hướng (trend label) màu Emerald / Amber / Rose
 */
export function StatCard({
  title,
  value,
  subtitle,
  badgeLabel,
  badgeVariant = 'neutral',
  trendLabel,
  trendPositive = true,
  progress,
  progressVariant = 'accent',
}: StatCardProps) {
  return (
    <Card
      padding={4}
      style={{
        backgroundColor: '#131B2E',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        boxSizing: 'border-box',
        width: '100%',
        transition: 'border-color 0.18s ease-in-out, transform 0.18s ease-in-out',
      }}
    >
      <VStack gap={2}>
        {/* Hàng 1: Tiêu đề thẻ (Subtle Uppercase) & Badge trạng thái */}
        <HStack gap={2} vAlign="center">
          <StackItem size="fill">
            <Text
              type="supporting"
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#94A3B8',
              }}
            >
              {title}
            </Text>
          </StackItem>
          {badgeLabel && (
            <Badge label={badgeLabel} variant={badgeVariant} />
          )}
        </HStack>

        {/* Hàng 2: Giá trị chính (Monospace tabular 26px) & Xu hướng */}
        <HStack gap={2} vAlign="center">
          <Heading
            level={2}
            style={{
              fontSize: '26px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.03em',
              color: '#F8FAFC',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {value}
          </Heading>
          {trendLabel && (
            <Text
              type="supporting"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: trendPositive ? '#10B981' : '#EF4444',
                fontVariantNumeric: 'tabular-nums',
                marginLeft: '4px',
              }}
            >
              {trendLabel}
            </Text>
          )}
        </HStack>

        {/* Hàng 3: Thanh tiến trình vi mô (nếu có) */}
        {typeof progress === 'number' && (
          <div style={{ marginTop: '2px', marginBottom: '2px' }}>
            <ProgressBar
              value={progress}
              max={100}
              label={title}
              isLabelHidden
              variant={progressVariant}
            />
          </div>
        )}

        {/* Hàng 4: Chú thích bổ sung */}
        {subtitle && (
          <Text
            type="supporting"
            style={{
              fontSize: '12px',
              color: '#64748B',
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </Text>
        )}
      </VStack>
    </Card>
  );
}
