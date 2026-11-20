import { ContractCategory, RiskLevel } from './types.js';

/**
 * Quy tắc giới hạn định lượng luật định (Statutory Limit Rule)
 * Cấu hình động: Cho phép cập nhật từ Database (system_configs), không fix cứng trong code.
 */
export interface StatutoryLimitRule {
  metric: 'probation_days' | 'loan_interest_annual' | 'advance_notice_penalty';
  threshold: number; // Ví dụ: 60 ngày, 20%/năm
  unit: 'days' | 'percent';
  statutoryCitation: string; // Ví dụ: 'Khoản 2 Điều 25 Bộ luật Lao động 2019'
  reasonTemplate: string;
  suggestedWordingTemplate?: string;
}

/**
 * Quy tắc điều khoản bắt buộc phải có theo luật (Mandatory Clause Rule)
 */
export interface MandatoryClauseRule {
  type: string;
  categoryTag: string;
  description: string;
  statutoryReference: string;
  importance: 'MANDATORY' | 'RECOMMENDED';
  keywords: string[];
}

/**
 * Quy tắc nhận diện điều khoản vi phạm điều cấm hoặc bất lợi (Prohibition Rule)
 */
export interface ProhibitionRule {
  id: string;
  name: string;
  keywords: string[]; // Từ khóa chính nhận diện hành vi
  secondaryKeywords?: string[]; // Từ khóa phụ kết hợp (VD: "giữ", "nộp", "lưu giữ")
  negativeKeywords?: string[]; // Từ khóa phủ định loại trừ vi phạm (VD: "tự lưu giữ", "chỉ nộp bản sao")
  statutoryCitation: string;
  reasonTemplate: string;
  suggestedWordingTemplate?: string;
  riskLevel: RiskLevel;
}

/**
 * Bộ Chính sách Thẩm định Hợp đồng hoàn chỉnh (Contract Policy)
 */
export interface ContractPolicy {
  category: ContractCategory;
  title: string;
  mandatoryClauses: MandatoryClauseRule[];
  limits: StatutoryLimitRule[];
  prohibitions: ProhibitionRule[];
}

/**
 * Hợp đồng cung cấp chính sách hợp đồng động (Dynamic Policy Provider)
 */
export interface IContractPolicyProvider {
  getPolicy(category: ContractCategory): Promise<ContractPolicy>;
}
