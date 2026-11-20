'use client';

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  Button,
  Badge,
  Divider,
  TextInput,
  Banner,
  StackItem,
} from '@astryxdesign/core';
import { updateSystemConfig } from '@/lib/api-client';

export default function SystemConfigsPage() {
  const [vectorWeight, setVectorWeight] = useState('0.70');
  const [textWeight, setTextWeight] = useState('0.30');
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.70');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateSystemConfig('hybrid_search_weights', {
      vector_weight: parseFloat(vectorWeight),
      text_weight: parseFloat(textWeight),
    });
    await updateSystemConfig('confidence_threshold', parseFloat(confidenceThreshold));
    setSaving(false);
    setSavedMessage('Cấu hình hệ thống đã được cập nhật thành công và đồng bộ tới Gateway!');
  };

  const handleReset = () => {
    setVectorWeight('0.70');
    setTextWeight('0.30');
    setConfidenceThreshold('0.70');
    setSavedMessage(null);
  };

  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={1}>Cấu Hình Động Hệ Thống (System Configs)</Heading>
        <Text type="supporting">
          Quản trị các tham số tính toán của thuật toán Hybrid Search, ngưỡng lọc trích dẫn và bộ từ dừng tiếng Việt.
        </Text>
      </VStack>

      <Divider />

      {savedMessage && (
        <Banner
          status="success"
          title="Đã Lưu Thành Công"
          description={savedMessage}
          isDismissable
          onDismiss={() => setSavedMessage(null)}
        />
      )}

      {/* Card 1: Trọng số Hybrid Search */}
      <Card padding={4}>
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <StackItem size="fill">
              <Heading level={3}>1. Trọng Số Kết Hợp Hybrid Search</Heading>
            </StackItem>
            <Badge label="Vector + FTS" variant="teal" />
          </HStack>
          <Text type="supporting">
            Tổng trọng số của Vector Search (ngữ nghĩa) và Full-Text Search tsvector (từ khóa chính xác) cần xấp xỉ bằng 1.0.
          </Text>

          <HStack gap={4} wrap="wrap">
            <StackItem size="fill">
              <TextInput
                label="Trọng số Ngữ nghĩa (Vector Weight)"
                description="Hệ số ưu tiên cho tìm kiếm vector 768 chiều (0.0 -> 1.0)"
                value={vectorWeight}
                onChange={setVectorWeight}
              />
            </StackItem>
            <StackItem size="fill">
              <TextInput
                label="Trọng số Từ khóa (FTS Text Weight)"
                description="Hệ số ưu tiên cho tìm kiếm toàn văn tiếng Việt (0.0 -> 1.0)"
                value={textWeight}
                onChange={setTextWeight}
              />
            </StackItem>
          </HStack>
        </VStack>
      </Card>

      {/* Card 2: Ngưỡng tự tin trích dẫn pháp lý */}
      <Card padding={4}>
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <StackItem size="fill">
              <Heading level={3}>2. Ngưỡng Tự Tin Trích Dẫn Pháp Lý (Confidence Threshold)</Heading>
            </StackItem>
            <Badge label="Chống Bịa Đặt" variant="blue" />
          </HStack>
          <Text type="supporting">
            Khi điểm tương đồng cao nhất của kho luật thấp hơn ngưỡng này, trợ lý AI sẽ từ chối suy đoán và chuyển câu hỏi sang hàng đợi Knowledge Gaps.
          </Text>

          <TextInput
            label="Ngưỡng tự tin tối thiểu (0.50 -> 0.95)"
            description="Mặc định khuyến nghị: 0.70 để đảm bảo nguyên tắc 100% Grounded"
            value={confidenceThreshold}
            onChange={setConfidenceThreshold}
          />
        </VStack>
      </Card>

      {/* Card 3: Bộ từ dừng Stop Words tiếng Việt */}
      <Card padding={4}>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center">
            <StackItem size="fill">
              <Heading level={3}>3. Bộ Lọc Từ Dừng Tiếng Việt (Vietnamese Stop Words)</Heading>
            </StackItem>
            <Badge label="Tiền xử lý FTS" variant="neutral" />
          </HStack>
          <Text type="supporting">
            Các hư từ phổ biến được loại bỏ trước khi chuyển câu hỏi sang định dạng `to_tsquery('vietnamese', ...)` trong PostgreSQL.
          </Text>
          <HStack gap={2} wrap="wrap">
            {['là', 'của', 'những', 'các', 'được', 'cho', 'với', 'trong', 'về', 'tại', 'như', 'khi', 'nào', 'sao'].map((w) => (
              <Badge key={w} label={w} variant="neutral" />
            ))}
          </HStack>
        </VStack>
      </Card>

      {/* Nút hành động */}
      <HStack gap={3} hAlign="end">
        <Button
          label="Khôi phục mặc định"
          variant="secondary"
          onClick={handleReset}
        />
        <Button
          label={saving ? 'Đang lưu...' : 'Lưu thay đổi cấu hình'}
          variant="primary"
          onClick={handleSave}
        />
      </HStack>
    </VStack>
  );
}
