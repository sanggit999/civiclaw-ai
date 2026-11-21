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
  Selector,
  StackItem,
} from '@astryxdesign/core';
import { searchLaws, LegalSearchResultItem } from '@/lib/api-client';

interface LawRow extends Record<string, unknown> {
  id: string;
  document_number: string;
  article_clause: string;
  domain_title: string;
  content: string;
  similarity: number;
  raw: LegalSearchResultItem;
}

export default function LawsBrowserPage() {
  const [query, setQuery] = useState('nồng độ cồn');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LegalSearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedLaw, setSelectedLaw] = useState<LegalSearchResultItem | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const detailDialogRef = useRef<HTMLDialogElement | null>(null);

  const performSearch = async (searchQuery: string, searchDomain: string) => {
    setLoading(true);
    try {
      const data = await searchLaws(searchQuery, searchDomain || undefined, 20);
      setResults(Array.isArray(data?.results) ? data.results : []);
      setTotal(data?.total ?? (Array.isArray(data?.results) ? data.results.length : 0));
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch('nồng độ cồn', '');
  }, []);

  const handleSearch = () => {
    performSearch(query, domain);
  };

  const handleSelectTab = (selectedDomain: string) => {
    setDomain(selectedDomain);
    performSearch(query, selectedDomain);
  };

  const openDetailModal = (law: LegalSearchResultItem) => {
    setSelectedLaw(law);
    setCopySuccess(false);
    detailDialogRef.current?.showModal();
  };

  const closeDetailModal = () => {
    detailDialogRef.current?.close();
    setSelectedLaw(null);
  };

  // Light dismiss khi click ngoài backdrop theo hướng dẫn Modern Web Guidance
  const handleDialogBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = detailDialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (isOutside) {
      closeDetailModal();
    }
  };

  const handleCopyContent = async () => {
    if (!selectedLaw) return;
    const cite = `${selectedLaw.document_number} ${selectedLaw.article_number || ''} ${selectedLaw.clause_number || ''}\n${selectedLaw.content}`;
    await navigator.clipboard.writeText(cite);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const domainTabs = [
    { value: '', label: 'Tất cả 5 Bộ Luật' },
    { value: 'Giao thông', label: 'Nghị định 100/123 Giao thông' },
    { value: 'Lao động', label: 'Bộ luật Lao động 2019' },
    { value: 'Bảo hiểm xã hội', label: 'Luật BHXH 2024' },
    { value: 'Nhà ở', label: 'Luật Nhà ở 2023' },
    { value: 'Dân sự', label: 'Bộ luật Dân sự 2015' },
  ];

  const tableData: LawRow[] = (results || []).map((item) => ({
    id: item.id,
    document_number: item.document_number || (item.domain === 'Giao thông' ? '100/2019/NĐ-CP' : 'Văn bản Luật'),
    article_clause: `${item.article_number || ''} ${item.clause_number || ''}`.trim() || 'Toàn văn',
    domain_title: item.title || item.domain || 'Quy định chung',
    content: item.content,
    similarity: Math.round((item.similarity || item.score || 0.9) * 100),
    raw: item,
  }));

  const columns = [
    {
      key: 'document_number',
      header: 'Văn bản',
      renderCell: (item: LawRow) => (
        <Badge label={item.document_number} variant="teal" />
      ),
    },
    {
      key: 'article_clause',
      header: 'Điều / Khoản',
      renderCell: (item: LawRow) => (
        <Text type="body">{item.article_clause}</Text>
      ),
    },
    {
      key: 'domain_title',
      header: 'Tiêu đề / Lĩnh vực',
      renderCell: (item: LawRow) => (
        <Text type="supporting">{item.domain_title}</Text>
      ),
    },
    {
      key: 'content',
      header: 'Nội dung trích đoạn',
      renderCell: (item: LawRow) => (
        <Text type="body">
          {item.content.length > 120 ? `${item.content.slice(0, 120)}...` : item.content}
        </Text>
      ),
    },
    {
      key: 'similarity',
      header: 'Độ khớp',
      renderCell: (item: LawRow) => (
        <Badge
          label={`${item.similarity}%`}
          variant={item.similarity >= 80 ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      renderCell: (item: LawRow) => (
        <Button
          label="Xem toàn văn"
          variant="secondary"
          size="sm"
          onClick={() => openDetailModal(item.raw)}
        />
      ),
    },
  ];

  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={1}>Trình Duyệt & Tra Cứu Kho Luật (4.715 Chunks)</Heading>
        <Text type="supporting">
          Tìm kiếm Hybrid Search thời gian thực kết hợp Vector Embeddings 768 chiều và Full-Text Search tsvector.
        </Text>
      </VStack>

      <Divider />

      {/* Tabs lọc nhanh 5 bộ luật theo tiêu chuẩn Modern Web Accessibility */}
      <HStack gap={2} wrap="wrap" role="tablist" aria-label="Bộ lọc lĩnh vực pháp luật">
        {domainTabs.map((tab) => {
          const isSelected = domain === tab.value;
          return (
            <Button
              key={tab.value}
              label={tab.label}
              variant={isSelected ? 'primary' : 'ghost'}
              size="sm"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleSelectTab(tab.value)}
            />
          );
        })}
      </HStack>

      {/* Thanh tìm kiếm & Bộ chọn lĩnh vực */}
      <Card padding={4}>
        <VStack gap={4}>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <TextInput
                label="Từ khóa tìm kiếm hoặc câu hỏi pháp lý"
                value={query}
                onChange={setQuery}
                placeholder="Nhập từ khóa (ví dụ: sa thải, bảo hiểm một lần, đặt cọc thuê nhà...)"
              />
            </StackItem>
            <StackItem size="static">
              <Selector
                label="Lĩnh vực pháp luật"
                value={domain}
                onChange={setDomain}
                options={domainTabs}
              />
            </StackItem>
            <StackItem>
              <Button
                label={loading ? 'Đang tìm kiếm...' : 'Tìm kiếm'}
                variant="primary"
                onClick={handleSearch}
              />
            </StackItem>
          </HStack>

          <HStack gap={2} vAlign="center">
            <Text type="supporting">
              {loading ? 'Đang truy vấn...' : `Tìm thấy ${total} điều khoản phù hợp`}
            </Text>
            {domain && (
              <Badge label={`Lĩnh vực: ${domain}`} variant="blue" />
            )}
          </HStack>
        </VStack>
      </Card>

      {/* Bảng hiển thị kết quả */}
      <Card padding={4}>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center">
            <Heading level={3}>Danh Sách Điều Khoản Pháp Luật</Heading>
            <Badge label={`${results.length} hiển thị`} variant="teal" />
          </HStack>
          <Table data={tableData} columns={columns} />
        </VStack>
      </Card>

      {/* Dialog Modal xem chi tiết toàn văn điều khoản theo chuẩn Native Dialog của Modern Web Guidance */}
      <dialog
        ref={detailDialogRef}
        onClick={handleDialogBackdropClick}
        aria-labelledby="law-detail-title"
        style={{
          maxWidth: '750px',
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
        {selectedLaw && (
          <VStack gap={4}>
            {/* Header Dialog */}
            <HStack gap={3} vAlign="center">
              <StackItem size="fill">
                <VStack gap={1}>
                  <Heading level={2} id="law-detail-title">
                    {selectedLaw.article_number || 'Điều khoản'} {selectedLaw.clause_number || ''}
                  </Heading>
                  <Text type="supporting">
                    Văn bản pháp lý: {selectedLaw.document_number} — {selectedLaw.domain || 'Pháp luật Việt Nam'}
                  </Text>
                </VStack>
              </StackItem>
              <Badge
                label={`Độ khớp ${Math.round((selectedLaw.similarity || selectedLaw.score || 0.9) * 100)}%`}
                variant="success"
              />
            </HStack>

            <Divider />

            {/* Nội dung tiêu đề điều luật */}
            {selectedLaw.title && (
              <VStack gap={1}>
                <Text type="supporting">Tiêu đề quy định:</Text>
                <Heading level={4}>{selectedLaw.title}</Heading>
              </VStack>
            )}

            {/* Toàn văn nội dung pháp luật */}
            <VStack gap={2}>
              <Text type="supporting">Nội dung pháp lý toàn văn:</Text>
              <Card padding={3}>
                <Text type="body" style={{ lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                  {selectedLaw.content}
                </Text>
              </Card>
            </VStack>

            <Divider />

            {/* Footer Dialog */}
            <HStack gap={3} vAlign="center">
              <StackItem size="fill">
                {copySuccess && (
                  <Badge label="✓ Đã sao chép vào bộ nhớ tạm!" variant="success" />
                )}
              </StackItem>
              <Button
                label="Sao chép toàn văn"
                variant="secondary"
                onClick={handleCopyContent}
              />
              <Button
                label="Đóng (Esc)"
                variant="primary"
                onClick={closeDetailModal}
              />
            </HStack>
          </VStack>
        )}
      </dialog>
    </VStack>
  );
}
