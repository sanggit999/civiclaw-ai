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
  StatusDot,
  StackItem,
} from '@astryxdesign/core';
import { StatCard } from '@/components/StatCard';
import { PageContainer } from '@/components/PageContainer';
import {
  auditContractDirect,
  ContractAuditReport,
} from '@/lib/api-client';

const SAMPLE_CONTRACTS = {
  rental: {
    name: 'Thuê Nhà (Bẫy cọc 3 ngày)',
    type: 'RENTAL',
    badge: 'RỦI RO CAO',
    badgeVariant: 'warning' as const,
    text: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

HỢP ĐỒNG THUÊ PHÒNG TRỌ VÀ NHÀ Ở

Bên A (Bên cho thuê): Nguyễn Văn A, CMND: 0123456789.
Bên B (Bên thuê): Trần Thị B, CMND: 0987654321.

Hai bên thỏa thuận ký hợp đồng với các điều khoản sau:
Điều 1: Bên A đồng ý cho Bên B thuê phòng tại số 123 đường Cầu Giấy, Hà Nội.
Điều 2: Thời hạn thuê là 12 tháng kể từ ngày ký. Giá thuê là 5.000.000 đồng/tháng.
Điều 3: Bên B phải đặt cọc số tiền 10.000.000 đồng (tương đương 02 tháng tiền nhà).
Điều 4: Tiền cọc sẽ bị Bên A tịch thu toàn bộ 100% nếu Bên B nộp tiền thuê nhà chậm quá 03 ngày kể từ ngày đầu tháng mà không cần thông báo trước.
Điều 5: Bên A có toàn quyền đơn phương chấm dứt hợp đồng và yêu cầu Bên B dọn đi trong vòng 03 ngày nếu Bên A có nhu cầu sử dụng lại nhà cho người thân.
Điều 6: Hợp đồng có hiệu lực kể từ ngày ký.`,
  },
  labor: {
    name: 'Lao Động (Thử việc 90 ngày & Lương 70%)',
    type: 'LABOR',
    badge: 'RỦI RO TRUNG BÌNH',
    badgeVariant: 'blue' as const,
    text: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

HỢP ĐỒNG LAO ĐỘNG THỬ VIỆC

Người sử dụng lao động: Công ty TNHH Giải Pháp Công Nghệ X.
Người lao động: Lê Văn C, chức danh: Chuyên viên kinh doanh giải pháp.

Hai bên thỏa thuận:
Điều 1: Loại hợp đồng: Thử việc vị trí Chuyên viên kinh doanh.
Điều 2: Thời gian thử việc là 90 ngày (03 tháng) liên tục kể từ ngày nhận việc.
Điều 3: Mức lương trong thời gian thử việc bằng 70% mức lương chính thức.
Điều 4: Trong thời gian thử việc, nếu người lao động nghỉ việc vì bất kỳ lý do gì thì không được thanh toán lương của tháng đó.
Điều 5: Công ty không có trách nhiệm đóng các loại bảo hiểm xã hội bắt buộc trong thời gian thử việc.`,
  },
  loan: {
    name: 'Vay Tiền (Lãi suất 30%/năm)',
    type: 'CIVIL',
    badge: 'LÃI VƯỢT TRẦN',
    badgeVariant: 'warning' as const,
    text: `GIẤY VAY TIỀN VÀ HỢP ĐỒNG VAY TÀI SẢN

Bên cho vay: Hoàng Văn D.
Bên vay: Vũ Thị E.

Nội dung thỏa thuận:
Điều 1: Bên D cho Bên E vay số tiền: 100.000.000 VNĐ (Một trăm triệu đồng).
Điều 2: Thời hạn vay là 06 tháng kể từ ngày 01/01/2026 đến ngày 01/07/2026.
Điều 3: Lãi suất vay là 2,5%/tháng (tương đương 30%/năm) tính trên dư nợ gốc ban đầu, thanh toán vào ngày 05 hàng tháng.
Điều 4: Nếu Bên E chậm trả nợ gốc quá 05 ngày, Bên D có quyền tịch thu tài sản thế chấp là xe máy SH mà không cần qua thủ tục đấu giá hay cơ quan tòa án.`,
  },
};

