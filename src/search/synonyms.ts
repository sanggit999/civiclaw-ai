/**
 * Danh mục ánh xạ từ đồng nghĩa và khẩu ngữ đời thường của người dân sang thuật ngữ quy phạm pháp luật
 * Giúp thu hẹp khoảng cách giữa ngôn ngữ công dân (vượt đèn đỏ, xe máy, bùng cọc) và văn bản quy phạm pháp luật.
 *
 * Tuân thủ Thang 7 bậc Ponytail:
 * - Rung 1 & 2: Không cài thêm package NLP cồng kềnh, dùng RegExp pattern chuẩn xác
 * - Rung 7: Viết lượng code tối thiểu, rõ ràng, dễ bảo trì
 */

export interface LegalSynonymRule {
  /** Biểu thức chính quy nhận diện từ ngữ đời thường/khẩu ngữ */
  pattern: RegExp;
  /** Danh sách các thuật ngữ pháp lý chính thức tương ứng trong văn bản luật */
  statutoryTerms: string[];
}

export const LEGAL_SYNONYM_RULES: LegalSynonymRule[] = [
  // =========================================================================
  // 1. LĨNH VỰC GIAO THÔNG ĐƯỜNG BỘ (Nghị định 168/2024/NĐ-CP & Luật TTATGTĐB 2024)
  // =========================================================================
  {
    pattern: /vượt\s+đèn\s+đỏ|đèn\s+đỏ|vượt\s+đèn\s+vàng|vượt\s+đèn/gi,
    statutoryTerms: ['không chấp hành hiệu lệnh của đèn tín hiệu giao thông', 'đèn tín hiệu'],
  },
  {
    pattern: /\bxe\s+máy\b/gi,
    statutoryTerms: ['xe mô tô', 'xe gắn máy'],
  },
  {
    pattern: /\bô\s+tô\b|xe\s+hơi/gi,
    statutoryTerms: ['xe ô tô'],
  },
  {
    pattern: /nồng\s+độ\s+cồn|uống\s+rượu|uống\s+bia|say\s+rượu|say\s+xỉn|thổi\s+nồng\s+độ/gi,
    statutoryTerms: ['trong máu hoặc hơi thở có nồng độ cồn', 'nồng độ cồn'],
  },
  {
    pattern: /chạy\s+quá\s+tốc\s+độ|bắn\s+tốc\s+độ|quá\s+tốc\s+độ/gi,
    statutoryTerms: ['chạy quá tốc độ quy định'],
  },
  {
    pattern: /đi\s+ngược\s+chiều/gi,
    statutoryTerms: ['đi ngược chiều của đường một chiều', 'biển cấm đi ngược chiều'],
  },
  {
    pattern: /mũ\s+bảo\s+hiểm|nón\s+bảo\s+hiểm/gi,
    statutoryTerms: ['không đội mũ bảo hiểm cho người đi mô tô xe máy', 'mũ bảo hiểm'],
  },
  {
    pattern: /kẹp\s+ba|chở\s+ba|chở\s+quá\s+số\s+người/gi,
    statutoryTerms: ['chở quá số người quy định'],
  },
  {
    pattern: /bằng\s+lái|quên\s+bằng|không\s+có\s+bằng/gi,
    statutoryTerms: ['giấy phép lái xe'],
  },
  {
    pattern: /dùng\s+điện\s+thoại|nghe\s+điện\s+thoại/gi,
    statutoryTerms: ['sử dụng điện thoại di động khi đang điều khiển phương tiện'],
  },

  // =========================================================================
  // 2. LĨNH VỰC LAO ĐỘNG (Bộ luật Lao động 2019)
  // =========================================================================
  {
    pattern: /lương\s+thử\s+việc|tiền\s+lương\s+thử\s+việc/gi,
    statutoryTerms: ['tiền lương trong thời gian thử việc', 'thời gian thử việc'],
  },
  {
    pattern: /sa\s+thải|đuổi\s+việc/gi,
    statutoryTerms: ['kỷ luật sa thải', 'hình thức xử lý kỷ luật sa thải'],
  },
  {
    pattern: /tăng\s+ca|làm\s+thêm\s+giờ|\bot\b/gi,
    statutoryTerms: ['tiền lương làm thêm giờ', 'làm thêm giờ'],
  },
  {
    pattern: /phép\s+năm|nghỉ\s+phép/gi,
    statutoryTerms: ['nghỉ hằng năm', 'ngày nghỉ hằng năm'],
  },
  {
    pattern: /đơn\s+phương\s+nghỉ|tự\s+ý\s+nghỉ\s+việc|bỏ\s+việc/gi,
    statutoryTerms: ['đơn phương chấm dứt hợp đồng lao động'],
  },
  {
    pattern: /trợ\s+cấp\s+thôi\s+việc|nghỉ\s+việc\s+được\s+hưởng/gi,
    statutoryTerms: ['trợ cấp thôi việc', 'trợ cấp mất việc làm'],
  },

  // =========================================================================
  // 3. LĨNH VỰC BẢO HIỂM XÃ HỘI (Luật BHXH 2024 / 2014)
  // =========================================================================
  {
    pattern: /rút\s+bhxh\s+(?:1|một)\s+lần|bhxh\s+(?:1|một)\s+lần|bảo\s+hiểm\s+xã\s+hội\s+1\s+lần/gi,
    statutoryTerms: ['bảo hiểm xã hội một lần', 'hưởng bảo hiểm xã hội một lần'],
  },
  {
    pattern: /thai\s+sản|sinh\s+con/gi,
    statutoryTerms: ['chế độ thai sản', 'trợ cấp một lần khi sinh con'],
  },
  {
    pattern: /lương\s+hưu|nghỉ\s+hưu/gi,
    statutoryTerms: ['chế độ hưu trí', 'điều kiện hưởng lương hưu'],
  },
  {
    pattern: /thất\s+nghiệp|bảo\s+hiểm\s+thất\s+nghiệp/gi,
    statutoryTerms: ['trợ cấp thất nghiệp', 'bảo hiểm thất nghiệp'],
  },

  // =========================================================================
  // 4. LĨNH VỰC NHÀ Ở & HỢP ĐỒNG DÂN SỰ (Luật Nhà ở 2023 & Bộ luật Dân sự 2015)
  // =========================================================================
  {
    pattern: /đặt\s+cọc|tiền\s+cọc|mất\s+cọc|bùng\s+cọc/gi,
    statutoryTerms: ['đặt cọc hợp đồng thuê nhà ở', 'đặt cọc'],
  },
  {
    pattern: /nuôi\s+chó\s+mèo|nuôi\s+thú\s+cưng/gi,
    statutoryTerms: ['chăn thả gia súc gia cầm trong khu vực nhà chung cư', 'nhà chung cư'],
  },
  {
    pattern: /sổ\s+đỏ|sổ\s+hồng/gi,
    statutoryTerms: ['giấy chứng nhận quyền sở hữu nhà ở', 'giấy chứng nhận'],
  },
  {
    pattern: /đòi\s+nhà|lấy\s+lại\s+nhà\s+cho\s+thuê/gi,
    statutoryTerms: ['đơn phương chấm dứt thực hiện hợp đồng thuê nhà ở'],
  },
];

/**
 * Mở rộng câu truy vấn của công dân bằng các thuật ngữ luật tương ứng
 */
export function expandLegalQuery(
  rawQuery: string,
  rules: LegalSynonymRule[] = LEGAL_SYNONYM_RULES
): { expandedText: string; matchedTerms: string[] } {
  const matchedTerms: string[] = [];

  for (const rule of rules) {
    if (rule.pattern.test(rawQuery)) {
      matchedTerms.push(...rule.statutoryTerms);
    }
  }

  if (matchedTerms.length === 0) {
    return { expandedText: rawQuery, matchedTerms: [] };
  }

  // Khử trùng lặp các cụm từ luật bổ sung
  const uniqueTerms = Array.from(new Set(matchedTerms));
  const expandedText = `${rawQuery} ${uniqueTerms.join(' ')}`;

  return { expandedText, matchedTerms: uniqueTerms };
}
