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
    name: 'Hợp đồng thuê nhà (Có điều khoản bẫy cọc & báo trước 3 ngày)',
    type: 'RENTAL',
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
    name: 'Hợp đồng lao động (Thử việc 90 ngày & Lương 70%)',
    type: 'LABOR',
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
    name: 'Hợp đồng vay tiền cá nhân (Lãi suất 30%/năm)',
    type: 'CIVIL',
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
  const [report, setReport] = useState<ContractAuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectSample = (sampleKey: 'rental' | 'labor' | 'loan') => {
    const sample = SAMPLE_CONTRACTS[sampleKey];
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
      {/* Các mẫu hợp đồng thử nghiệm nhanh */}
      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>Chọn Mẫu Hợp Đồng Thử Nghiệm Nhanh</Heading>
          <HStack gap={3} wrap="wrap">
            <Button
              label="Mẫu 1: Thuê Nhà (Bẫy Tịch Thu Cọc)"
              variant="secondary"
              onClick={() => handleSelectSample('rental')}
            />
            <Button
              label="Mẫu 2: Lao Động (Thử Việc 90 Ngày & Lương 70%)"
              variant="secondary"
              onClick={() => handleSelectSample('labor')}
            />
            <Button
              label="Mẫu 3: Vay Tiền (Lãi Suất Vượt Trần 30%/Năm)"
              variant="secondary"
              onClick={() => handleSelectSample('loan')}
            />
          </HStack>
        </VStack>
      </Card>

      {/* Khu vực nhập văn bản hợp đồng */}
      <Card padding={4}>
        <VStack gap={4}>
          <Heading level={3}>Văn Bản Hợp Đồng Cần Rà Soát</Heading>

          <textarea
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            rows={12}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e0',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.6',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
            placeholder="Dán toàn văn nội dung hợp đồng cá nhân vào đây..."
          />

          <HStack gap={3} vAlign="center">
            <Button
              label={loading ? 'Đang phân tích pháp lý...' : 'Chạy Kiểm Toán Pháp Lý (AI Agent)'}
              variant="primary"
              onClick={handleRunAudit}
            />
            <Text type="supporting">
              {contractText.length} ký tự — Kết nối trực tiếp Central API Gateway /contracts/audit
            </Text>
          </HStack>
        </VStack>
      </Card>

      {/* Kết quả kiểm toán pháp lý */}
      {report && (
        <VStack gap={4}>
          {/* Hàng thẻ tóm tắt kết quả */}
          <HStack gap={4} wrap="wrap">
            <StackItem size="fill">
              <StatCard
                title="Mức Độ Rủi Ro Tổng Thể"
                value={
                  report.overallRisk === 'RED'
                    ? 'RỦI RO CAO'
                    : report.overallRisk === 'YELLOW'
                    ? 'CẦN CHỈNH SỬA'
                    : 'AN TOÀN PHÁP LÝ'
                }
                subtitle={`Điểm đánh giá rủi ro: ${report.riskScore}/100`}
                badgeLabel={report.overallRisk}
                badgeVariant={
                  report.overallRisk === 'RED'
                    ? 'warning'
                    : report.overallRisk === 'YELLOW'
                    ? 'blue'
                    : 'success'
                }
              />
            </StackItem>
            <StackItem size="fill">
              <StatCard
                title="Số Điều Khoản Phát Hiện Bất Thường"
                value={`${report.findings.length} Điều Khoản`}
                subtitle="Cần thương lượng sửa đổi trước khi đặt bút ký kết"
                badgeLabel="PHÁT HIỆN"
                badgeVariant="teal"
              />
            </StackItem>
          </HStack>

          {/* Đánh giá chung của AI */}
          <Card padding={4}>
            <VStack gap={2}>
              <Heading level={3}>Tóm Tắt Đánh Giá Của CivicLaw Auditor Agent</Heading>
              <Text type="body" style={{ lineHeight: '1.7' }}>
                {report.summary}
              </Text>
            </VStack>
          </Card>

          {/* Chi tiết từng điều khoản vi phạm */}
          <Card padding={4}>
            <VStack gap={4}>
              <Heading level={3}>Chi Tiết Các Điều Khoản Cần Điều Chỉnh</Heading>

              <VStack gap={3}>
                {report.findings.map((finding, idx) => {
                  const isRed = finding.riskLevel === 'RED';
                  return (
                    <Card
                      key={idx}
                      padding={3}
                      style={{
                        borderLeft: isRed ? '4px solid #e53e3e' : '4px solid #dd6b20',
                        backgroundColor: isRed ? '#fff5f5' : '#fffaf0',
                      }}
                    >
                      <VStack gap={2}>
                        <HStack gap={2} vAlign="center">
                          <Heading level={4}>{finding.clauseTitle || `Điều khoản ${idx + 1}`}</Heading>
                          <Badge
                            label={isRed ? 'Vi Phạm Nghiêm Trọng' : 'Rủi Ro Trung Bình'}
                            variant={isRed ? 'warning' : 'neutral'}
                          />
                        </HStack>

                        <VStack gap={1}>
                          <Text type="supporting">Phát hiện rủi ro:</Text>
                          <Text type="body" style={{ fontWeight: 500 }}>
                            {finding.issue}
                          </Text>
                        </VStack>

                        <VStack gap={1}>
                          <Text type="supporting">Khuyến nghị điều chỉnh:</Text>
                          <Text type="body">
                            {finding.recommendation}
                          </Text>
                        </VStack>

                        {finding.legalBasis && (
                          <HStack gap={2} vAlign="center" style={{ marginTop: '4px' }}>
                            <Text type="supporting">Căn cứ pháp lý:</Text>
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
