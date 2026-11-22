'use client';

import React from 'react';
import {
  Card,
  Badge,
  ProgressBar,
} from '@astryxdesign/core';

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeVariant?: 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'blue' | 'green' | 'teal';
  trendLabel?: string;
  trendPositive?: boolean;
  trendVariant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  progress?: number; // 0 - 100
  progressVariant?: 'accent' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode | string;
}

/**
 * StatCard phong cách CRM / HRM High-Density Luxury Metric Card
 * - Chuẩn hóa typography 'Inter' với tabular numbers
 * - Tách biệt rõ ràng Giá trị số (Primary Value), Đơn vị (Unit), và Nhãn xu hướng (Trend Capsule Pill)
 * - Nền #131B2E, viền 1px subtle border rgba(255, 255, 255, 0.08)
 * - Đồng bộ chiều cao (equal vertical rhythm) và thanh tiến trình vi mô 4px
 */
export function StatCard({
  title,
  value,
  unit,
  subtitle,
  badgeLabel,
  badgeVariant = 'neutral',
  trendLabel,
  trendPositive = true,
  trendVariant,
  progress,
  progressVariant = 'accent',
  icon,
}: StatCardProps) {
  // Tự động phân tách số và đơn vị nếu caller truyền chuỗi gộp (vd: "4715 Chunks")
  let displayValue = value;
  let displayUnit = unit;

  if (typeof value === 'number') {
    displayValue = value.toLocaleString('en-US');
  } else if (typeof value === 'string' && !unit) {
    const match = value.match(/^([\d.,%]+)\s*(.*)$/);
    if (match && match[1] && match[2]) {
      const numCandidate = Number(match[1].replace(/,/g, ''));
      if (!isNaN(numCandidate) && !match[1].includes('%')) {
        displayValue = numCandidate.toLocaleString('en-US');
      } else {
        displayValue = match[1];
      }
      displayUnit = match[2];
    }
  }

  // Xác định bảng màu cho Trend Capsule Pill
  const effectiveVariant = trendVariant || (trendPositive ? 'success' : 'error');
  let trendBg = 'rgba(16, 185, 129, 0.12)';
  let trendBorder = 'rgba(16, 185, 129, 0.28)';
  let trendColor = '#10B981';
  let trendIcon = '↑ ';

  if (effectiveVariant === 'warning' || trendLabel?.includes('Triage') || trendLabel?.includes('chú ý') || trendLabel?.includes('đàm phán')) {
    trendBg = 'rgba(245, 158, 11, 0.12)';
    trendBorder = 'rgba(245, 158, 11, 0.28)';
    trendColor = '#F59E0B';
    trendIcon = '▲ ';
  } else if (effectiveVariant === 'error') {
    trendBg = 'rgba(239, 68, 68, 0.12)';
    trendBorder = 'rgba(239, 68, 68, 0.28)';
    trendColor = '#EF4444';
    trendIcon = '↓ ';
  } else if (effectiveVariant === 'info' || effectiveVariant === 'neutral' || trendLabel?.includes('thời gian') || trendLabel?.includes('Thời gian')) {
    trendBg = 'rgba(56, 189, 248, 0.12)';
    trendBorder = 'rgba(56, 189, 248, 0.28)';
    trendColor = '#38BDF8';
    trendIcon = '● ';
  } else if (trendLabel?.includes('Sẵn sàng') || trendLabel?.includes('Đồng bộ') || trendLabel?.includes('Tuyệt đối') || trendLabel?.includes('giải quyết')) {
    trendIcon = '✓ ';
  }

  return (
    <Card
      padding={4}
      style={{
        backgroundColor: '#131B2E',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        minHeight: '158px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 0.18s ease-in-out, transform 0.18s ease-in-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          gap: '10px',
        }}
      >
        {/* Hàng 1: Tiêu đề thẻ (Subtle Uppercase Kicker) & Badge trạng thái */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {icon && (
              <span style={{ fontSize: '13px', lineHeight: 1, userSelect: 'none' }}>
                {icon}
              </span>
            )}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#94A3B8',
                userSelect: 'none',
              }}
            >
              {title}
            </span>
          </div>
          {badgeLabel && (
            <Badge label={badgeLabel} variant={badgeVariant} />
          )}
        </div>

        {/* Hàng 2: Giá trị số chính (Dominant 28px) + Đơn vị + Trend Capsule Pill riêng biệt */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: '8px',
            marginBlock: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.03em',
                color: '#F8FAFC',
                lineHeight: 1.1,
              }}
            >
              {displayValue}
            </span>
            {displayUnit && (
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#94A3B8',
                  marginLeft: '6px',
                  lineHeight: 1.1,
                }}
              >
                {displayUnit}
              </span>
            )}
          </div>

          {trendLabel && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                backgroundColor: trendBg,
                border: `1px solid ${trendBorder}`,
                color: trendColor,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '9px' }}>{trendIcon}</span>
              {trendLabel}
            </span>
          )}
        </div>

        {/* Hàng 3 & 4: Thanh tiến trình vi mô (nếu có) & Chú thích bổ sung */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
          {typeof progress === 'number' && (
            <div style={{ width: '100%', marginTop: '2px', marginBottom: '2px' }}>
              <ProgressBar
                value={progress}
                max={100}
                label={title}
                isLabelHidden
                variant={progressVariant}
              />
            </div>
          )}

          {subtitle && (
            <span
              style={{
                fontSize: '12px',
                color: '#64748B',
                lineHeight: 1.35,
                display: 'block',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
