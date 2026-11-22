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
  Selector,
  Drawer,
  DrawerHeader,
  ProgressBar,
  TabList,
  Tab,
  EmptyState,
  StackItem,
} from '@astryxdesign/core';
import { searchLaws, LegalSearchResultItem } from '@/lib/api-client';
import { PageContainer } from '@/components/PageContainer';

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

  const openDetailDrawer = (law: LegalSearchResultItem) => {
    setSelectedLaw(law);
    setCopySuccess(false);
  };

  const closeDetailDrawer = () => {
    setSelectedLaw(null);
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
        <Text type="body" style={{ fontWeight: 600, fontSize: '13px' }}>
          {item.article_clause}
        </Text>
      ),
    },
    {
      key: 'domain_title',
      header: 'Tiêu đề quy định',
      renderCell: (item: LawRow) => (
        <Text type="supporting" style={{ fontSize: '13px' }}>
          {item.domain_title}
        </Text>
      ),
    },
    {
      key: 'content',
      header: 'Nội dung trích đoạn',
      renderCell: (item: LawRow) => (
        <Text type="body" style={{ fontSize: '13px' }}>
          {item.content.length > 110 ? `${item.content.slice(0, 110)}...` : item.content}
        </Text>
      ),
    },
    {
      key: 'similarity',
      header: 'Độ khớp Hybrid',
      renderCell: (item: LawRow) => (
        <HStack gap={2} vAlign="center" style={{ minWidth: '120px' }}>
          <StackItem size="fill">
            <ProgressBar
              value={item.similarity}
              max={100}
              label="Độ khớp"
              isLabelHidden
              variant={item.similarity >= 85 ? 'success' : 'warning'}
            />
          </StackItem>
          <Text type="supporting" style={{ fontSize: '12px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {item.similarity}%
          </Text>
        </HStack>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      renderCell: (item: LawRow) => (
        <Button
          label="Chi tiết"
          variant="secondary"
          size="sm"
          onClick={() => openDetailDrawer(item.raw)}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="Tra Cứu Kho Dữ Liệu Luật (4.715 Chunks)"
      description="Tìm kiếm Hybrid Search thời gian thực kết hợp Vector Embeddings 768 chiều và Full-Text Search tsvector với độ trễ thấp."
    >
      {/* Bộ lọc lĩnh vực dạng Tabs chuẩn Astryx */}
      <TabList
        value={domain}
        onChange={handleSelectTab}
        hasDivider
      >
        {domainTabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
          />
        ))}
      </TabList>

      {/* Thanh tìm kiếm toàn diện (Omni-search Bar) */}
      <Card padding={4}>
        <VStack gap={3}>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <TextInput
                label="Từ khóa tra cứu hoặc nội dung tranh chấp pháp lý"
                value={query}
                onChange={setQuery}
                placeholder="Nhập từ khóa (ví dụ: nồng độ cồn, thử việc 90 ngày, bẫy cọc, rút bảo hiểm xã hội...)"
              />
            </StackItem>
            <StackItem size="static">
              <Selector
                label="Lọc theo Lĩnh vực"
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
            <Text type="supporting" style={{ fontSize: '13px' }}>
              {loading ? 'Đang truy vấn kho luật...' : `Tìm thấy ${total} điều khoản phù hợp`}
            </Text>
            {domain && (
              <Badge label={`Lĩnh vực: ${domain}`} variant="blue" />
            )}
          </HStack>
        </VStack>
      </Card>

      {/* Bảng dữ liệu Grid mật độ cao */}
      <Card padding={4}>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center">
            <Heading level={3}>Danh Sách Điều Khoản & Căn Cứ Pháp Lý</Heading>
            <Badge label={`${results.length} hiển thị`} variant="teal" />
          </HStack>
          {results.length > 0 ? (
            <Table data={tableData} columns={columns} />
          ) : (
            <EmptyState
              title="Không tìm thấy điều khoản phù hợp"
              description="Thử thay đổi từ khóa tra cứu hoặc chọn 'Tất cả 5 Bộ Luật' để mở rộng phạm vi đối soát."
              isCompact
            />
          )}
        </VStack>
      </Card>

      {/* Drawer trượt cạnh phải (Slide-Over Sheet) chuẩn CRM/HRM thay thế Modal cũ */}
      <Drawer
        isOpen={selectedLaw !== null}
        onOpenChange={(isOpen) => !isOpen && closeDetailDrawer()}
        side="end"
        width={580}
        label="Chi tiết toàn văn điều khoản pháp luật"
      >
        {selectedLaw && (
          <VStack gap={4} style={{ padding: '24px' }}>
            <DrawerHeader
              title={`${selectedLaw.article_number || 'Điều khoản'} ${selectedLaw.clause_number || ''}`}
              subtitle={`${selectedLaw.document_number} • ${selectedLaw.domain || 'Pháp luật Việt Nam'}`}
              onOpenChange={closeDetailDrawer}
              endContent={
                <Badge
                  label={`Độ khớp ${Math.round((selectedLaw.similarity || selectedLaw.score || 0.9) * 100)}%`}
                  variant="success"
                />
              }
            />

            <Divider />

            {/* Tiêu đề điều khoản */}
            {selectedLaw.title && (
              <VStack gap={1}>
                <Text type="supporting" style={{ fontSize: '12px', fontWeight: 600 }}>
                  TIÊU ĐỀ NỘI DUNG:
                </Text>
                <Heading level={4}>{selectedLaw.title}</Heading>
              </VStack>
            )}

            {/* Toàn văn nội dung */}
            <VStack gap={2}>
              <Text type="supporting" style={{ fontSize: '12px', fontWeight: 600 }}>
                NỘI DUNG PHÁP LÝ TOÀN VĂN:
              </Text>
              <Card padding={3} style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Text type="body" style={{ lineHeight: '1.7', whiteSpace: 'pre-line', fontSize: '13.5px' }}>
                  {selectedLaw.content}
                </Text>
              </Card>
            </VStack>

            <Divider />

            {/* Thao tác Drawer */}
            <HStack gap={2} vAlign="center">
              <StackItem size="fill">
                {copySuccess && (
                  <Badge label="✓ Đã chép trích dẫn!" variant="success" />
                )}
              </StackItem>
              <Button
                label="Sao chép trích dẫn"
                variant="secondary"
                size="sm"
                onClick={handleCopyContent}
              />
              <Button
                label="Đóng"
                variant="primary"
                size="sm"
                onClick={closeDetailDrawer}
              />
            </HStack>
          </VStack>
        )}
      </Drawer>
    </PageContainer>
  );
}
