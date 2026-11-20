import { ContractCategory, ContractClause, MissingClauseFinding } from './types.js';

interface MandatoryDefinition {
  type: string;
  categoryTag: string;
  description: string;
  statutoryReference: string;
  importance: 'MANDATORY' | 'RECOMMENDED';
  keywords: string[];
}

const MANDATORY_LABOR_CLAUSES: MandatoryDefinition[] = [
  {
    type: 'COMPENSATION_SALARY',
    categoryTag: 'COMPENSATION_SALARY',
    description: 'Mức lương theo công việc, hình thức trả lương, thời hạn trả lương, phụ cấp lương và các khoản bổ sung khác.',
    statutoryReference: 'Điểm đ Khoản 1 Điều 21 Bộ luật Lao động 2019',
    importance: 'MANDATORY',
    keywords: ['tiền lương', 'mức lương', 'thù lao', 'trả lương', 'lương'],
  },
  {
    type: 'WORKING_HOURS',
    categoryTag: 'WORKING_HOURS',
    description: 'Thời giờ làm việc, thời giờ nghỉ ngơi của người lao động.',
    statutoryReference: 'Điểm e Khoản 1 Điều 21 Bộ luật Lao động 2019',
    importance: 'MANDATORY',
    keywords: ['thời giờ làm việc', 'thời gian làm việc', 'nghỉ ngơi', 'giờ làm'],
  },
  {
    type: 'SOCIAL_INSURANCE',
    categoryTag: 'SOCIAL_INSURANCE',
    description: 'Bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp theo quy định của pháp luật.',
    statutoryReference: 'Điểm f Khoản 1 Điều 21 Bộ luật Lao động 2019',
    importance: 'MANDATORY',
    keywords: ['bảo hiểm xã hội', 'bhxh', 'bảo hiểm y tế', 'bhyt', 'bảo hiểm thất nghiệp', 'bhtn'],
  },
  {
    type: 'LABOR_SAFETY',
    categoryTag: 'LABOR_SAFETY',
    description: 'Trang bị bảo hộ lao động cho người lao động và an toàn vệ sinh lao động.',
    statutoryReference: 'Điểm g Khoản 1 Điều 21 Bộ luật Lao động 2019',
    importance: 'MANDATORY',
    keywords: ['bảo hộ lao động', 'an toàn lao động', 'vệ sinh lao động', 'trang bị bảo hộ'],
  },
];

const MANDATORY_RENTAL_CLAUSES: MandatoryDefinition[] = [
  {
    type: 'RENTAL_PRICE',
    categoryTag: 'RENTAL_PRICE',
    description: 'Giá thuê nhà ở và phương thức, kỳ hạn thanh toán tiền thuê.',
    statutoryReference: 'Điểm c Khoản 1 Điều 163 Luật Nhà ở 2023',
    importance: 'MANDATORY',
    keywords: ['giá thuê', 'tiền thuê', 'thanh toán tiền thuê'],
  },
  {
    type: 'DEPOSIT_MAINTENANCE',
    categoryTag: 'DEPOSIT',
    description: 'Quyền và nghĩa vụ của các bên về sửa chữa, bảo trì nhà ở và điều kiện hoàn trả tiền đặt cọc.',
    statutoryReference: 'Điểm d Khoản 1 Điều 163 Luật Nhà ở 2023',
    importance: 'MANDATORY',
    keywords: ['bảo trì', 'sửa chữa', 'đặt cọc', 'hoàn cọc', 'tiền cọc'],
  },
];

/**
 * Công cụ Kiểm tra Điều khoản Bắt buộc (Mandatory Clause Checker)
 * Phát hiện các nội dung cốt lõi luật định mà hợp đồng cố tình bỏ sót.
 */
export class MandatoryClauseChecker {
  static checkMissingClauses(clauses: ContractClause[], category: ContractCategory): MissingClauseFinding[] {
    if (!clauses || clauses.length === 0) {
      return [];
    }

    let definitions: MandatoryDefinition[] = [];
    if (category === 'labor') {
      definitions = MANDATORY_LABOR_CLAUSES;
    } else if (category === 'rental') {
      definitions = MANDATORY_RENTAL_CLAUSES;
    }

    const missingFindings: MissingClauseFinding[] = [];

    for (const def of definitions) {
      // Kiểm tra xem có điều khoản nào gắn nhãn categoryTag hoặc chứa từ khóa không
      const exists = clauses.some((clause) => {
        if (clause.category === def.categoryTag) {
          return true;
        }
        const textLower = (clause.title + ' ' + clause.text).toLowerCase();
        return def.keywords.some((kw) => textLower.includes(kw));
      });

      if (!exists) {
        missingFindings.push({
          clauseType: def.type,
          description: def.description,
          statutoryReference: def.statutoryReference,
          importance: def.importance,
        });
      }
    }

    return missingFindings;
  }
}
