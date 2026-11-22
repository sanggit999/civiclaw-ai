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
  progress?: number; // 0 - 100
  progressVariant?: 'accent' | 'success' | 'warning' | 'error';
}

/**
 * StatCard phong cách CRM / HRM Data-Dense
 * - Tối ưu mật độ thông tin với tabular numbers
 * - Hỗ trợ thanh tiến trình vi mô (subtle progress bar) 4px
 * - Phân cấp nhãn xu hướng (trend label) và trạng thái ngữ nghĩa
 */
export function StatCard({
  title,
  value,
  subtitle,
  badgeLabel,
  badgeVariant = 'neutral',
  trendLabel,
  progress,
  progressVariant = 'accent',
}: StatCardProps) {
  return (
    <Card padding={4}>
      <VStack gap={2}>
        {/* Hàng 1: Tiêu đề thẻ & Badge trạng thái */}
        <HStack gap={2} vAlign="center">
          <StackItem size="fill">
            <Text type="supporting" style={{ fontSize: '13px', fontWeight: 500 }}>
              {title}
            </Text>
          </StackItem>
          {badgeLabel && (
            <Badge label={badgeLabel} variant={badgeVariant} />
          )}
        </HStack>

        {/* Hàng 2: Giá trị chính (Monospace tabular) & Xu hướng */}
        <HStack gap={2} vAlign="center">
          <Heading level={2} style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {value}
          </Heading>
          {trendLabel && (
            <Text type="supporting" style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>
              {trendLabel}
            </Text>
          )}
        </HStack>

        {/* Hàng 3: Thanh tiến trình vi mô (nếu có) */}
        {typeof progress === 'number' && (
          <ProgressBar
            value={progress}
            max={100}
            label={title}
            isLabelHidden
            variant={progressVariant}
          />
        )}

        {/* Hàng 4: Chú thích bổ sung */}
        {subtitle && (
          <Text type="supporting" style={{ fontSize: '12px' }}>
            {subtitle}
          </Text>
        )}
      </VStack>
    </Card>
  );
}
