import { ContractAuditStats, ContractAuditorConfig, OverallRiskTier } from './types.js';

/**
 * Bộ Tổng hợp Báo cáo Thẩm định Hợp đồng (Audit Report Synthesizer)
 * Tính toán Điểm An toàn Pháp lý (Safety Score) theo trọng số cấu hình.
 */
export class AuditReportSynthesizer {
  /**
   * Tính toán điểm an toàn và phân tầng rủi ro tổng thể
   */
  static calculateSafetyScore(
    stats: ContractAuditStats,
    config: Required<ContractAuditorConfig>
  ): { score: number; tier: OverallRiskTier } {
    const penalty =
      stats.redCount * config.redPenalty +
      stats.yellowCount * config.yellowPenalty +
      stats.missingMandatoryCount * config.missingPenalty;

    const rawScore = 100 - penalty;
    const score = Math.max(0, Math.min(100, rawScore));

    let tier: OverallRiskTier = 'SAFE';
    if (score < config.cautionScoreThreshold || stats.redCount > 0) {
      tier = 'HIGH_RISK';
    } else if (score < config.safeScoreThreshold || stats.yellowCount > 0 || stats.missingMandatoryCount > 0) {
      tier = 'CAUTION';
    }

    return { score, tier };
  }

  /**
   * Sinh tóm tắt điều hành (Executive Summary) cho người dùng
   */
  static generateSummary(
    documentTitle: string,
    stats: ContractAuditStats,
    score: number,
    tier: OverallRiskTier
  ): string {
    const tierText =
      tier === 'SAFE'
        ? 'AN TOÀN PHÁP LÝ (Có thể tự tin ký kết)'
        : tier === 'CAUTION'
        ? 'CẦN CẢNH GIÁC & ĐÀM PHÁN LẠI'
        : 'NGUY HIỂM - CÓ ĐIỀU KHOẢN TRÁI LUẬT HOẶC RỦI RO LỚN';

    return (
      `Hợp đồng "${documentTitle}" đạt điểm an toàn pháp lý: ${score}/100 [Mức độ: ${tierText}]. ` +
      `Phát hiện: ${stats.redCount} điều khoản trái luật (vô hiệu), ` +
      `${stats.yellowCount} điều khoản bất lợi cần đàm phán, ` +
      `${stats.missingMandatoryCount} điều khoản bắt buộc bị bỏ sót, ` +
      `và ${stats.greenCount} điều khoản an toàn.`
    );
  }
}
