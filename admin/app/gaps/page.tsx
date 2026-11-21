'use client';

import React, { useState, useEffect, useRef } from 'react';
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

  const noteDialogRef = useRef<HTMLDialogElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchUnresolvedQueries();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openActionDialog = (item: UnresolvedQueryItem, action: 'resolved' | 'ignored') => {
    setTargetItem(item);
    setTargetAction(action);
    setAdminNote('');
    noteDialogRef.current?.showModal();
  };

  const closeActionDialog = () => {
    noteDialogRef.current?.close();
    setTargetItem(null);
  };

  const handleConfirmAction = async () => {
    if (!targetItem) return;
    await updateUnresolvedQueryStatus(targetItem.id, targetAction);
    setItems((prev) =>
      (prev || []).map((item) => (item.id === targetItem.id ? { ...item, status: targetAction } : item))
    );
    closeActionDialog();
  };

  // Light dismiss khi click ngoài backdrop theo hướng dẫn Modern Web Guidance
  const handleDialogBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = noteDialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (isOutside) {
      closeActionDialog();
    }
  };

  const unreviewedCount = (items || []).filter((i) => i.status === 'unreviewed').length;
  const resolvedCount = (items || []).filter((i) => i.status === 'resolved').length;
  const ignoredCount = (items || []).filter((i) => i.status === 'ignored').length;
  const totalHits = (items || []).reduce((sum, i) => sum + i.hit_count, 0);

  // Lọc danh sách theo Tab trạng thái
  const filteredItems = (items || []).filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const statusTabs: Array<{ id: FilterStatus; label: string; count: number }> = [
    { id: 'all', label: 'Tất cả câu hỏi', count: items.length },
    { id: 'unreviewed', label: 'Chờ xử lý', count: unreviewedCount },
    { id: 'resolved', label: 'Đã giải quyết', count: resolvedCount },
    { id: 'ignored', label: 'Đã bỏ qua', count: ignoredCount },
  ];

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
          {item.status === 'unreviewed' ? (
            <>
              <Button
                label="Đã giải quyết"
                variant="primary"
                size="sm"
                onClick={() => openActionDialog(item.raw, 'resolved')}
              />
              <Button
                label="Bỏ qua"
                variant="ghost"
                size="sm"
                onClick={() => openActionDialog(item.raw, 'ignored')}
              />
            </>
          ) : (
            <Button
              label="Đổi trạng thái"
              variant="secondary"
              size="sm"
              onClick={() => openActionDialog(item.raw, item.status === 'resolved' ? 'ignored' : 'resolved')}
            />
          )}
        </HStack>
      ),
    },
  ];

  return (
    <PageContainer
      title="Quản Trị Khoảng Trống Tri Thức (Knowledge Gaps)"
      description="Theo dõi các câu hỏi công dân tìm kiếm có điểm tin cậy dưới ngưỡng quy định để lập kế hoạch bổ sung dữ liệu luật."
      headerEndContent={
        <Button
          label={loading ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}
          variant="secondary"
          onClick={loadData}
        />
      }
    >
      {/* Hàng thẻ thống kê chỉ số Gaps */}
      <HStack gap={4} wrap="wrap">
        <StackItem size="fill">
          <StatCard
            title="Câu Hỏi Chờ Xử Lý"
            value={`${unreviewedCount} Câu hỏi`}
            subtitle="Cần rà soát và bổ sung văn bản hướng dẫn thi hành"
            badgeLabel="CẦN BỔ SUNG"
            badgeVariant="warning"
          />
        </StackItem>
        <StackItem size="fill">
          <StatCard
            title="Đã Giải Quyết"
            value={`${resolvedCount} Câu hỏi`}
            subtitle="Đã cập nhật chunk vào cơ sở dữ liệu pháp luật"
            badgeLabel="HOÀN TẤT"
            badgeVariant="success"
          />
        </StackItem>
        <StackItem size="fill">
          <StatCard
            title="Tổng Lượt Nhu Cầu Tìm Kiếm"
            value={`${totalHits} Lượt`}
            subtitle="Tần suất công dân quan tâm các chủ đề pháp lý mới"
            badgeLabel="PHÂN TÍCH NHU CẦU"
            badgeVariant="blue"
          />
        </StackItem>
      </HStack>

      {/* Tabs lọc trạng thái câu hỏi theo chuẩn Modern Web Accessibility */}
      <HStack gap={2} wrap="wrap" role="tablist" aria-label="Lọc theo trạng thái câu hỏi">
        {statusTabs.map((tab) => {
          const isSelected = filterStatus === tab.id;
          return (
            <Button
              key={tab.id}
              label={`${tab.label} (${tab.count})`}
              variant={isSelected ? 'primary' : 'ghost'}
              size="sm"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setFilterStatus(tab.id)}
            />
          );
        })}
      </HStack>

      {/* Bảng danh sách câu hỏi */}
      <Card padding={4}>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center">
            <Heading level={3}>Danh Sách Khoảng Trống Tri Thức Pháp Luật</Heading>
            <Badge label={`${filteredItems.length} mục`} variant="teal" />
          </HStack>
          <Table data={tableData} columns={columns} />
        </VStack>
      </Card>

      {/* Dialog Modal xác nhận xử lý Gap kèm Ghi chú Quản trị theo chuẩn Native Dialog */}
      <dialog
        ref={noteDialogRef}
        onClick={handleDialogBackdropClick}
        aria-labelledby="gap-dialog-title"
        style={{
          maxWidth: '560px',
          width: '90%',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          backgroundColor: '#ffffff',
          color: '#1a202c',
          overscrollBehavior: 'contain',
        }}
      >
        {targetItem && (
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2} id="gap-dialog-title">
                {targetAction === 'resolved' ? 'Xác Nhận Giải Quyết Khoảng Trống' : 'Xác Nhận Bỏ Qua Khoảng Trống'}
              </Heading>
              <Text type="supporting">
                Câu hỏi: &quot;{targetItem.query_text}&quot; ({targetItem.domain})
              </Text>
            </VStack>

            <Divider />

            <VStack gap={2}>
              <Text type="body">
                {targetAction === 'resolved'
                  ? 'Đánh dấu câu hỏi này đã được bổ sung dữ liệu điều khoản luật vào cơ sở dữ liệu pgvector.'
                  : 'Bỏ qua câu hỏi này nếu nội dung không thuộc phạm vi 5 bộ luật chính thống.'}
              </Text>

              <TextInput
                label="Ghi chú quản trị (Tùy chọn - Lưu vết kiểm toán)"
                value={adminNote}
                onChange={setAdminNote}
                placeholder="Ví dụ: Đã bổ sung Nghị định số XYZ/2026/NĐ-CP hoặc Câu hỏi ngoài phạm vi..."
              />
            </VStack>

            <Divider />

            <HStack gap={3} vAlign="center">
              <StackItem size="fill" />
              <Button
                label="Hủy bỏ (Esc)"
                variant="ghost"
                onClick={closeActionDialog}
              />
              <Button
                label={targetAction === 'resolved' ? 'Lưu & Đã Giải Quyết' : 'Lưu & Bỏ Qua'}
                variant="primary"
                onClick={handleConfirmAction}
              />
            </HStack>
          </VStack>
        )}
      </dialog>
    </PageContainer>
  );
}
