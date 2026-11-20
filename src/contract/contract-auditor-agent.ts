import {
  ClauseAuditFinding,
  ContractAuditReport,
  ContractAuditStats,
  ContractAuditorConfig,
  ContractCategory,
  DEFAULT_CONTRACT_AUDITOR_CONFIG,
} from './types.js';
import { IContractPolicyProvider } from './policy-types.js';
import { DefaultContractPolicyProvider } from './policy-provider.js';
import { ClauseSegmenter } from './clause-segmenter.js';
import { ClauseLegalityVerifier } from './clause-verifier.js';
import { MandatoryClauseChecker } from './mandatory-clause-checker.js';
import { AuditReportSynthesizer } from './report-synthesizer.js';
import { ILlmProvider } from '../rag/types.js';
import { LegalSearchEngine } from '../search/engine.js';

export interface ContractAuditorDependencies {
  policyProvider?: IContractPolicyProvider;
  searchEngine?: LegalSearchEngine;
  llmProvider?: ILlmProvider;
}

/**
 * Trợ lý AI Tự chủ Rà soát Hợp đồng Cá nhân (Contract Auditor Agent)
 * Hoạt động dựa trên Dynamic Policy Provider (nạp từ Database/system_configs)
 * và kết nối Agentic RAG (kho 4.715 chunks + Gemini LLM).
 */
export class ContractAuditorAgent {
  private config: Required<ContractAuditorConfig>;
  private policyProvider: IContractPolicyProvider;
  private searchEngine?: LegalSearchEngine;
  private llmProvider?: ILlmProvider;

  constructor(
    customConfig?: ContractAuditorConfig,
    dependencies?: ContractAuditorDependencies
  ) {
    this.config = {
      ...DEFAULT_CONTRACT_AUDITOR_CONFIG,
      ...(customConfig || {}),
    };
    this.policyProvider = dependencies?.policyProvider || new DefaultContractPolicyProvider();
    this.searchEngine = dependencies?.searchEngine;
    this.llmProvider = dependencies?.llmProvider;
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

    // 2. Nạp chính sách pháp lý động (từ Supabase system_configs hoặc Policy Provider)
    const policy = await this.policyProvider.getPolicy(detectedCategory);

    // 3. Trích xuất tiêu đề văn bản sạch sẽ
    const documentTitle = this.extractDocumentTitle(rawText);

    // 4. Phân đoạn điều khoản
    const clauses = ClauseSegmenter.segment(rawText, detectedCategory);

    // 5. Đối chiếu rủi ro từng điều khoản theo chính sách động và Agentic RAG (nếu có LLM & Search Engine)
    const findings: ClauseAuditFinding[] = [];
    for (const clause of clauses) {
      // 5.1. Thẩm định qua Dynamic Policy Provider
      let finding = ClauseLegalityVerifier.verifyClause(clause, policy);

      // 5.2. Thẩm định ngữ nghĩa chuyên sâu qua Agentic RAG (nếu có Search Engine & LLM Provider)
      if (
        this.searchEngine &&
        this.llmProvider &&
        finding.riskLevel !== 'RED_ILLEGAL' &&
        clause.category &&
        clause.category !== 'GENERAL'
      ) {
        try {
          const searchResult = await this.searchEngine.search({
            text: `${clause.title} ${clause.text}`,
            limit: 2,
          });

          if (searchResult.isFound && searchResult.results.length > 0) {
            const contextText = searchResult.results
              .map((r) => `${r.chunk.fullReference}: ${r.chunk.content}`)
              .join('\n\n');

            const prompt = `Bạn là Chuyên gia Pháp lý của CivicLaw AI. Hãy đối chiếu điều khoản hợp đồng sau với căn cứ pháp luật:\n\nĐIỀU KHOẢN HỢP ĐỒNG:\n"${clause.text}"\n\nCĂN CỨ PHÁP LUẬT ĐỐI CHIẾU:\n${contextText}\n\nTrả về định dạng JSON:\n{\n  "isViolation": true/false,\n  "riskLevel": "RED_ILLEGAL" | "YELLOW_WARNING" | "GREEN_SAFE",\n  "statutoryCitation": "Tên điều khoản luật",\n  "reason": "Phân tích lý do",\n  "suggestedWording": "Mẫu câu đàm phán lại"\n}`;

            const llmRes = await this.llmProvider.generate(prompt);
            const jsonMatch = /\{[\s\S]*\}/.exec(llmRes.text);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.isViolation && (parsed.riskLevel === 'RED_ILLEGAL' || parsed.riskLevel === 'YELLOW_WARNING')) {
                finding = {
                  clauseId: clause.id,
                  clauseTitle: clause.title,
                  clauseText: clause.text,
                  riskLevel: parsed.riskLevel,
                  reason: parsed.reason,
                  statutoryViolations: [parsed.statutoryCitation || searchResult.results[0].chunk.fullReference],
                  renegotiationWording: parsed.suggestedWording,
                };
              }
            }
          }
        } catch {
          // Fallback an toàn: Giữ nguyên kết quả thẩm định từ Dynamic Policy
        }
      }

      findings.push(finding);
    }

    // 6. Kiểm tra các điều khoản bắt buộc bị bỏ sót theo chính sách động
    const missingClauses = MandatoryClauseChecker.checkMissingClauses(clauses, policy.mandatoryClauses);

    // 7. Tính toán thống kê
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

    // 8. Tính điểm an toàn và phân tầng rủi ro
    const { score: safetyScore, tier: riskTier } = AuditReportSynthesizer.calculateSafetyScore(
      stats,
      effectiveConfig
    );

    // 9. Tạo tóm tắt điều hành
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
