'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

function LawsBrowserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get('q');
  const domainParam = searchParams.get('domain');

  const [query, setQuery] = useState(qParam ?? 'nồng độ cồn');
  const [domain, setDomain] = useState(domainParam ?? '');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LegalSearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedLaw, setSelectedLaw] = useState<LegalSearchResultItem | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const performSearch = useCallback(async (searchQuery: string, searchDomain: string) => {
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
  }, []);

  // Đồng bộ và tự động tìm kiếm khi URL thay đổi
  useEffect(() => {
    const currentQ = qParam ?? 'nồng độ cồn';
    const currentDomain = domainParam ?? '';
    setQuery(currentQ);
    setDomain(currentDomain);
    performSearch(currentQ, currentDomain);
  }, [qParam, domainParam, performSearch]);

  const handleSearch = () => {
    const trimmed = query.trim();
    performSearch(trimmed, domain);
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (domain) params.set('domain', domain);
    router.replace(`/laws?${params.toString()}`);
  };

  const handleSelectTab = (selectedDomain: string) => {
    setDomain(selectedDomain);
    performSearch(query, selectedDomain);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedDomain) params.set('domain', selectedDomain);
    router.replace(`/laws?${params.toString()}`);
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
        <Text type="body" style={{ fontWeight: 600, fontSize: '13px', color: '#F8FAFC' }}>
          {item.article_clause}
        </Text>
      ),
    },
    {
      key: 'domain_title',
      header: 'Tiêu đề quy định',
      renderCell: (item: LawRow) => (
        <Text type="supporting" style={{ fontSize: '13px', color: '#94A3B8' }}>
          {item.domain_title}
        </Text>
      ),
    },
    {
      key: 'content',
      header: 'Nội dung trích đoạn',
      renderCell: (item: LawRow) => (
        <Text type="body" style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.45 }}>
          {item.content.length > 110 ? `${item.content.slice(0, 110)}...` : item.content}
        </Text>
      ),
    },
    {
      key: 'similarity',
      header: 'Độ khớp Hybrid',
      renderCell: (item: LawRow) => {
        const isHighMatch = item.similarity >= 85;
        return (
          <HStack gap={2} vAlign="center" style={{ minWidth: '120px' }}>
            <StackItem size="fill">
              <ProgressBar
                value={item.similarity}
                max={100}
                label="Độ khớp"
                isLabelHidden
                variant={isHighMatch ? 'success' : 'warning'}
              />
            </StackItem>
            <Text
              type="supporting"
              style={{
                fontSize: '12px',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
                color: isHighMatch ? '#10B981' : '#F59E0B',
              }}
            >
              {item.similarity}%
            </Text>
          </HStack>
        );
      },
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
      <Card
        padding={4}
        style={{
          backgroundColor: '#131B2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          style={{ margin: 0, padding: 0 }}
        >
          <VStack gap={3}>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <TextInput
                  label="Từ khóa tra cứu hoặc nội dung tranh chấp pháp lý"
                  value={query}
                  onChange={setQuery}
                  onEnter={handleSearch}
                  hasClear
                  placeholder="Nhập từ khóa (ví dụ: nồng độ cồn, thử việc 90 ngày, bẫy cọc, rút bảo hiểm xã hội...)"
                />
              </StackItem>
              <StackItem size="static">
                <Selector
                  label="Lọc theo Lĩnh vực"
                  value={domain}
                  onChange={handleSelectTab}
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
              <Text
                type="supporting"
                style={{
                  fontSize: '12.5px',
                  color: '#94A3B8',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {loading ? 'Đang truy vấn kho luật...' : `Tìm thấy ${total} điều khoản phù hợp`}
              </Text>
              {domain && (
                <Badge label={`Lĩnh vực: ${domain}`} variant="blue" />
              )}
            </HStack>
          </VStack>
        </form>
      </Card>

      {/* Bảng dữ liệu Grid mật độ cao */}
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
              Danh Sách Điều Khoản & Căn Cứ Pháp Lý
            </Heading>
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

      {/* Drawer trượt cạnh phải (Slide-Over Sheet) chuẩn CRM/HRM */}
      <Drawer
        isOpen={selectedLaw !== null}
        onOpenChange={(isOpen) => !isOpen && closeDetailDrawer()}
        side="end"
        width={600}
        label="Chi tiết toàn văn điều khoản pháp luật"
      >
        {selectedLaw && (
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

            <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            {/* Tiêu đề điều khoản */}
            {selectedLaw.title && (
              <VStack gap={1}>
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
                  TIÊU ĐỀ NỘI DUNG:
                </Text>
                <Heading level={4} style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                  {selectedLaw.title}
                </Heading>
              </VStack>
            )}

            {/* Toàn văn nội dung */}
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
                NỘI DUNG PHÁP LÝ TOÀN VĂN:
              </Text>
              <Card
                padding={3}
                style={{
                  backgroundColor: '#090D16',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                }}
              >
                <Text
                  type="body"
                  style={{
                    lineHeight: '1.7',
                    whiteSpace: 'pre-line',
                    fontSize: '13.5px',
                    color: '#F8FAFC',
                  }}
                >
                  {selectedLaw.content}
                </Text>
              </Card>
            </VStack>

            <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

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

export default function LawsBrowserPage() {
  return (
    <Suspense
      fallback={
        <PageContainer
          title="Tra Cứu Kho Dữ Liệu Luật (4.715 Chunks)"
          description="Tìm kiếm Hybrid Search thời gian thực kết hợp Vector Embeddings 768 chiều và Full-Text Search tsvector với độ trễ thấp."
        >
          <Text type="supporting" style={{ color: '#94A3B8' }}>Đang tải giao diện tra cứu pháp luật...</Text>
        </PageContainer>
      }
    >
      <LawsBrowserContent />
    </Suspense>
  );
}
