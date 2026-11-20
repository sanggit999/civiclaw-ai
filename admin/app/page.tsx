'use client';

import React, { useEffect, useState } from 'react';
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
import { fetchGatewayHealth, GatewayHealthResponse } from '@/lib/api-client';

interface EndpointRow extends Record<string, unknown> {
  method: string;
  path: string;
  purpose: string;
  status: string;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<GatewayHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    const data = await fetchGatewayHealth();
    setHealth(data);
    setLoading(false);
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const endpointData: EndpointRow[] = [
    {
      method: 'GET',
      path: '/api/v1/health',
      purpose: 'Giám sát trạng thái gateway, uptime và kiểm tra kết nối Supabase Cloud',
      status: health?.status === 'ok' ? 'Online' : 'Degraded',
    },
    {
      method: 'POST',
      path: '/api/v1/search',
      purpose: 'Tìm kiếm Hybrid Search (vector 768d + tsvector) trên 4.715 chunks luật',
      status: 'Ready',
    },
    {
      method: 'POST',
      path: '/api/v1/chat',
      purpose: 'Hỏi đáp pháp lý đồng bộ REST với 100% trích dẫn nguồn luật chính thức',
      status: 'Ready',
    },
    {
      method: 'POST',
      path: '/api/v1/chat/stream',
      purpose: 'Truyền phản hồi thời gian thực qua Server-Sent Events (SSE) kèm abort detection',
      status: 'Streaming',
    },
    {
      method: 'POST',
      path: '/api/v1/contracts/audit',
      purpose: 'Rà soát hợp đồng cá nhân, phát hiện rủi ro pháp lý và đối soát điều khoản',
      status: 'Agentic',
    },
    {
      method: 'GET',
      path: '/api/v1/contracts/versions',
      purpose: 'Truy vấn lịch sử và phiên bản kiểm toán hợp đồng của công dân',
      status: 'Ready',
    },
  ];

  const columns = [
    {
      key: 'method',
      header: 'Phương thức',
      renderCell: (item: EndpointRow) => (
        <Badge
          label={item.method}
          variant={item.method === 'GET' ? 'teal' : 'blue'}
        />
      ),
    },
    {
      key: 'path',
      header: 'Đường dẫn Endpoint',
      renderCell: (item: EndpointRow) => (
        <Text type="body">{item.path}</Text>
      ),
    },
    {
      key: 'purpose',
      header: 'Mục đích nghiệp vụ',
      renderCell: (item: EndpointRow) => (
        <Text type="supporting">{item.purpose}</Text>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      renderCell: (item: EndpointRow) => (
        <Badge
          label={item.status}
          variant={item.status === 'Degraded' ? 'warning' : 'success'}
        />
      ),
    },
  ];

  return (
    <VStack gap={6}>
      {/* Tiêu đề & Nút thao tác nhanh */}
      <HStack gap={4} vAlign="center">
        <StackItem size="fill">
          <VStack gap={1}>
            <Heading level={1}>Tổng Quan Cổng Quản Trị CivicLaw AI</Heading>
            <Text type="supporting">
              Giám sát Central API Gateway, kiểm soát kho dữ liệu 4.715 chunks và cấu hình động hệ thống.
            </Text>
          </VStack>
        </StackItem>
        <Button
          label={loading ? 'Đang tải...' : 'Làm mới trạng thái'}
          variant="secondary"
          onClick={loadHealth}
        />
      </HStack>

      <Divider />

      {/* Hàng thẻ thống kê chỉ số chính */}
      <HStack gap={4} wrap="wrap">
        <StackItem size="fill">
          <StatCard
            title="Trạng thái Central API Gateway"
            value={health?.status === 'ok' ? 'Đang Hoạt Động' : 'Chế độ Cục bộ'}
            subtitle={`Uptime: ${health?.uptimeSeconds ? Math.floor(health.uptimeSeconds) : 0}s | Cổng: 3000`}
            badgeLabel={health?.status === 'ok' ? 'KẾT NỐI SỐNG' : 'DỰ PHÒNG'}
            badgeVariant={health?.status === 'ok' ? 'success' : 'warning'}
          />
        </StackItem>
        <StackItem size="fill">
          <StatCard
            title="Kho Dữ Liệu Pháp Luật"
            value={`${health?.database?.chunkCount ?? 4715} Chunks`}
            subtitle="5 Bộ luật: Giao thông, Lao động, BHXH, Nhà ở, Dân sự"
            badgeLabel="PostgreSQL pgvector"
            badgeVariant="teal"
          />
        </StackItem>
        <StackItem size="fill">
          <StatCard
            title="Mô hình Ngôn ngữ Lớn (LLM)"
            value={health?.llm?.model ?? 'Gemini 2.5 Flash'}
            subtitle="100% Trích dẫn Nguồn luật - Zero Bịa đặt"
            badgeLabel="Google DeepMind"
            badgeVariant="blue"
          />
        </StackItem>
      </HStack>

      {/* Danh sách hành động điều hướng nhanh */}
      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>Lối Tắt Tác Vụ Quản Trị</Heading>
          <HStack gap={3} wrap="wrap">
            <Button
              label="Tra cứu Kho Luật 4.715 Chunks"
              variant="primary"
              href="/laws"
            />
            <Button
              label="Kiểm soát Khoảng Trống Tri Thức"
              variant="secondary"
              href="/gaps"
            />
            <Button
              label="Cấu hình Tham số Hybrid Search"
              variant="secondary"
              href="/configs"
            />
          </HStack>
        </VStack>
      </Card>

      {/* Bảng danh sách Endpoint API Gateway */}
      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>Danh Sách Endpoint Central API Gateway</Heading>
          <Text type="supporting">
            Các điểm cuối được phục vụ bởi máy chủ HTTP Native tại cổng 3000 với cơ chế xử lý ngắt kết nối SSE tự động.
          </Text>
          <Table data={endpointData} columns={columns} />
        </VStack>
      </Card>
    </VStack>
  );
}
