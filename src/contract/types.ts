/**
 * Kiểu dữ liệu và Hợp đồng nghiệp vụ cho Module Contract Auditor Agent
 * Quy chuẩn: Không hardcode số ma thuật hay ranh giới nghiệp vụ.
 */

export type ContractCategory = 'labor' | 'rental' | 'civil_loan' | 'general_civil';

export type RiskLevel = 'RED_ILLEGAL' | 'YELLOW_WARNING' | 'GREEN_SAFE';

export type OverallRiskTier = 'SAFE' | 'CAUTION' | 'HIGH_RISK';

export interface ContractClause {
  id: string; // Định danh chuẩn hóa: "dieu-1", "dieu-2", ...
  title: string; // Tiêu đề điều khoản: "Điều 1: Công việc và địa điểm"
  text: string; // Nội dung toàn văn của điều khoản
  category?: string; // Nhóm nội dung: "SALARY", "PROBATION", "DEPOSIT", "TERMINATION"...
  orderIndex: number;
}

export interface ClauseAuditFinding {
  clauseId: string;
  clauseTitle: string;
  clauseText: string;
  riskLevel: RiskLevel;
  reason: string;
  statutoryViolations: string[]; // Trích dẫn căn cứ luật vi phạm
  renegotiationWording?: string; // Mẫu câu đề xuất đàm phán lại
}

export interface MissingClauseFinding {
  clauseType: string;
  description: string;
  statutoryReference: string; // Căn cứ pháp lý bắt buộc: VD "Điểm f Khoản 1 Điều 21 BLLĐ 2019"
  importance: 'MANDATORY' | 'RECOMMENDED';
}

export interface ContractAuditStats {
  totalClauses: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  missingMandatoryCount: number;
}

export interface ContractAuditReport {
  documentTitle: string;
  category: ContractCategory;
  safetyScore: number; // 0 - 100
  riskTier: OverallRiskTier;
  summary: string;
  stats: ContractAuditStats;
  findings: ClauseAuditFinding[];
  missingClauses: MissingClauseFinding[];
  auditedAt: string; // ISO 8601
}

/**
 * Hợp đồng Agent Tool chuẩn
 */
export interface IAgentTool {
  readonly name: string;
  readonly description: string;
  execute(params: Record<string, any>): Promise<Record<string, any>>;
}

/**
 * Cấu hình tùy biến cho Contract Auditor - Ngăn ngừa hoàn toàn số ma thuật
 */
export interface ContractAuditorConfig {
  readonly redPenalty?: number;
  readonly yellowPenalty?: number;
  readonly missingPenalty?: number;
  readonly safeScoreThreshold?: number;
  readonly cautionScoreThreshold?: number;
}

export const DEFAULT_CONTRACT_AUDITOR_CONFIG: Required<ContractAuditorConfig> = {
  redPenalty: 25,
  yellowPenalty: 10,
  missingPenalty: 15,
  safeScoreThreshold: 80,
  cautionScoreThreshold: 60,
};

export interface LimitCheckResult {
  isViolation: boolean;
  riskLevel: RiskLevel;
  statutoryCitation: string;
  reason: string;
  suggestedWording?: string;
}
