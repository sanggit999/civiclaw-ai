'use client';

import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  Button,
  Badge,
  Table,
  Divider,
  StackItem,
} from '@astryxdesign/core';
import { StatCard } from '@/components/StatCard';
import {
  fetchUnresolvedQueries,
  updateUnresolvedQueryStatus,
  UnresolvedQueryItem,
} from '@/lib/api-client';

interface GapRow extends Record<string, unknown> {
  id: string;
  query_text: string;
  domain: string;
  hit_count: number;
  status: string;
  actions: string;
}

export default function KnowledgeGapsPage() {
  const [items, setItems] = useState<UnresolvedQueryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchUnresolvedQueries();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'resolved' | 'ignored') => {
    await updateUnresolvedQueryStatus(id, newStatus);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const unreviewedCount = items.filter((i) => i.status === 'unreviewed').length;
  const resolvedCount = items.filter((i) => i.status === 'resolved').length;
  const totalHits = items.reduce((sum, i) => sum + i.hit_count, 0);

  const tableData: GapRow[] = items.map((item) => ({
    id: item.id,
    query_text: item.query_text,
    domain: item.domain || 'Chưa phân loại',
    hit_count: item.hit_count,
    status: item.status,
    actions: item.id,
  }));

  const columns = [
    {
      key: 'query_text',
      header: 'Câu hỏi của công dân',
      renderCell: (item: GapRow) => (
        <Text type="body">{item.query_text}</Text>
      ),
    },
    {
      key: 'domain',
      header: 'Lĩnh vực',
      renderCell: (item: GapRow) => (
        <Badge label={item.domain} variant="teal" />
      ),
    },
    {
      key: 'hit_count',
      header: 'Tần suất hỏi',
      renderCell: (item: GapRow) => (
        <Badge label={`${item.hit_count} lượt`} variant="blue" />
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      renderCell: (item: GapRow) => {
        const s = item.status;
        const variant = s === 'resolved' ? 'success' : s === 'ignored' ? 'neutral' : 'warning';
        const label = s === 'resolved' ? 'Đã giải quyết' : s === 'ignored' ? 'Đã bỏ qua' : 'Chờ xử lý';
        return <Badge label={label} variant={variant} />;
      },
    },
    {
      key: 'actions',
      header: 'Thao tác nghiệp vụ',
      renderCell: (item: GapRow) => (
        <HStack gap={2} vAlign="center">
          {item.status === 'unreviewed' && (
            <>
              <Button
                label="Đã giải quyết"
                variant="primary"
                size="sm"
                onClick={() => handleUpdateStatus(item.id, 'resolved')}
              />
              <Button
                label="Bỏ qua"
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateStatus(item.id, 'ignored')}
              />
            </>
          )}
          {item.status !== 'unreviewed' && (
            <Text type="supporting">Hoàn tất</Text>
          )}
        </HStack>
      ),
    },
  ];

  return (
    <VStack gap={6}>
      <HStack gap={4} vAlign="center">
        <StackItem size="fill">
          <VStack gap={1}>
            <Heading level={1}>Quản Lý Khoảng Trống Tri Thức (Knowledge Gaps)</Heading>
            <Text type="supporting">
              Danh sách các câu hỏi thực tế từ công dân mà trợ lý AI chưa có đủ dữ liệu điều luật với độ tin cậy cao.
            </Text>
          </VStack>
        </StackItem>
        <Button
          label={loading ? 'Đang tải...' : 'Làm mới'}
          variant="secondary"
          onClick={loadData}
        />
      </HStack>

      <Divider />

      <HStack gap={4} wrap="wrap">
        <StackItem size="fill">
          <StatCard
            title="Câu hỏi Chờ Xử Lý"
            value={unreviewedCount}
            subtitle="Cần bổ sung văn bản hướng dẫn thi hành"
            badgeLabel="Ưu tiên"
            badgeVariant="warning"
          />
        </StackItem>
        <StackItem size="fill">
          <StatCard
            title="Đã Giải Quyết"
            value={resolvedCount}
            subtitle="Đã nạp bổ sung vào kho 4.715 chunks"
            badgeLabel="Hoàn tất"
            badgeVariant="success"
          />
        </StackItem>
        <StackItem size="fill">
          <StatCard
            title="Tổng Lượt Công Dân Quan Tâm"
            value={`${totalHits} Lượt`}
            subtitle="Đo lường mức độ quan tâm của cộng đồng"
            badgeLabel="Thống kê"
            badgeVariant="teal"
          />
        </StackItem>
      </HStack>

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>Hàng Đợi Câu Hỏi Công Dân (Unresolved Queries)</Heading>
          <Text type="supporting">
            Dữ liệu được tự động ghi nhận khi truy vấn pháp lý có độ tương đồng thấp hơn ngưỡng cấu hình hệ thống.
          </Text>
          <Table data={tableData} columns={columns} />
        </VStack>
      </Card>
    </VStack>
  );
}
