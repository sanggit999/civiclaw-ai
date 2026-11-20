import {
  ContractAuditReport,
  ContractAuditStats,
  ContractAuditorConfig,
  ContractCategory,
  DEFAULT_CONTRACT_AUDITOR_CONFIG,
} from './types.js';
import { ClauseSegmenter } from './clause-segmenter.js';
import { ClauseLegalityVerifier } from './clause-verifier.js';
import { MandatoryClauseChecker } from './mandatory-clause-checker.js';
import { AuditReportSynthesizer } from './report-synthesizer.js';

/**
 * Trợ lý AI Tự chủ Rà soát Hợp đồng Cá nhân (Contract Auditor Agent)
 * Thực thi chu trình phân đoạn, đối chiếu luật, kiểm tra ngưỡng và sinh báo cáo rủi ro.
 */
export class ContractAuditorAgent {
  private config: Required<ContractAuditorConfig>;

  constructor(customConfig?: ContractAuditorConfig) {
    this.config = {
      ...DEFAULT_CONTRACT_AUDITOR_CONFIG,
      ...(customConfig || {}),
    };
  }

  /**
   * Thực hiện thẩm định toàn diện văn bản hợp đồng
   */
  async auditContract(
    rawText: string,
    category?: ContractCategory,
    options?: ContractAuditorConfig
  ): Promise<ContractAuditReport> {
    if (!rawText || !rawText.trim()) {
      throw new Error('Văn bản hợp đồng đầu vào không được để trống.');
    }

    const effectiveConfig: Required<ContractAuditorConfig> = {
      ...this.config,
      ...(options || {}),
    };

    // 1. Nhận diện danh mục hợp đồng
    const detectedCategory = category || ClauseSegmenter.detectCategory(rawText);

    // 2. Trích xuất tiêu đề văn bản
    const documentTitle = this.extractDocumentTitle(rawText);

    // 3. Phân đoạn điều khoản
    const clauses = ClauseSegmenter.segment(rawText, detectedCategory);

    // 4. Đối chiếu rủi ro từng điều khoản
    const findings = clauses.map((clause) => ClauseLegalityVerifier.verifyClause(clause, detectedCategory));

    // 5. Kiểm tra các điều khoản bắt buộc bị bỏ sót
    const missingClauses = MandatoryClauseChecker.checkMissingClauses(clauses, detectedCategory);

    // 6. Tính toán thống kê
    const redCount = findings.filter((f) => f.riskLevel === 'RED_ILLEGAL').length;
    const yellowCount = findings.filter((f) => f.riskLevel === 'YELLOW_WARNING').length;
    const greenCount = findings.filter((f) => f.riskLevel === 'GREEN_SAFE').length;
    const missingMandatoryCount = missingClauses.filter((m) => m.importance === 'MANDATORY').length;

    const stats: ContractAuditStats = {
      totalClauses: clauses.length,
      redCount,
      yellowCount,
      greenCount,
      missingMandatoryCount,
    };

    // 7. Tính điểm an toàn và phân tầng rủi ro
    const { score: safetyScore, tier: riskTier } = AuditReportSynthesizer.calculateSafetyScore(
      stats,
      effectiveConfig
    );

    // 8. Tạo tóm tắt điều hành
    const summary = AuditReportSynthesizer.generateSummary(documentTitle, stats, safetyScore, riskTier);

    return {
      documentTitle,
      category: detectedCategory,
      safetyScore,
      riskTier,
      summary,
      stats,
      findings,
      missingClauses,
      auditedAt: new Date().toISOString(),
    };
  }

  /**
   * Trích xuất tiêu đề hợp đồng từ những dòng đầu tiên, loại trừ tiêu ngữ quốc gia
   */
  private extractDocumentTitle(rawText: string): string {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => {
        const upper = l.toUpperCase();
        return (
          !upper.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM') &&
          !upper.includes('ĐỘC LẬP - TỰ DO - HẠNH PHÚC') &&
          !upper.includes('ĐỘC LẬP-TỰ DO-HẠNH PHÚC')
        );
      });

    for (const line of lines) {
      if (
        line.toUpperCase().includes('HỢP ĐỒNG') ||
        line.toUpperCase().includes('THỎA THUẬN') ||
        line.toUpperCase().includes('GIẤY VAY') ||
        line.toUpperCase().includes('BIÊN BẢN')
      ) {
        return line;
      }
    }

    return lines[0] || 'Văn bản Hợp đồng';
  }
}
