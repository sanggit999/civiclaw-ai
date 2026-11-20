'use client';

import React from 'react';
import { Card, VStack, HStack, Heading, Text, Badge, StackItem } from '@astryxdesign/core';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeLabel?: string;
  badgeVariant?: 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'blue' | 'green' | 'teal';
}

export function StatCard({
  title,
  value,
  subtitle,
  badgeLabel,
  badgeVariant = 'neutral',
}: StatCardProps) {
  return (
    <Card padding={4}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <StackItem size="fill">
            <Text type="supporting">{title}</Text>
          </StackItem>
          {badgeLabel && (
            <Badge label={badgeLabel} variant={badgeVariant} />
          )}
        </HStack>
        <Heading level={2}>{value}</Heading>
        {subtitle && (
          <Text type="supporting">{subtitle}</Text>
        )}
      </VStack>
    </Card>
  );
}
