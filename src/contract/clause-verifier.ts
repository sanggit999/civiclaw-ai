import { ClauseAuditFinding, ContractCategory, ContractClause, RiskLevel } from './types.js';
import { ContractPolicy } from './policy-types.js';
import { StatutoryLimitChecker } from './statutory-limit-checker.js';
import { DEFAULT_LABOR_POLICY, DEFAULT_LOAN_POLICY, DEFAULT_RENTAL_POLICY } from './policy-provider.js';

/**
 * Tầng Đánh giá Tính Pháp lý & Rủi ro 3 Mức cho Điều khoản Hợp đồng
 * Hoàn toàn động: Nhận chính sách từ Dynamic ContractPolicy (hoặc từ Database),
 * không lưu chuỗi quy định pháp luật cố định trong hàm.
 */
export class ClauseLegalityVerifier {
  static verifyClause(
    clause: ContractClause,
    policyOrCategory: ContractCategory | ContractPolicy
  ): ClauseAuditFinding {
    let policy: ContractPolicy;
    if (typeof policyOrCategory === 'string') {
      if (policyOrCategory === 'labor') policy = DEFAULT_LABOR_POLICY;
      else if (policyOrCategory === 'rental') policy = DEFAULT_RENTAL_POLICY;
      else if (policyOrCategory === 'civil_loan') policy = DEFAULT_LOAN_POLICY;
      else {
        policy = {
          category: policyOrCategory,
          title: `Chính sách ${policyOrCategory}`,
          limits: [],
          prohibitions: [],
          mandatoryClauses: [],
        };
      }
    } else {
      policy = policyOrCategory;
    }

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

    // 1. Kiểm tra các giới hạn định lượng qua các rules trong policy.limits
    for (const limitRule of policy.limits) {
      if (limitRule.metric === 'probation_days') {
        if (clause.category === 'PROBATION' || lower.includes('thử việc')) {
          const check = StatutoryLimitChecker.checkLaborProbation(fullText, limitRule);
          if (check.isViolation) {
            registerViolation(check.riskLevel, check.statutoryCitation, check.reason, check.suggestedWording);
          }
        }
      } else if (limitRule.metric === 'loan_interest_annual') {
        if (policy.category === 'civil_loan' || lower.includes('lãi suất') || lower.includes('tiền lãi')) {
          const check = StatutoryLimitChecker.checkCivilLoanInterest(fullText, limitRule);
          if (check.isViolation) {
            registerViolation(check.riskLevel, check.statutoryCitation, check.reason, check.suggestedWording);
          }
        }
      } else if (limitRule.metric === 'advance_notice_penalty') {
        if (clause.category === 'TERMINATION' || lower.includes('chấm dứt') || lower.includes('nghỉ việc')) {
          const check = StatutoryLimitChecker.checkAdvanceNotice(fullText, limitRule);
          if (check.isViolation) {
            registerViolation(check.riskLevel, check.statutoryCitation, check.reason, check.suggestedWording);
          }
        }
      }
    }

    // 2. Kiểm tra các quy tắc cấm/bất lợi trong policy.prohibitions
    for (const prohibition of policy.prohibitions) {
      // Tiền kiểm tra phủ định (Negative Guard): nếu có từ khóa phủ định thì bỏ qua
      const isNegated = prohibition.negativeKeywords?.some((negKw) => lower.includes(negKw.toLowerCase()));
      if (isNegated) {
        continue;
      }

      // Kiểm tra từ khóa chính
      const hasPrimary = prohibition.keywords.some((kw) => lower.includes(kw.toLowerCase()));

      // Kiểm tra từ khóa phụ (nếu có yêu cầu kết hợp)
      let isTriggered = false;
      if (prohibition.secondaryKeywords && prohibition.secondaryKeywords.length > 0) {
        const hasSecondary = prohibition.secondaryKeywords.some((sk) => lower.includes(sk.toLowerCase()));
        isTriggered = hasPrimary && hasSecondary;
      } else {
        isTriggered = hasPrimary;
      }

      if (isTriggered) {
        registerViolation(
          prohibition.riskLevel,
          prohibition.statutoryCitation,
          prohibition.reasonTemplate,
          prohibition.suggestedWordingTemplate
        );
      }
    }

    // 3. Kết luận
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
