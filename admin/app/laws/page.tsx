'use client';

import React, { useState, useEffect, Suspense, useCallback, useMemo, useRef } from 'react';
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
  Banner,
  StackItem,
} from '@astryxdesign/core';
import {
  searchLaws,
  fetchLegalDomains,
  LegalSearchResultItem,
  LegalDomainItem,
} from '@/lib/api-client';
import { PageContainer } from '@/components/PageContainer';

const PAGE_SIZE = 20;

interface LawRow extends Record<string, unknown> {
  id: string;
  document_number: string;
  article_clause: string;
  domain_title: string;
  content: string;
  similarity: number;
  searchMode: 'browse' | 'search';
  raw: LegalSearchResultItem;
}

/**
 * Tô sáng các từ khóa tìm kiếm trong đoạn trích nội dung pháp luật
 */
function renderHighlightedSnippet(content: string, query: string): React.ReactNode {
  const snippet = content.length > 140 ? `${content.slice(0, 140)}...` : content;
  const terms = Array.from(
    new Set(
      query
        .trim()
        .toLowerCase()
        .split(/[\s,.;:!?()]+/)
        .filter((w) => w.length >= 2)
    )
  )
    .sort((a, b) => b.length - a.length)
    .slice(0, 8);

  if (terms.length === 0) return snippet;

  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = snippet.split(regex);

  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <mark
        key={idx}
        style={{
          backgroundColor: 'rgba(56, 189, 248, 0.22)',
          color: '#E0F2FE',
          paddingInline: '2px',
          borderRadius: '3px',
        }}
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

function LawsBrowserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL searchParams là nguồn sự thật duy nhất (Single State Source) để tránh gọi API 2 lần
  const urlQuery = searchParams.get('q') ?? '';
  const urlDomain = searchParams.get('domain') ?? '';
  const urlDoc = searchParams.get('doc') ?? '';
  const urlPage = Math.max(1, Number(searchParams.get('page') || '1') || 1);

  const [inputQuery, setInputQuery] = useState(urlQuery);
  const [domainsData, setDomainsData] = useState<LegalDomainItem[]>([]);
  const [totalCatalogChunks, setTotalCatalogChunks] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LegalSearchResultItem[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchMode, setSearchMode] = useState<'browse' | 'search'>('browse');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState<LegalSearchResultItem | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const requestIdRef = useRef(0);

  // Tải danh sách lĩnh vực & số lượng chunk thực tế 1 lần khi mount
  useEffect(() => {
    let active = true;
    fetchLegalDomains().then((res) => {
      if (!active) return;
      setDomainsData(res.domains);
      if (res.totalChunks > 0) setTotalCatalogChunks(res.totalChunks);
    });
    return () => {
      active = false;
    };
  }, []);

  const performSearch = useCallback(
    async (q: string, dom: string, doc: string, pageNum: number) => {
      const currentRequestId = ++requestIdRef.current;
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await searchLaws(q, dom || undefined, PAGE_SIZE, {
          docNumber: doc || undefined,
          page: pageNum,
          mode: 'admin',
        });
        if (currentRequestId !== requestIdRef.current) return;

        setResults(Array.isArray(data?.results) ? data.results : []);
        setTotalMatches(data?.totalMatches ?? data?.total ?? (Array.isArray(data?.results) ? data.results.length : 0));
        setSearchMode(data?.searchMode ?? (q.trim() ? 'search' : 'browse'));
        setIsOffline(Boolean(data?.isOfflineFallback));
        if (data?.errorMessage) {
          setErrorMessage(data.errorMessage);
        }
      } catch {
        if (currentRequestId !== requestIdRef.current) return;
        setResults([]);
        setTotalMatches(0);
        setErrorMessage('Không thể kết nối tới bộ máy tra cứu.');
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Chỉ lắng nghe URL params -> kích hoạt đúng 1 lần truy vấn
  useEffect(() => {
    setInputQuery(urlQuery);
    performSearch(urlQuery, urlDomain, urlDoc, urlPage);
  }, [urlQuery, urlDomain, urlDoc, urlPage, performSearch]);

  const navigateWithParams = (next: { q?: string; domain?: string; doc?: string; page?: number }) => {
    const params = new URLSearchParams();
    const qVal = (next.q ?? urlQuery).trim();
    const domVal = next.domain ?? urlDomain;
    const docVal = next.doc ?? urlDoc;
    const pageVal = next.page ?? 1;

    if (qVal) params.set('q', qVal);
    if (domVal) params.set('domain', domVal);
    if (docVal) params.set('doc', docVal);
    if (pageVal > 1) params.set('page', String(pageVal));

    const qs = params.toString();
    router.replace(qs ? `/laws?${qs}` : '/laws');
  };

  const handleSearch = () => {
    navigateWithParams({ q: inputQuery, page: 1 });
  };

  const handleSelectTab = (selectedDomain: string) => {
    // Khi đổi lĩnh vực, reset docNumber về rỗng và về trang 1
    navigateWithParams({ q: inputQuery, domain: selectedDomain, doc: '', page: 1 });
  };

  const handleSelectDoc = (selectedDoc: string) => {
    navigateWithParams({ q: inputQuery, doc: selectedDoc, page: 1 });
  };

  const handleResetFilters = () => {
    setInputQuery('');
    router.replace('/laws');
  };

  // Danh sách Tabs lĩnh vực động từ Gateway
  const domainTabs = useMemo(() => {
    const base = [
      {
        value: '',
        label: totalCatalogChunks !== null
          ? `Tất cả (${totalCatalogChunks.toLocaleString('vi-VN')})`
          : 'Tất cả lĩnh vực',
      },
    ];
    for (const d of domainsData) {
      const countText =
        d.chunkCount > 0 ? d.chunkCount.toLocaleString('vi-VN') : 'Chưa nạp';
      base.push({
        value: d.code,
        label: `${d.name} (${countText})`,
      });
    }
    return base;
  }, [domainsData, totalCatalogChunks]);

  // Danh sách Văn bản động phụ thuộc theo Tab lĩnh vực đang chọn
  const documentOptions = useMemo(() => {
    const docs = urlDomain
      ? domainsData.find((d) => d.code === urlDomain)?.documents ?? []
      : domainsData.flatMap((d) => d.documents);

    return [
      {
        value: '',
        label: urlDomain
          ? 'Tất cả văn bản trong lĩnh vực'
          : docs.length > 0
            ? `Tất cả ${docs.length} văn bản`
            : 'Tất cả văn bản',
      },
      ...docs.map((doc) => ({
        value: doc.docNumber,
        label: `${doc.docNumber} (${doc.chunkCount})`,
      })),
    ];
  }, [domainsData, urlDomain]);

  const domainNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of domainsData) {
      map.set(d.code, d.name);
    }
    return map;
  }, [domainsData]);

  const totalPages = Math.max(1, Math.ceil(totalMatches / PAGE_SIZE));
  const hasActiveFilter = Boolean(urlQuery || urlDomain || urlDoc || urlPage > 1);

  const tableData: LawRow[] = (results || []).map((item) => {
    const refParts = [item.point_number, item.clause_number, item.article_number].filter(Boolean);
    return {
      id: item.id,
      document_number: item.document_number || 'Văn bản Luật',
      article_clause: refParts.join(' • ') || 'Điều khoản',
      domain_title:
        item.full_reference ||
        domainNameMap.get((item.domain || '').toUpperCase()) ||
        item.domain ||
        'Quy định chung',
      content: item.content,
      similarity: Math.round((item.similarity ?? item.score ?? 0) * 100),
      searchMode,
      raw: item,
    };
  });

  const openDetailDrawer = (law: LegalSearchResultItem) => {
    setSelectedLaw(law);
    setCopySuccess(false);
  };

  const closeDetailDrawer = () => {
    setSelectedLaw(null);
  };

  const handleCopyContent = async () => {
    if (!selectedLaw) return;
    const cite = `${selectedLaw.full_reference || `${selectedLaw.document_number} ${selectedLaw.article_number || ''} ${selectedLaw.clause_number || ''}`}\n${selectedLaw.content}`;
    try {
      await navigator.clipboard?.writeText(cite);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      setCopySuccess(false);
    }
  };

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
      header: 'Điều / Khoản / Điểm',
      renderCell: (item: LawRow) => (
        <Text type="body" style={{ fontWeight: 600, fontSize: '13px', color: '#F8FAFC' }}>
          {item.article_clause}
        </Text>
      ),
    },
    {
      key: 'domain_title',
      header: 'Căn cứ trích dẫn',
      renderCell: (item: LawRow) => (
        <Text type="supporting" style={{ fontSize: '12.5px', color: '#94A3B8' }}>
          {item.domain_title}
        </Text>
      ),
    },
    {
      key: 'content',
      header: 'Nội dung trích đoạn',
      renderCell: (item: LawRow) => (
        <Text type="body" style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5 }}>
          {renderHighlightedSnippet(item.content, urlQuery)}
        </Text>
      ),
    },
    {
      key: 'similarity',
      header: searchMode === 'browse' ? 'Trạng thái' : 'Độ khớp',
      renderCell: (item: LawRow) => {
        if (item.searchMode === 'browse') {
          return <Badge label="Duyệt kho" variant="neutral" />;
        }
        const isHighMatch = item.similarity >= 70;
        return (
          <HStack gap={2} vAlign="center" style={{ minWidth: '110px' }}>
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

  const startIdx = totalMatches > 0 ? (urlPage - 1) * PAGE_SIZE + 1 : 0;
  const endIdx = Math.min(totalMatches, urlPage * PAGE_SIZE);

  return (
    <PageContainer
      title={
        totalCatalogChunks !== null
          ? `Tra Cứu Kho Dữ Liệu Luật (${totalCatalogChunks.toLocaleString('vi-VN')} Chunks)`
          : 'Tra Cứu Kho Dữ Liệu Luật'
      }
      description="Hỗ trợ duyệt kho theo lĩnh vực/văn bản, tra cứu đích danh Điều luật và phân tích nội dung mô tả tranh chấp pháp lý."
    >
      {/* Bộ lọc lĩnh vực duy nhất dạng Tabs động từ Gateway */}
      <TabList
        value={urlDomain}
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

      {isOffline && (
        <Banner
          title="Chế độ ngoại tuyến (Gateway Offline)"
          message="Không thể kết nối tới API Gateway (:3001). Hệ thống đang hiển thị dữ liệu mẫu tối thiểu."
          variant="warning"
        />
      )}

      {errorMessage && (
        <Banner
          title="Lỗi truy vấn kho dữ liệu"
          message={errorMessage}
          variant="error"
        />
      )}

      {/* Thanh tìm kiếm & lọc theo Văn bản cụ thể */}
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
            <HStack gap={3} vAlign="end" wrap="wrap">
              <StackItem size="fill">
                <TextInput
                  label="Từ khóa tra cứu, số Điều hoặc mô tả tranh chấp pháp lý"
                  htmlName="law-search-query"
                  value={inputQuery}
                  onChange={setInputQuery}
                  onEnter={handleSearch}
                  hasClear
                  placeholder="Để trống để duyệt toàn bộ, hoặc nhập: nồng độ cồn, Điều 25 thử việc, hay mô tả tình huống tranh chấp..."
                />
              </StackItem>
              <StackItem size="static">
                <Selector
                  label="Lọc theo Văn bản"
                  value={urlDoc}
                  onChange={handleSelectDoc}
                  options={documentOptions}
                />
              </StackItem>
              <StackItem>
                <HStack gap={2}>
                  <Button
                    label={loading ? 'Đang tìm...' : 'Tìm kiếm'}
                    variant="primary"
                    onClick={handleSearch}
                  />
                  {hasActiveFilter && (
                    <Button
                      label="Xóa bộ lọc"
                      variant="secondary"
                      onClick={handleResetFilters}
                    />
                  )}
                </HStack>
              </StackItem>
            </HStack>

            <HStack gap={2} vAlign="center" wrap="wrap">
              <Text
                type="supporting"
                style={{
                  fontSize: '12.5px',
                  color: '#94A3B8',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {loading
                  ? 'Đang truy vấn kho luật...'
                  : totalMatches > 0
                    ? `${searchMode === 'browse' ? 'Đang duyệt' : 'Tìm thấy'} ${totalMatches.toLocaleString('vi-VN')} điều khoản phù hợp (hiển thị ${startIdx}–${endIdx})`
                    : 'Không tìm thấy điều khoản phù hợp'}
              </Text>
              {urlDomain && (
                <Badge
                  label={`Lĩnh vực: ${domainNameMap.get(urlDomain) || urlDomain}`}
                  variant="blue"
                />
              )}
              {urlDoc && (
                <Badge label={`Văn bản: ${urlDoc}`} variant="teal" />
              )}
            </HStack>
          </VStack>
        </form>
      </Card>

      {/* Bảng dữ liệu Grid & Phân trang */}
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
            <Badge label={`${results.length} dòng / trang ${urlPage}`} variant="teal" />
          </HStack>
          {results.length > 0 ? (
            <>
              <Table data={tableData} columns={columns} />
              {totalPages > 1 && (
                <HStack gap={2} vAlign="center" style={{ justifyContent: 'flex-end', paddingTop: '8px' }}>
                  <Button
                    label="← Trang trước"
                    variant="secondary"
                    size="sm"
                    isDisabled={loading || urlPage <= 1}
                    onClick={() => navigateWithParams({ page: Math.max(1, urlPage - 1) })}
                  />
                  <Text
                    type="supporting"
                    style={{
                      fontSize: '12.5px',
                      color: '#CBD5E1',
                      fontVariantNumeric: 'tabular-nums',
                      paddingInline: '8px',
                    }}
                  >
                    Trang {urlPage} / {totalPages}
                  </Text>
                  <Button
                    label="Trang sau →"
                    variant="secondary"
                    size="sm"
                    isDisabled={loading || urlPage >= totalPages}
                    onClick={() => navigateWithParams({ page: Math.min(totalPages, urlPage + 1) })}
                  />
                </HStack>
              )}
            </>
          ) : (
            <EmptyState
              title="Không tìm thấy điều khoản phù hợp"
              description={
                urlDomain && (domainsData.find((d) => d.code === urlDomain)?.chunkCount ?? 1) === 0
                  ? 'Lĩnh vực này chưa được nạp dữ liệu văn bản luật vào kho. Hãy chọn 1 trong 4 lĩnh vực đã nạp hoặc mở rộng sang Tất cả.'
                  : 'Thử rút gọn từ khóa trọng tâm, kiểm tra lại bộ lọc Văn bản hoặc bấm "Xóa bộ lọc" để duyệt toàn kho.'
              }
              isCompact
            />
          )}
        </VStack>
      </Card>

      {/* Drawer trượt cạnh phải */}
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
              title={
                [selectedLaw.point_number, selectedLaw.clause_number, selectedLaw.article_number]
                  .filter(Boolean)
                  .join(' • ') || 'Điều khoản pháp luật'
              }
              subtitle={`${selectedLaw.document_number} • ${domainNameMap.get((selectedLaw.domain || '').toUpperCase()) || selectedLaw.domain || 'Pháp luật Việt Nam'}`}
              onOpenChange={closeDetailDrawer}
              endContent={
                searchMode === 'browse' ? (
                  <Badge label="Duyệt kho" variant="neutral" />
                ) : (
                  <Badge
                    label={`Độ khớp ${Math.round((selectedLaw.similarity ?? selectedLaw.score ?? 0) * 100)}%`}
                    variant="success"
                  />
                )
              }
            />

            <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            {(selectedLaw.full_reference || selectedLaw.title) && (
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
                  CĂN CỨ TRÍCH DẪN CHUẨN:
                </Text>
                <Heading level={4} style={{ fontSize: '15px', fontWeight: 600, color: '#38BDF8', margin: 0 }}>
                  {selectedLaw.full_reference || selectedLaw.title}
                </Heading>
              </VStack>
            )}

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
          title="Tra Cứu Kho Dữ Liệu Luật"
          description="Đang đồng bộ danh mục văn bản pháp luật từ hệ thống..."
        >
          <Text type="supporting" style={{ color: '#94A3B8' }}>Đang tải giao diện tra cứu pháp luật...</Text>
        </PageContainer>
      }
    >
      <LawsBrowserContent />
    </Suspense>
  );
}