export default function ContractPlaygroundPage() {
  const [contractText, setContractText] = useState(SAMPLE_CONTRACTS.rental.text);
  const [contractType, setContractType] = useState('RENTAL');
  const [activeSample, setActiveSample] = useState<'rental' | 'labor' | 'loan'>('rental');
  const [report, setReport] = useState<ContractAuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectSample = (sampleKey: 'rental' | 'labor' | 'loan') => {
    const sample = SAMPLE_CONTRACTS[sampleKey];
    setActiveSample(sampleKey);
    setContractText(sample.text);
    setContractType(sample.type);
    setReport(null);
  };

  const handleRunAudit = async () => {
    if (!contractText.trim()) return;
    setLoading(true);
    try {
      const res = await auditContractDirect(contractText, contractType);
      setReport(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Sân Thử Nghiệm Kiểm Toán Hợp Đồng (Contract Auditor Testbed)"
      description="Thử nghiệm trực tiếp Agentic Contract Auditor đối soát các điều khoản hợp đồng cá nhân với 5 Bộ luật chính thống và phát hiện bẫy pháp lý."
    >
      {/* Thanh lựa chọn Preset mẫu nhanh kiểu Ironclad */}
      <Card
        padding={3}
        style={{
          backgroundColor: '#131B2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
        }}
      >
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Text
            type="supporting"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#94A3B8',
            }}
          >
            Mẫu Thử Nghiệm Nhanh:
          </Text>
          {(['rental', 'labor', 'loan'] as const).map((key) => {
            const s = SAMPLE_CONTRACTS[key];
            const isSelected = activeSample === key;
            return (
              <Button
                key={key}
                label={`${s.name} [${s.badge}]`}
                variant={isSelected ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleSelectSample(key)}
              />
            );
          })}
        </HStack>
      </Card>

      {/* Editor nhập văn bản hợp đồng với kiểu dáng Monospace chuyên nghiệp */}
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
              Văn Bản Hợp Đồng Cần Rà Soát
            </Heading>
            <Badge label={`Loại: ${contractType}`} variant="teal" />
          </HStack>

          <textarea
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            rows={11}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontFamily: 'var(--font-family-code)',
              fontSize: '13px',
              lineHeight: '1.6',
              boxSizing: 'border-box',
              resize: 'vertical',
              backgroundColor: '#090D16',
              color: '#F8FAFC',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
            placeholder="Dán toàn văn nội dung hợp đồng cá nhân vào đây..."
          />

          <HStack gap={3} vAlign="center">
            <Button
              label={loading ? 'Đang phân tích điều khoản...' : 'Chạy Kiểm Toán Pháp Lý (Agentic RAG)'}
              variant="primary"
              size="md"
              onClick={handleRunAudit}
            />
            <Text
              type="supporting"
              style={{
                fontSize: '12px',
                color: '#64748B',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {contractText.length} ký tự • Kết nối Central API Gateway /contracts/audit
            </Text>
          </HStack>
        </VStack>
      </Card>

      {/* Kết quả kiểm toán pháp lý */}
      {report && (
        <VStack gap={4}>
          {/* Thẻ chỉ số rủi ro CRM Style */}
          <HStack gap={3} wrap="wrap">
            <StackItem size="fill">
              <StatCard
                icon="⚖️"
                title="Mức Độ Rủi Ro Tổng Thể"
                value={
                  report.overallRisk === 'RED'
                    ? 'RỦI RO CAO'
                    : report.overallRisk === 'YELLOW'
                    ? 'CẦN ĐIỀU CHỈNH'
                    : 'AN TOÀN'
                }
                unit={`(${report.riskScore}/100)`}
                subtitle="Chỉ số rủi ro tổng hợp dựa trên 5 bộ luật"
                badgeLabel={report.overallRisk}
                badgeVariant={
                  report.overallRisk === 'RED'
                    ? 'warning'
                    : report.overallRisk === 'YELLOW'
                    ? 'blue'
                    : 'success'
                }
                progress={report.riskScore}
                progressVariant={report.overallRisk === 'RED' ? 'warning' : 'success'}
                trendLabel={report.overallRisk === 'RED' ? 'Cảnh báo đỏ' : 'Khả dụng'}
                trendPositive={report.overallRisk === 'GREEN'}
              />
            </StackItem>

            <StackItem size="fill">
              <StatCard
                icon="🚨"
                title="Điều Khoản Bất Thường"
                value={report.findings.length}
                unit="điều khoản"
                subtitle="Cần yêu cầu bên đối tác sửa đổi"
                badgeLabel="BẪY PHÁP LÝ"
                badgeVariant="teal"
                trendLabel="Cần đàm phán"
                trendPositive={false}
                progress={Math.min(100, report.findings.length * 25)}
                progressVariant="warning"
              />
            </StackItem>

            <StackItem size="fill">
              <StatCard
                icon="📚"
                title="Căn Cứ Pháp Luật Đối Soát"
                value="5"
                unit="bộ luật"
                subtitle="Dân sự, Lao động, Nhà ở, BHXH, Giao thông"
                badgeLabel="ĐÃ ĐỐI SOÁT"
                badgeVariant="success"
                progress={100}
                progressVariant="success"
                trendLabel="100% Căn cứ"
                trendPositive={true}
              />
            </StackItem>
          </HStack>

          {/* Đánh giá chung của AI */}
          <Card
            padding={4}
            style={{
              backgroundColor: '#131B2E',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
            }}
          >
            <VStack gap={2}>
              <HStack gap={2} vAlign="center">
                <StatusDot variant={report.overallRisk === 'RED' ? 'warning' : 'success'} label="Tóm tắt" />
                <Heading level={3} style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                  Tóm Tắt Nhận Định Pháp Lý Từ CivicLaw Auditor
                </Heading>
              </HStack>
              <Text type="body" style={{ lineHeight: '1.7', fontSize: '13.5px', color: '#CBD5E1' }}>
                {report.summary}
              </Text>
            </VStack>
          </Card>

          {/* Chi tiết từng điều khoản vi phạm */}
          <Card
            padding={4}
            style={{
              backgroundColor: '#131B2E',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
            }}
          >
            <VStack gap={4}>
              <HStack gap={2} vAlign="center">
                <Heading level={3} style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                  Chi Tiết Các Điều Khoản Cần Điều Chỉnh
                </Heading>
                <Badge label={`${report.findings.length} phát hiện`} variant="warning" />
              </HStack>

              <VStack gap={3}>
                {report.findings.map((finding, idx) => {
                  const isRed = finding.riskLevel === 'RED';
                  return (
                    <Card
                      key={idx}
                      padding={3}
                      style={{
                        borderLeft: isRed ? '4px solid #EF4444' : '4px solid #F59E0B',
                        backgroundColor: isRed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                        border: isRed ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: '8px',
                      }}
                    >
                      <VStack gap={2}>
                        <HStack gap={2} vAlign="center">
                          <Heading level={4} style={{ fontSize: '14.5px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                            {finding.clauseTitle || `Điều khoản ${idx + 1}`}
                          </Heading>
                          <Badge
                            label={isRed ? 'Vi Phạm Nghiêm Trọng' : 'Rủi Ro Trung Bình'}
                            variant={isRed ? 'warning' : 'neutral'}
                          />
                        </HStack>

                        <VStack gap={1}>
                          <Text
                            type="supporting"
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: isRed ? '#FCA5A5' : '#FCD34D',
                            }}
                          >
                            PHÁT HIỆN RỦI RO / BẪY ĐIỀU KHOẢN:
                          </Text>
                          <Text type="body" style={{ fontWeight: 500, fontSize: '13.5px', color: '#F8FAFC' }}>
                            {finding.issue}
                          </Text>
                        </VStack>

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
                            KHUYẾN NGHỊ ĐIỀU CHỈNH:
                          </Text>
                          <Text type="body" style={{ fontSize: '13.5px', color: '#CBD5E1', lineHeight: 1.5 }}>
                            {finding.recommendation}
                          </Text>
                        </VStack>

                        {finding.legalBasis && (
                          <HStack
                            gap={2}
                            vAlign="center"
                            style={{
                              marginTop: '4px',
                              borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                              paddingTop: '8px',
                            }}
                          >
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
                              CĂN CỨ ĐỐI CHIẾU:
                            </Text>
                            <Badge label={finding.legalBasis} variant="teal" />
                          </HStack>
                        )}
                      </VStack>
                    </Card>
                  );
                })}
              </VStack>
            </VStack>
          </Card>
        </VStack>
      )}
    </PageContainer>
  );
}
