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
}

export default function LawsBrowserPage() {
  const [query, setQuery] = useState('nồng độ cồn');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LegalSearchResultItem[]>([]);
  const [total, setTotal] = useState(0);

  const performSearch = async (searchQuery: string, searchDomain: string) => {
    setLoading(true);
    try {
      const data = await searchLaws(searchQuery, searchDomain || undefined, 15);
      setResults(data.results);
      setTotal(data.total);
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

  const domainOptions = [
    { value: '', label: 'Tất cả 5 bộ luật' },
    { value: 'Giao thông', label: 'Luật Giao thông & Nghị định 100/123' },
    { value: 'Lao động', label: 'Bộ luật Lao động 2019' },
    { value: 'Bảo hiểm xã hội', label: 'Luật Bảo hiểm xã hội 2024' },
    { value: 'Nhà ở', label: 'Luật Nhà ở 2023' },
    { value: 'Dân sự', label: 'Bộ luật Dân sự 2015' },
  ];

  const tableData: LawRow[] = results.map((item) => ({
    id: item.id,
    document_number: item.document_number,
    article_clause: `${item.article_number || ''} ${item.clause_number || ''}`.trim() || 'Toàn văn',
    domain_title: item.title || item.domain || 'Quy định chung',
    content: item.content,
    similarity: Math.round((item.similarity || item.score || 0.9) * 100),
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
      header: 'Nội dung trích dẫn',
      renderCell: (item: LawRow) => (
        <Text type="body">{item.content}</Text>
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
  ];

  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={1}>Trình Duyệt & Tra Cứu Kho Luật (4.715 Chunks)</Heading>
        <Text type="supporting">
          Kiểm thử và đối soát kết quả tìm kiếm kết hợp Hybrid Search (Vector 768 chiều và Full-Text Search tsvector tiếng Việt).
        </Text>
      </VStack>

      <Divider />

      {/* Thanh công cụ tìm kiếm */}
      <Card padding={4}>
        <VStack gap={4}>
          <HStack gap={4} wrap="wrap" vAlign="end">
            <StackItem size="fill">
              <TextInput
                label="Từ khóa tìm kiếm hoặc hành vi vi phạm"
                placeholder="Ví dụ: nồng độ cồn, hợp đồng thử việc, bảo hiểm thai sản..."
                value={query}
                onChange={(val) => setQuery(val)}
                onEnter={handleSearch}
                hasClear
              />
            </StackItem>
            <StackItem size="fill">
              <Selector
                label="Lọc theo lĩnh vực pháp luật"
                options={domainOptions}
                value={domain}
                onChange={(val) => setDomain(String(val))}
              />
            </StackItem>
            <StackItem size="static">
              <Button
                label={loading ? 'Đang tra cứu...' : 'Tìm kiếm'}
                variant="primary"
                onClick={handleSearch}
              />
            </StackItem>
          </HStack>
        </VStack>
      </Card>

      {/* Kết quả tra cứu */}
      <Card padding={4}>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center">
            <StackItem size="fill">
              <Heading level={3}>Kết Quả Trích Dẫn Pháp Luật</Heading>
            </StackItem>
            <Badge label={`${total} kết quả`} variant="blue" />
          </HStack>
          <Text type="supporting">
            Mỗi đoạn trích dẫn được gắn định danh duy nhất và liên kết chính xác tới số hiệu văn bản pháp quy trong cơ sở dữ liệu.
          </Text>
          <Table data={tableData} columns={columns} />
        </VStack>
      </Card>
    </VStack>
  );
}
