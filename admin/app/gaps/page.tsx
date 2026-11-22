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
  TextInput,
  Drawer,
  DrawerHeader,
  TabList,
  Tab,
  EmptyState,
  StackItem,
} from '@astryxdesign/core';
import { StatCard } from '@/components/StatCard';
import { PageContainer } from '@/components/PageContainer';
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
  raw: UnresolvedQueryItem;
}

type FilterStatus = 'all' | 'unreviewed' | 'resolved' | 'ignored';

export default function KnowledgeGapsPage() {
  const [items, setItems] = useState<UnresolvedQueryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [targetItem, setTargetItem] = useState<UnresolvedQueryItem | null>(null);
  const [targetAction, setTargetAction] = useState<'resolved' | 'ignored'>('resolved');
  const [adminNote, setAdminNote] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchUnresolvedQueries();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openActionDrawer = (item: UnresolvedQueryItem, action: 'resolved' | 'ignored') => {
    setTargetItem(item);
    setTargetAction(action);
    setAdminNote('');
  };

  const closeActionDrawer = () => {
    setTargetItem(null);
  };

  const handleConfirmAction = async () => {
    if (!targetItem) return;
    await updateUnresolvedQueryStatus(targetItem.id, targetAction);
    setItems((prev) =>
      (prev || []).map((item) => (item.id === targetItem.id ? { ...item, status: targetAction } : item))
    );
    closeActionDrawer();
  };

  const unreviewedCount = (items || []).filter((i) => i.status === 'unreviewed').length;
  const resolvedCount = (items || []).filter((i) => i.status === 'resolved').length;
  const ignoredCount = (items || []).filter((i) => i.status === 'ignored').length;
  const totalHits = (items || []).reduce((sum, i) => sum + i.hit_count, 0);
  const resolutionRate = items.length > 0 ? Math.round((resolvedCount / items.length) * 100) : 0;

  // Lọc danh sách theo Tab trạng thái
  const filteredItems = (items || []).filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const tableData: GapRow[] = filteredItems.map((item) => ({
    id: item.id,
    query_text: item.query_text,
    domain: item.domain || 'Chưa phân loại',
    hit_count: item.hit_count,
    status: item.status,
    actions: item.id,
    raw: item,
  }));

  const columns = [
    {
      key: 'query_text',
      header: 'Nội dung câu hỏi công dân',
      renderCell: (item: GapRow) => (
        <VStack gap={1}>
          <Text type="body" style={{ fontWeight: 600, fontSize: '13.5px', color: '#F8FAFC' }}>
            {item.query_text}
          </Text>
          <Text
            type="supporting"
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-family-code)',
              color: '#64748B',
            }}
          >
            Mã: {item.id}
          </Text>
        </VStack>
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
      header: 'Lượt quan tâm',
      renderCell: (item: GapRow) => (
        <Badge label={`${item.hit_count} truy vấn`} variant="blue" />
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
          {item.status === 'unreviewed' ? (
            <>
              <Button
                label="Đã bổ sung"
                variant="primary"
                size="sm"
                onClick={() => openActionDrawer(item.raw, 'resolved')}
              />
              <Button
                label="Bỏ qua"
                variant="ghost"
                size="sm"
                onClick={() => openActionDrawer(item.raw, 'ignored')}
              />
            </>
          ) : (
            <Button
              label="Cập nhật"
              variant="secondary"
              size="sm"
              onClick={() => openActionDrawer(item.raw, item.status === 'resolved' ? 'ignored' : 'resolved')}
            />
          )}
        </HStack>
      ),
    },
  ];

  return (
    <PageContainer
      title="Hàng Đợi Xử Lý Khoảng Trống Tri Thức (Triage Hub)"
      description="Quản lý các truy vấn của công dân có độ tin cậy thấp hoặc chưa có văn bản luật trực tiếp để đối soát, lập kế hoạch nạp dữ liệu bổ sung."
      headerEndContent={
        <Button
          label={loading ? 'Đang cập nhật...' : 'Làm mới'}
          variant="secondary"
          size="sm"
          onClick={loadData}
        />
      }
    >
      {/* Thẻ chỉ số tổng quan phong cách HRM/CRM */}
      <HStack gap={3} wrap="wrap">
        <StackItem size="fill">
          <StatCard
            title="Câu Hỏi Chờ Thẩm Định"
            value={`${unreviewedCount} Câu hỏi`}
            subtitle="Cần rà soát và bổ sung văn bản hướng dẫn"
            badgeLabel={unreviewedCount > 0 ? 'CẦN CHÚ Ý' : 'HOÀN HẢO'}
            badgeVariant={unreviewedCount > 0 ? 'warning' : 'success'}
            trendLabel={unreviewedCount > 0 ? 'Ưu tiên cao' : 'Sạch sẽ'}
            trendPositive={unreviewedCount === 0}
          />
        </StackItem>

        <StackItem size="fill">
          <StatCard
            title="Đã Giải Quyết Tri Thức"
            value={`${resolvedCount} Câu hỏi`}
            subtitle="Đã nạp bổ sung chunks vào pgvector"
            badgeLabel="ĐÃ BỔ SUNG"
            badgeVariant="success"
            progress={resolutionRate}
            progressVariant="success"
            trendLabel={`${resolutionRate}% Tỷ lệ giải quyết`}
            trendPositive={true}
          />
        </StackItem>

        <StackItem size="fill">
          <StatCard
            title="Tổng Lượt Nhu Cầu Tìm Kiếm"
            value={`${totalHits} Lượt`}
            subtitle="Tần suất công dân hỏi về các khoảng trống"
            badgeLabel="PHÂN TÍCH NHU CẦU"
            badgeVariant="blue"
            trendLabel="Thời gian thực"
            trendPositive={true}
          />
        </StackItem>
      </HStack>

      {/* Tabs lọc trạng thái theo chuẩn CRM Queue */}
      <TabList
        value={filterStatus}
        onChange={(val) => setFilterStatus(val as FilterStatus)}
        hasDivider
      >
        <Tab
          value="all"
          label="Tất cả câu hỏi"
          endContent={<Badge label={String(items.length)} variant="neutral" />}
        />
        <Tab
          value="unreviewed"
          label="Chờ xử lý"
          endContent={
            <Badge
              label={String(unreviewedCount)}
              variant={unreviewedCount > 0 ? 'warning' : 'neutral'}
            />
          }
        />
        <Tab
          value="resolved"
          label="Đã giải quyết"
          endContent={<Badge label={String(resolvedCount)} variant="neutral" />}
        />
        <Tab
          value="ignored"
          label="Đã bỏ qua"
          endContent={<Badge label={String(ignoredCount)} variant="neutral" />}
        />
      </TabList>

      {/* Bảng danh sách câu hỏi kèm EmptyState */}
      <Card
        padding={4}
        style={{
          backgroundColor: '#131B2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
        }}
      >
        <VStack gap={3}>
          <HStack gap={2} vAlign="center">
            <Heading level={3} style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
              Danh Sách Khoảng Trống Cần Xử Lý
            </Heading>
            <Badge label={`${filteredItems.length} câu hỏi`} variant="teal" />
          </HStack>
          {filteredItems.length > 0 ? (
            <Table data={tableData} columns={columns} />
          ) : (
            <EmptyState
              title={
                filterStatus === 'ignored'
                  ? 'Không có câu hỏi nào bị bỏ qua'
                  : filterStatus === 'resolved'
                  ? 'Chưa có câu hỏi nào được đánh dấu giải quyết'
                  : 'Hàng đợi đang hoàn toàn sạch sẽ'
              }
              description={
                filterStatus === 'ignored'
                  ? 'Toàn bộ các truy vấn chưa đối soát từ công dân đều đang được theo dõi và xử lý tích cực.'
                  : 'Các câu hỏi cần bổ sung tri thức sẽ tự động xuất hiện tại đây khi độ tin cậy trích dẫn dưới ngưỡng quy định.'
              }
              isCompact
            />
          )}
        </VStack>
      </Card>

      {/* Slide-over Drawer Thẩm Định & Ghi Chú Tác Nghiệp */}
      <Drawer
        isOpen={targetItem !== null}
        onOpenChange={(isOpen) => !isOpen && closeActionDrawer()}
        side="end"
        width={560}
        label="Thẩm định và xử lý khoảng trống tri thức"
      >
        {targetItem && (
          <VStack
            gap={4}
            style={{
              padding: '28px',
              backgroundColor: '#131B2E',
              color: '#F8FAFC',
              minHeight: '100%',
              boxSizing: 'border-box',
            }}
          >
            <DrawerHeader
              title={targetAction === 'resolved' ? 'Xác Nhận Đã Bổ Sung Tri Thức' : 'Xác Nhận Bỏ Qua Khoảng Trống'}
              subtitle={`Lĩnh vực: ${targetItem.domain} • Lượt hỏi: ${targetItem.hit_count}`}
              onOpenChange={closeActionDrawer}
              endContent={
                <Badge
                  label={targetAction === 'resolved' ? 'Giải Quyết' : 'Bỏ Qua'}
                  variant={targetAction === 'resolved' ? 'success' : 'neutral'}
                />
              }
            />

            <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            <VStack gap={2}>
              <Text
                type="supporting"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#94A3B8',
                }}
              >
                CÂU HỎI TỪ CÔNG DÂN:
              </Text>
              <Card
                padding={3}
                style={{
                  backgroundColor: '#090D16',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                }}
              >
                <Text type="body" style={{ fontWeight: 600, fontSize: '14px', color: '#F8FAFC', lineHeight: 1.5 }}>
                  &quot;{targetItem.query_text}&quot;
                </Text>
              </Card>
            </VStack>

            <VStack gap={3}>
              <Text type="body" style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>
                {targetAction === 'resolved'
                  ? 'Hành động này đánh dấu câu hỏi đã có dữ liệu điều khoản trong hệ thống hoặc đã được nạp bổ sung vào cơ sở dữ liệu PostgreSQL pgvector.'
                  : 'Bỏ qua câu hỏi này nếu nội dung không thuộc phạm vi 5 bộ luật chính thống hoặc không mang tính pháp lý.'}
              </Text>

              <TextInput
                label="Ghi chú tác nghiệp (Lưu vết kiểm toán)"
                value={adminNote}
                onChange={setAdminNote}
                placeholder="Ví dụ: Đã nạp Nghị định bổ sung số 123... hoặc Câu hỏi ngoài phạm vi điều chỉnh"
              />
            </VStack>

            <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            <HStack gap={3} vAlign="center">
              <StackItem size="fill" />
              <Button
                label="Hủy bỏ"
                variant="ghost"
                size="sm"
                onClick={closeActionDrawer}
              />
              <Button
                label={targetAction === 'resolved' ? 'Lưu: Đã Giải Quyết' : 'Lưu: Bỏ Qua'}
                variant="primary"
                size="sm"
                onClick={handleConfirmAction}
              />
            </HStack>
          </VStack>
        )}
      </Drawer>
    </PageContainer>
  );
}
