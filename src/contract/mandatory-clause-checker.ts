import { ContractCategory, ContractClause, MissingClauseFinding } from './types.js';
import { MandatoryClauseRule } from './policy-types.js';
import { DEFAULT_LABOR_POLICY, DEFAULT_RENTAL_POLICY } from './policy-provider.js';

/**
 * Công cụ Kiểm tra Điều khoản Bắt buộc (Mandatory Clause Checker)
 * Thuần túy kiểm tra dựa trên danh mục quy tắc động (MandatoryClauseRule[]),
 * không hardcode danh mục điều khoản trong mã nguồn.
 */
export class MandatoryClauseChecker {
  static checkMissingClauses(
    clauses: ContractClause[],
    categoryOrRules: ContractCategory | MandatoryClauseRule[]
  ): MissingClauseFinding[] {
    if (!clauses || clauses.length === 0) {
      return [];
    }

    let rules: MandatoryClauseRule[] = [];
    if (Array.isArray(categoryOrRules)) {
      rules = categoryOrRules;
    } else if (categoryOrRules === 'labor') {
      rules = DEFAULT_LABOR_POLICY.mandatoryClauses;
    } else if (categoryOrRules === 'rental') {
      rules = DEFAULT_RENTAL_POLICY.mandatoryClauses;
    }

    const missingFindings: MissingClauseFinding[] = [];

    for (const rule of rules) {
      // Kiểm tra xem có điều khoản nào gắn nhãn categoryTag hoặc chứa từ khóa không
      const exists = clauses.some((clause) => {
        if (clause.category === rule.categoryTag) {
          return true;
        }
        const textLower = (clause.title + ' ' + clause.text).toLowerCase();
        return rule.keywords.some((kw) => textLower.includes(kw.toLowerCase()));
      });

      if (!exists) {
        missingFindings.push({
          clauseType: rule.type,
          description: rule.description,
          statutoryReference: rule.statutoryReference,
          importance: rule.importance,
        });
      }
    }

    return missingFindings;
  }
}
