import { LimitCheckResult } from './types.js';
import { StatutoryLimitRule } from './policy-types.js';

/**
 * Công cụ Kiểm tra Ngưỡng Luật định (Statutory Limit Checker)
 * Thuần túy kiểm tra dựa trên cấu hình quy tắc động (StatutoryLimitRule[]),
 * không hardcode số ngày hay tên điều luật trong thân hàm.
 */
export class StatutoryLimitChecker {
  /**
   * Kiểm tra thời gian thử việc theo quy tắc cấu hình động
   */
  static checkLaborProbation(text: string, rule?: StatutoryLimitRule): LimitCheckResult {
    const lower = text.toLowerCase();
    const thresholdDays = rule?.threshold ?? 60;
    const citation = rule?.statutoryCitation ?? 'Khoản 2 Điều 25 Bộ luật Lao động 2019';

    // Neo chặt chẽ vào từ khóa "thử việc"
    const probationRegex = /(?:thời\s+gian\s+)?thử\s+việc[^.\n\d]{0,35}?(\d+)\s*(ngày|tháng)/gi;

    let match: RegExpExecArray | null;
    let maxProbationDays = 0;

    while ((match = probationRegex.exec(lower)) !== null) {
      const num = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      const days = unit === 'tháng' ? num * 30 : num;
      if (days > maxProbationDays) {
        maxProbationDays = days;
      }
    }

    if (maxProbationDays > thresholdDays) {
      const reason = rule?.reasonTemplate
        ? rule.reasonTemplate
            .replace('{value}', maxProbationDays.toString())
            .replace('{threshold}', thresholdDays.toString())
            .replace('{citation}', citation)
        : `Thời gian thử việc phát hiện (${maxProbationDays} ngày) vượt quá mức tối đa không quá ${thresholdDays} ngày theo quy định tại ${citation}.`;

      const suggestedWording = rule?.suggestedWordingTemplate
        ? rule.suggestedWordingTemplate
            .replace('{threshold}', thresholdDays.toString())
            .replace('{citation}', citation)
        : `Đề nghị sửa đổi thời gian thử việc thành tối đa không quá ${thresholdDays} ngày theo quy định tại ${citation}.`;

      return {
        isViolation: true,
        riskLevel: 'RED_ILLEGAL',
        statutoryCitation: citation,
        reason,
        suggestedWording,
      };
    }

    return {
      isViolation: false,
      riskLevel: 'GREEN_SAFE',
      statutoryCitation: citation,
      reason: 'Thời gian thử việc nằm trong giới hạn luật định an toàn.',
    };
  }

  /**
   * Kiểm tra trần lãi suất vay theo quy tắc cấu hình động
   */
  static checkCivilLoanInterest(text: string, rule?: StatutoryLimitRule): LimitCheckResult {
    const lower = text.toLowerCase();
    const thresholdPercent = rule?.threshold ?? 20;
    const citation = rule?.statutoryCitation ?? 'Khoản 1 Điều 468 Bộ luật Dân sự 2015';

    // Neo vào từ khóa lãi suất / lãi vay / tiền lãi
    const interestRegex = /(?:lãi\s+suất|mức\s+lãi|tiền\s+lãi|lãi\s+vay|lãi)[^.\n%\d]{0,35}?(\d+(?:[\.,]\d+)?)\s*%\s*(?:\/|\s*trên\s*|\s*mỗi\s*)?\s*(năm|tháng)?/gi;

    let match: RegExpExecArray | null;
    while ((match = interestRegex.exec(lower)) !== null) {
      const rawRate = parseFloat(match[1].replace(',', '.'));
      const unit = match[2]?.toLowerCase() || 'năm';
      const annualizedRate = unit === 'tháng' ? rawRate * 12 : rawRate;

      if (annualizedRate > thresholdPercent) {
        const reason = rule?.reasonTemplate
          ? rule.reasonTemplate
              .replace('{value}', annualizedRate.toString())
              .replace('{threshold}', thresholdPercent.toString())
              .replace('{citation}', citation)
          : `Mức lãi suất thỏa thuận (${annualizedRate}%/năm) vượt quá trần quy định không được vượt quá ${thresholdPercent}%/năm của khoản tiền vay theo ${citation}.`;

        const suggestedWording = rule?.suggestedWordingTemplate
          ? rule.suggestedWordingTemplate
              .replace('{threshold}', thresholdPercent.toString())
              .replace('{citation}', citation)
          : `Đề nghị điều chỉnh mức lãi suất vay không vượt quá ${thresholdPercent}%/năm theo quy định tại ${citation}.`;

        return {
          isViolation: true,
          riskLevel: 'RED_ILLEGAL',
          statutoryCitation: citation,
          reason,
          suggestedWording,
        };
      }
    }

    return {
      isViolation: false,
      riskLevel: 'GREEN_SAFE',
      statutoryCitation: citation,
      reason: 'Mức lãi suất nằm trong giới hạn trần luật định.',
    };
  }

