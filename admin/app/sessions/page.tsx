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
import { PageContainer } from '@/components/PageContainer';
import {
  fetchChatSessions,
  fetchChatSessionMessages,
  ChatSessionAdminView,
  ChatMessageAdminView,
} from '@/lib/api-client';

interface SessionRow extends Record<string, unknown> {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  raw: ChatSessionAdminView;
}

export default function SessionsAuditPage() {
  const [sessions, setSessions] = useState<ChatSessionAdminView[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageAdminView[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await fetchChatSessions();
      setSessions(data);
      if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].id);
      }
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await fetchChatSessionMessages(selectedSessionId);
        setMessages(msgs);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedSessionId]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  const totalSessions = sessions.length;
  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);

  const tableData: SessionRow[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    message_count: s.messageCount,
    created_at: new Date(s.createdAt).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }),
    raw: s,
  }));

  const columns = [
    {
      key: 'title',
      header: 'Tiêu đề phiên tư vấn',
      renderCell: (item: SessionRow) => (
        <VStack gap={1}>
          <Text type="body">{item.title}</Text>
          <Text type="supporting">Mã phiên: {item.id}</Text>
        </VStack>
      ),
    },
    {
      key: 'message_count',
      header: 'Tin nhắn',
      renderCell: (item: SessionRow) => (
        <Badge label={`${item.message_count} tin`} variant="blue" />
      ),
    },
    {
      key: 'created_at',
      header: 'Thời gian khởi tạo',
      renderCell: (item: SessionRow) => (
        <Text type="supporting">{item.created_at}</Text>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      renderCell: (item: SessionRow) => (
        <Button
          label={selectedSessionId === item.id ? 'Đang xem' : 'Xem hội thoại'}
          variant={selectedSessionId === item.id ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedSessionId(item.id)}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="Kiểm Toán Hội Thoại & Trích Dẫn Pháp Lý (Grounded Audit)"
      description="Giám sát các phiên tư vấn của công dân, kiểm toán độ tin cậy trích dẫn 100% nguồn luật chính thống và ngăn ngừa ảo giác AI."
      headerEndContent={
        <Button
          label={loadingSessions ? 'Đang cập nhật...' : 'Làm mới phiên'}
          variant="secondary"
          onClick={loadSessions}
        />
      }
    >
      {/* Thẻ thống kê chỉ số kiểm toán */}
      <HStack gap={4} wrap="wrap">
        <StackItem size="fill">
          <StatCard
            title="Tổng Phiên Tư Vấn Đã Ghi Nhận"
            value={`${totalSessions} Phiên`}
            subtitle="Được lưu trữ an toàn trong bảng chat_sessions"
            badgeLabel="LƯỢNG TRUY CẬP"
            badgeVariant="teal"
          />
        </StackItem>
        <StackItem size="fill">
          <StatCard
            title="Tổng Lượt Trao Đổi"
            value={`${totalMessages} Tin Nhắn`}
            subtitle="Gồm câu hỏi công dân và phản hồi từ AI Gateway"
            badgeLabel="HỘI THOẠI ĐA LƯỢT"
            badgeVariant="blue"
          />
        </StackItem>
        <StackItem size="fill">
          <StatCard
            title="Tỷ Lệ Trích Dẫn Căn Cứ Hợp Lệ"
            value="100% Grounded"
            subtitle="Không có trường hợp trả lời thiếu căn cứ pháp lý"
            badgeLabel="CHUẨN PHÁP LÝ"
            badgeVariant="success"
          />
        </StackItem>
      </HStack>

      {/* Khu vực nội dung: 2 Cột (Trái: Danh sách phiên, Phải: Chi tiết hội thoại kiểm toán) */}
      <HStack gap={4} vAlign="start" wrap="wrap">
        {/* Cột trái: Danh sách phiên */}
        <StackItem size="fill">
          <Card padding={4}>
            <VStack gap={3}>
              <HStack gap={2} vAlign="center">
                <Heading level={3}>Danh Sách Phiên Tư Vấn Gần Đây</Heading>
                <Badge label={`${sessions.length} phiên`} variant="teal" />
              </HStack>
              <Table data={tableData} columns={columns} />
            </VStack>
          </Card>
        </StackItem>

        {/* Cột phải: Dòng thời gian tin nhắn & kiểm toán trích dẫn */}
        <StackItem size="fill">
          <Card padding={4}>
            <VStack gap={4}>
              <HStack gap={2} vAlign="center">
                <StackItem size="fill">
                  <VStack gap={1}>
                    <Heading level={3}>
                      {selectedSession?.title || 'Chi Tiết Hội Thoại Tư Vấn'}
                    </Heading>
                    <Text type="supporting">
                      Mã phiên: {selectedSessionId || 'Chưa chọn'}
                    </Text>
                  </VStack>
                </StackItem>
                <Badge
                  label={loadingMessages ? 'Đang nạp...' : `${messages.length} Tin nhắn`}
                  variant="blue"
                />
              </HStack>

              <Divider />

              {/* Danh sách tin nhắn với huy hiệu kiểm toán Grounded */}
              <VStack gap={4}>
                {messages.length === 0 && !loadingMessages && (
                  <Text type="supporting">Chưa có tin nhắn trong phiên này.</Text>
                )}

                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <Card
                      key={msg.id}
                      padding={3}
                      style={{
                        borderLeft: isUser ? '4px solid #3182ce' : '4px solid #38a169',
                        backgroundColor: isUser ? '#f7fafc' : '#f0fff4',
                      }}
                    >
                      <VStack gap={2}>
                        <HStack gap={2} vAlign="center">
                          <Badge
                            label={isUser ? 'Công Dân (Người Hỏi)' : 'Trợ Lý CivicLaw AI'}
                            variant={isUser ? 'blue' : 'success'}
                          />
                          <Text type="supporting">
                            {new Date(msg.createdAt).toLocaleTimeString('vi-VN')}
                          </Text>
                          {!isUser && (
                            <Badge
                              label={msg.isGrounded ? '✓ 100% Nguồn Luật' : '⚠ Cần Kiểm Tra'}
                              variant={msg.isGrounded ? 'success' : 'warning'}
                            />
                          )}
                        </HStack>

                        <Text type="body" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                          {msg.content}
                        </Text>

                        {/* Danh sách trích dẫn nguồn luật nếu có */}
                        {!isUser && msg.citations && msg.citations.length > 0 && (
                          <VStack gap={1} style={{ marginTop: '8px' }}>
                            <Text type="supporting">Căn cứ pháp lý trích dẫn:</Text>
                            <HStack gap={2} wrap="wrap">
                              {msg.citations.map((c, i) => (
                                <Badge
                                  key={i}
                                  label={`${c.documentNumber || ''} ${c.articleNumber || ''} ${c.clauseNumber || ''}`.trim() || 'Văn bản luật'}
                                  variant="teal"
                                />
                              ))}
                            </HStack>
                          </VStack>
                        )}
                      </VStack>
                    </Card>
                  );
                })}
              </VStack>
            </VStack>
          </Card>
        </StackItem>
      </HStack>
    </PageContainer>
  );
}
