import { ClauseAuditFinding, ContractCategory, ContractClause, RiskLevel } from './types.js';
import { StatutoryLimitChecker } from './statutory-limit-checker.js';

/**
 * Tầng Đánh giá Tính Pháp lý & Rủi ro 3 Mức cho Điều khoản Hợp đồng
 * Đối chiếu với các quy tắc cấm và án lệ pháp luật Việt Nam.
 */
export class ClauseLegalityVerifier {
  static verifyClause(clause: ContractClause, category: ContractCategory): ClauseAuditFinding {
    const fullText = `${clause.title}\n${clause.text}`;
    const lower = fullText.toLowerCase();

    const violations: string[] = [];
    const reasons: string[] = [];
    const renegotiations: string[] = [];
    let overallRisk: RiskLevel = 'GREEN_SAFE';

    const registerViolation = (
      risk: RiskLevel,
      statutoryCitation: string,
      reason: string,
      renegotiation?: string
    ) => {
      if (risk === 'RED_ILLEGAL') {
        overallRisk = 'RED_ILLEGAL';
      } else if (risk === 'YELLOW_WARNING' && overallRisk !== 'RED_ILLEGAL') {
        overallRisk = 'YELLOW_WARNING';
      }
      if (statutoryCitation && !violations.includes(statutoryCitation)) {
        violations.push(statutoryCitation);
      }
      if (reason && !reasons.includes(reason)) {
        reasons.push(reason);
      }
      if (renegotiation && !renegotiations.includes(renegotiation)) {
        renegotiations.push(renegotiation);
      }
    };

    // 1. Kiểm tra các giới hạn định lượng qua StatutoryLimitChecker
    if (clause.category === 'PROBATION' || lower.includes('thử việc')) {
      const probationCheck = StatutoryLimitChecker.checkLaborProbation(fullText);
      if (probationCheck.isViolation) {
        registerViolation(
          probationCheck.riskLevel,
          probationCheck.statutoryCitation,
          probationCheck.reason,
          probationCheck.suggestedWording
        );
      }
    }

    if (category === 'civil_loan' || lower.includes('lãi suất') || lower.includes('tiền lãi')) {
      const loanCheck = StatutoryLimitChecker.checkCivilLoanInterest(fullText);
      if (loanCheck.isViolation) {
        registerViolation(
          loanCheck.riskLevel,
          loanCheck.statutoryCitation,
          loanCheck.reason,
          loanCheck.suggestedWording
        );
      }
    }

    if (clause.category === 'TERMINATION' || lower.includes('chấm dứt') || lower.includes('nghỉ việc')) {
      const noticeCheck = StatutoryLimitChecker.checkAdvanceNotice(fullText);
      if (noticeCheck.isViolation) {
        registerViolation(
          noticeCheck.riskLevel,
          noticeCheck.statutoryCitation,
          noticeCheck.reason,
          noticeCheck.suggestedWording
        );
      }
    }

    // 2. Kiểm tra các vi phạm pháp luật cấm trong Hợp đồng Lao động (BLLĐ 2019)
    if (category === 'labor' || lower.includes('người lao động') || lower.includes('công ty')) {
      // Vi phạm 1: Giữ bản chính văn bằng, chứng chỉ, giấy tờ tùy thân (Điều 17)
      // Thêm Negative Guard (phủ định): Không cảnh báo nếu người lao động "tự lưu giữ" hoặc "chỉ nộp bản sao"
      const isRetainingNegated =
        lower.includes('tự lưu giữ') ||
        lower.includes('không giữ') ||
        lower.includes('chỉ nộp bản sao') ||
        lower.includes('chỉ thu bản sao') ||
        lower.includes('chỉ giữ bản sao');

      if (
        !isRetainingNegated &&
        (lower.includes('bản chính') || lower.includes('bằng gốc') || lower.includes('giấy tờ gốc')) &&
        (lower.includes('giữ') || lower.includes('nộp') || lower.includes('lưu giữ'))
      ) {
        registerViolation(
          'RED_ILLEGAL',
          'Khoản 1 Điều 17 Bộ luật Lao động 2019',
          'Khoản 1 Điều 17 Bộ luật Lao động 2019 nghiêm cấm người sử dụng lao động giữ bản chính giấy tờ tùy thân, văn bằng, chứng chỉ của người lao động. Điều khoản này bị coi là vô hiệu theo Điều 49 BLLĐ 2019.',
          'Kính đề nghị Công ty sửa đổi: Người lao động chỉ nộp bản sao công chứng để đối chiếu hồ sơ, bản chính do người lao động tự lưu giữ theo đúng quy định tại Khoản 1 Điều 17 Bộ luật Lao động 2019.'
        );
      }

      // Vi phạm 2: Phạt tiền, trừ lương thay kỷ luật lao động (Điều 127)
      if (
        (lower.includes('phạt tiền') || lower.includes('trừ lương') || lower.includes('cắt lương') || lower.includes('trực tiếp vào lương')) &&
        (lower.includes('kpi') || lower.includes('đi muộn') || lower.includes('vi phạm') || lower.includes('nội quy'))
      ) {
        registerViolation(
          'RED_ILLEGAL',
          'Khoản 2 Điều 127 Bộ luật Lao động 2019',
          'Khoản 2 Điều 127 Bộ luật Lao động 2019 nghiêm cấm dùng hình thức phạt tiền, cắt lương thay việc xử lý kỷ luật lao động.',
          'Đề nghị bãi bỏ hình thức phạt tiền/cắt lương, áp dụng các biện pháp xử lý kỷ luật lao động theo đúng trình tự tại Điều 124 Bộ luật Lao động 2019.'
        );
      }

      // Vi phạm 3: Cam kết không cạnh tranh (Non-compete) bất bình đẳng, không có đền bù
      if (
        (lower.includes('không làm việc cho') || lower.includes('không cạnh tranh') || lower.includes('cùng ngành')) &&
        (lower.includes('năm') || lower.includes('tháng') || lower.includes('đối thủ'))
      ) {
        registerViolation(
          'YELLOW_WARNING',
          'Điều 35 Hiến pháp 2013 và Điều 5 Bộ luật Lao động 2019',
          'Điều khoản hạn chế quyền tự do làm việc của công dân (Điều 35 Hiến pháp 2013 và Điều 5 BLLĐ 2019). Để cam kết bảo mật & không cạnh tranh có hiệu lực công bằng, cần đi kèm khoản hỗ trợ tài chính cho người lao động.',
          'Kính đề nghị bổ sung khoản hỗ trợ tài chính hàng tháng trong thời gian người lao động thực hiện cam kết không làm việc cho các đơn vị cạnh tranh trực tiếp.'
        );
      }
    }

    // 3. Kiểm tra các rủi ro trong Hợp đồng Thuê nhà (Luật Nhà ở 2023 & BLDS 2015)
    if (category === 'rental' || lower.includes('thuê nhà') || lower.includes('tiền thuê')) {
      // Rủi ro 1: Tự ý tăng giá thuê bất kỳ lúc nào
      if (
        lower.includes('tự ý tăng') ||
        lower.includes('tăng tiền thuê bất kỳ') ||
        lower.includes('điều chỉnh giá thuê bất kỳ') ||
        (lower.includes('thị trường gia tăng') && lower.includes('tăng'))
      ) {
        registerViolation(
          'YELLOW_WARNING',
          'Điều 165 Luật Nhà ở 2023',
          'Theo Điều 165 Luật Nhà ở 2023, giá thuê nhà do các bên thỏa thuận và chỉ được điều chỉnh khi có thỏa thuận rõ ràng hoặc đáp ứng các điều kiện cụ thể trong hợp đồng.',
          'Kính đề nghị sửa đổi: Giá thuê nhà ổn định trong suốt thời hạn hợp đồng. Mọi việc điều chỉnh giá thuê chỉ được thực hiện khi hai bên cùng đồng thuận bằng văn bản phụ lục hợp đồng.'
        );
      }

      // Rủi ro 2: Tịch thu cọc bất công
      if (lower.includes('tịch thu') && (lower.includes('tiền cọc') || lower.includes('đặt cọc'))) {
        registerViolation(
          'YELLOW_WARNING',
          'Điều 328 Bộ luật Dân sự 2015',
          'Điều khoản tịch thu toàn bộ tiền cọc đặt người thuê vào thế bất lợi nghiêm trọng. Tiền cọc phải được hoàn trả nếu bên thuê đã hoàn thành nghĩa vụ bàn giao nhà và chi phí.',
          'Đề nghị sửa đổi: Tiền đặt cọc sẽ được hoàn trả đầy đủ cho Bên thuê trong vòng 03 ngày làm việc kể từ ngày thanh lý hợp đồng và bàn giao hiện trạng nhà.'
        );
      }
    }

    // 4. Mặc định an toàn nếu không ghi nhận bất kỳ vi phạm nào
    if (overallRisk === 'GREEN_SAFE') {
      return {
        clauseId: clause.id,
        clauseTitle: clause.title,
        clauseText: clause.text,
        riskLevel: 'GREEN_SAFE',
        reason: 'Điều khoản rõ ràng, tuân thủ đúng quy định pháp luật và thông lệ an toàn.',
        statutoryViolations: [],
      };
    }

    return {
      clauseId: clause.id,
      clauseTitle: clause.title,
      clauseText: clause.text,
      riskLevel: overallRisk,
      reason: reasons.join('; '),
      statutoryViolations: violations,
      renegotiationWording: renegotiations.length > 0 ? renegotiations.join('\n\n') : undefined,
    };
  }
}