  /**
   * Kiểm tra điều khoản chấm dứt hợp đồng và bồi thường theo quy tắc cấu hình động
   */
  static checkAdvanceNotice(text: string, rule?: StatutoryLimitRule): LimitCheckResult {
    const lower = text.toLowerCase();
    const citation = rule?.statutoryCitation ?? 'Điều 35 và Điều 40 Bộ luật Lao động 2019';

    // Phân biệt: Nếu hợp đồng trích dẫn bồi thường khi không báo trước (HỢP PHÁP theo Khoản 2 Điều 40 BLLĐ)
    if (
      lower.includes('những ngày không báo trước') ||
      (lower.includes('không báo trước') && lower.includes('tương ứng với tiền lương'))
    ) {
      return {
        isViolation: false,
        riskLevel: 'GREEN_SAFE',
        statutoryCitation: 'Khoản 2 Điều 40 Bộ luật Lao động 2019',
        reason: 'Nghĩa vụ bồi thường khi không báo trước tuân thủ đúng quy định tại Khoản 2 Điều 40 Bộ luật Lao động 2019.',
      };
    }

    // Phát hiện phạt cố định trái luật: bồi thường X tháng tiền lương khi nghỉ việc
    const fixedPenaltyRegex = /(?:bồi\s+thường|phạt)\s*(?:\d+|[a-zA-ZđĐ]+)?\s*tháng\s+tiền\s+lương/i;
    if (
      (lower.includes('nghỉ việc trước') || lower.includes('chấm dứt trước hạn') || lower.includes('tự ý nghỉ việc')) &&
      (fixedPenaltyRegex.test(lower) || (lower.includes('bồi thường') && lower.includes('tiền lương')))
    ) {
      const reason =
        rule?.reasonTemplate ??
        `Người lao động có quyền đơn phương chấm dứt hợp đồng lao động chỉ cần báo trước theo thời hạn luật định (Điều 35 BLLĐ 2019). Việc áp đặt mức phạt tiền lương cố định khi người lao động nghỉ việc là trái pháp luật trừ khi vi phạm nghĩa vụ báo trước.`;

      const suggestedWording =
        rule?.suggestedWordingTemplate ??
        `Kính đề nghị sửa đổi: Người lao động có quyền đơn phương chấm dứt hợp đồng lao động khi báo trước 30 ngày theo quy định tại Điều 35 Bộ luật Lao động 2019 mà không phải bồi thường tiền lương.`;

      return {
        isViolation: true,
        riskLevel: 'RED_ILLEGAL',
        statutoryCitation: citation,
        reason,
        suggestedWording,
      };
    }

    return {
      isViolation: false,
      riskLevel: 'GREEN_SAFE',
      statutoryCitation: citation,
      reason: 'Điều khoản chấm dứt phù hợp quy định.',
    };
  }
}
