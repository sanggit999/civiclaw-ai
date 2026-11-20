import { LimitCheckResult } from './types.js';

/**
 * Công cụ Kiểm tra Ngưỡng Luật định (Statutory Limit Checker)
 * Kiểm tra các giới hạn định lượng theo quy định của pháp luật Việt Nam.
 */
export class StatutoryLimitChecker {
  /**
   * Kiểm tra thời gian thử việc theo Điều 25 Bộ luật Lao động 2019
   * Neo chặt chẽ vào từ khóa "thử việc" để tránh bắt nhầm thời hạn hợp đồng chính thức.
   */
  static checkLaborProbation(text: string): LimitCheckResult {
    const lower = text.toLowerCase();
    
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

    if (maxProbationDays > 60) {
      return {
        isViolation: true,
        riskLevel: 'RED_ILLEGAL',
        statutoryCitation: 'Khoản 2 Điều 25 Bộ luật Lao động 2019',
        reason: `Thời gian thử việc phát hiện (${maxProbationDays} ngày) vượt quá mức tối đa không quá 60 ngày theo quy định tại Khoản 2 Điều 25 Bộ luật Lao động 2019.`,
        suggestedWording: 'Đề nghị sửa đổi thời gian thử việc thành tối đa không quá 60 ngày theo quy định tại Điều 25 Bộ luật Lao động 2019.',
      };
    }

    return {
      isViolation: false,
      riskLevel: 'GREEN_SAFE',
      statutoryCitation: 'Điều 25 Bộ luật Lao động 2019',
      reason: 'Thời gian thử việc nằm trong giới hạn luật định an toàn.',
    };
  }

  /**
   * Kiểm tra trần lãi suất vay theo Điều 468 Bộ luật Dân sự 2015
   * Neo chặt chẽ vào từ khóa "lãi suất" hoặc "tiền lãi" để tránh bắt nhầm tỷ lệ đặt cọc, tạm ứng.
   */
  static checkCivilLoanInterest(text: string): LimitCheckResult {
    const lower = text.toLowerCase();

    // Neo vào từ khóa lãi suất / lãi vay / tiền lãi
    const interestRegex = /(?:lãi\s+suất|mức\s+lãi|tiền\s+lãi|lãi\s+vay|lãi)[^.\n%\d]{0,35}?(\d+(?:[\.,]\d+)?)\s*%\s*(?:\/|\s*trên\s*|\s*mỗi\s*)?\s*(năm|tháng)?/gi;
    
    let match: RegExpExecArray | null;
    while ((match = interestRegex.exec(lower)) !== null) {
      const rawRate = parseFloat(match[1].replace(',', '.'));
      const unit = match[2]?.toLowerCase() || 'năm';
      const annualizedRate = unit === 'tháng' ? rawRate * 12 : rawRate;

      if (annualizedRate > 20) {
        return {
          isViolation: true,
          riskLevel: 'RED_ILLEGAL',
          statutoryCitation: 'Khoản 1 Điều 468 Bộ luật Dân sự 2015',
          reason: `Mức lãi suất thỏa thuận (${annualizedRate}%/năm) vượt quá trần quy định không được vượt quá 20%/năm của khoản tiền vay theo Khoản 1 Điều 468 Bộ luật Dân sự 2015.`,
          suggestedWording: 'Đề nghị điều chỉnh mức lãi suất vay không vượt quá 20%/năm theo quy định tại Điều 468 Bộ luật Dân sự 2015.',
        };
      }
    }

    return {
      isViolation: false,
      riskLevel: 'GREEN_SAFE',
      statutoryCitation: 'Điều 468 Bộ luật Dân sự 2015',
      reason: 'Mức lãi suất nằm trong giới hạn trần luật định.',
    };
  }

  /**
   * Kiểm tra điều khoản chấm dứt hợp đồng và bồi thường theo Điều 35, 40 BLLĐ 2019
   */
  static checkAdvanceNotice(text: string): LimitCheckResult {
    const lower = text.toLowerCase();

    // Phân biệt: Nếu hợp đồng trích dẫn quy định luật về việc không báo trước thì bồi thường tiền lương những ngày không báo trước (HỢP PHÁP theo Khoản 2 Điều 40 BLLĐ)
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
      return {
        isViolation: true,
        riskLevel: 'RED_ILLEGAL',
        statutoryCitation: 'Điều 35 và Điều 40 Bộ luật Lao động 2019',
        reason: 'Người lao động có quyền đơn phương chấm dứt hợp đồng lao động chỉ cần báo trước theo thời hạn luật định (Điều 35 BLLĐ 2019). Việc áp đặt mức phạt tiền lương cố định khi người lao động nghỉ việc là trái pháp luật trừ khi vi phạm nghĩa vụ báo trước.',
        suggestedWording: 'Kính đề nghị sửa đổi: Người lao động có quyền đơn phương chấm dứt hợp đồng lao động khi báo trước 30 ngày theo quy định tại Điều 35 Bộ luật Lao động 2019 mà không phải bồi thường tiền lương.',
      };
    }

    return {
      isViolation: false,
      riskLevel: 'GREEN_SAFE',
      statutoryCitation: 'Điều 35 Bộ luật Lao động 2019',
      reason: 'Điều khoản chấm dứt phù hợp quy định.',
    };
  }
}
