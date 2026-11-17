import { LegalChunk, LegalDocumentMetadata } from './types.js';

/**
 * Trích xuất nhãn văn bản chuẩn dùng trong chuỗi trích dẫn (full_reference)
 * Ví dụ: '168/2024/NĐ-CP' -> 'Nghị định 168/2024/NĐ-CP'
 *        'Bộ luật Lao động 2019' -> 'Bộ luật Lao động 2019'
 */
function getDocumentLabel(metadata: LegalDocumentMetadata): string {
  if (metadata.docNumber.includes('NĐ-CP')) {
    return `Nghị định ${metadata.docNumber}`;
  }
  if (metadata.title.startsWith('Bộ luật') || metadata.title.startsWith('Luật')) {
    return metadata.title;
  }
  return metadata.docNumber;
}

/**
 * Trích xuất từ khóa quan trọng (số tiền phạt, hành vi, chủ thể) từ nội dung điều luật
 */
export function extractKeywords(text: string): string[] {
  const keywordsSet = new Set<string>();

  // 1. Bắt các mức tiền phạt (ví dụ: '300.000 đồng', '400.000 đồng')
  const moneyMatches = text.match(/\b\d{1,3}(?:\.\d{3})*\s*(?:đồng|triệu đồng|nghìn đồng)\b/gi);
  if (moneyMatches) {
    moneyMatches.forEach((m) => keywordsSet.add(m.trim()));
  }

  // 2. Bắt các đối tượng, phương tiện và hành vi pháp lý
  const terms = [
    'xe mô tô',
    'xe gắn máy',
    'xe ô tô',
    'ô tô',
    'mũ bảo hiểm',
    'biển báo hiệu',
    'vạch kẻ đường',
    'đèn tín hiệu',
    'nồng độ cồn',
    'người lao động',
    'người sử dụng lao động',
    'hợp đồng lao động',
    'tiền lương',
    'thử việc',
  ];

  const lower = text.toLowerCase();
  terms.forEach((term) => {
    if (lower.includes(term)) {
      keywordsSet.add(term);
    }
  });

  return Array.from(keywordsSet);
}

/**
 * Phân đoạn văn bản luật theo phân cấp pháp lý: Chương -> Điều -> Khoản -> Điểm
 * 
 * @param text Văn bản luật đã làm sạch
 * @param metadata Thông tin văn bản
 * @returns Mảng các LegalChunk có cấu trúc hoàn chỉnh
 */
export function parseLegalText(
  text: string,
  metadata: LegalDocumentMetadata
): LegalChunk[] {
  const chunks: LegalChunk[] = [];
  const docLabel = getDocumentLabel(metadata);

  // 1. Tách văn bản thành từng Điều
  // Mẫu nhận diện: "Điều 6. Xử phạt..."
  const articleRegex = /(?:^|\n)\s*(Điều\s+\d+[\.:]?\s*[^\n]*)/g;
  const articleMatches: { articleHeader: string; startIndex: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = articleRegex.exec(text)) !== null) {
    articleMatches.push({
      articleHeader: match[1].trim(),
      startIndex: match.index + (match[0].startsWith('\n') ? 1 : 0),
    });
  }

  if (articleMatches.length === 0) {
    return chunks;
  }

  for (let i = 0; i < articleMatches.length; i++) {
    const current = articleMatches[i];
    const nextStart = i + 1 < articleMatches.length ? articleMatches[i + 1].startIndex : text.length;
    const fullArticleText = text.slice(current.startIndex, nextStart).trim();

    // Tách tên Điều: "Điều 6"
    const articleHeaderMatch = current.articleHeader.match(/^(Điều\s+\d+)/i);
    const articleNum = articleHeaderMatch ? articleHeaderMatch[1] : 'Điều';

    // Nội dung bên trong Điều (sau dòng tiêu đề)
    const lines = fullArticleText.split('\n');
    const articleTitleLine = lines[0].trim();
    const articleBodyLines = lines.slice(1);
    const articleBodyText = articleBodyLines.join('\n').trim();

    // 2. Kiểm tra xem Điều có chứa các Khoản không (ví dụ: "1.", "2.", "Khoản 1.")
    const clauseRegex = /(?:^|\n)\s*(?:(?:Khoản\s+)?(\d+)\.|\bKhoản\s+(\d+)[\.:]?)\s*([^\n]*)/gi;
    const clauseMatches: { clauseNum: string; lineText: string; startIndex: number }[] = [];

    let cMatch: RegExpExecArray | null;
    while ((cMatch = clauseRegex.exec(articleBodyText)) !== null) {
      const num = cMatch[1] || cMatch[2];
      clauseMatches.push({
        clauseNum: num,
        lineText: cMatch[0].trim(),
        startIndex: cMatch.index + (cMatch[0].startsWith('\n') ? 1 : 0),
      });
    }

    // Trường hợp A: Điều đứng một mình (Không có Khoản nào bên trong)
    if (clauseMatches.length === 0) {
      const content = `${articleTitleLine}\n${articleBodyText}`.trim();
      const fullReference = `${articleNum} ${docLabel}`;
      chunks.push({
        id: `${metadata.docNumber}_${articleNum}`.replace(/[\s\/\.]+/g, '_'),
        docNumber: metadata.docNumber,
        domain: metadata.domain,
        article: articleNum,
        fullReference,
        content,
        keywords: extractKeywords(content),
      });
      continue;
    }

    // Trường hợp B: Điều có các Khoản
    for (let c = 0; c < clauseMatches.length; c++) {
      const curClause = clauseMatches[c];
      const nextClauseStart =
        c + 1 < clauseMatches.length ? clauseMatches[c + 1].startIndex : articleBodyText.length;
      const fullClauseText = articleBodyText.slice(curClause.startIndex, nextClauseStart).trim();

      const clauseLabel = `Khoản ${curClause.clauseNum}`;

      // 3. Kiểm tra xem Khoản có chứa các Điểm không (ví dụ: "a)", "b)", "c)")
      const pointRegex = /(?:^|\n)\s*([a-zđ])\)\s*([^\n]*)/gi;
      const pointMatches: { pointLetter: string; startIndex: number }[] = [];

      let pMatch: RegExpExecArray | null;
      while ((pMatch = pointRegex.exec(fullClauseText)) !== null) {
        pointMatches.push({
          pointLetter: pMatch[1].toLowerCase(),
          startIndex: pMatch.index + (pMatch[0].startsWith('\n') ? 1 : 0),
        });
      }

      // Trường hợp B1: Khoản không có Điểm (Toàn bộ Khoản là 1 chunk)
      if (pointMatches.length === 0) {
        const content = `${articleTitleLine}\n${fullClauseText}`.trim();
        const fullReference = `${clauseLabel} ${articleNum} ${docLabel}`;
        chunks.push({
          id: `${metadata.docNumber}_${articleNum}_${clauseLabel}`.replace(/[\s\/\.]+/g, '_'),
          docNumber: metadata.docNumber,
          domain: metadata.domain,
          article: articleNum,
          clause: clauseLabel,
          fullReference,
          content,
          keywords: extractKeywords(content),
        });
        continue;
      }

      // Trường hợp B2: Khoản có các Điểm (Mỗi Điểm là 1 chunk có kèm ngữ cảnh của Khoản)
      const clauseIntroText = fullClauseText.slice(0, pointMatches[0].startIndex).trim();

      for (let p = 0; p < pointMatches.length; p++) {
        const curPoint = pointMatches[p];
        const nextPointStart =
          p + 1 < pointMatches.length ? pointMatches[p + 1].startIndex : fullClauseText.length;
        const pointText = fullClauseText.slice(curPoint.startIndex, nextPointStart).trim();

        const pointLabel = `Điểm ${curPoint.pointLetter}`;
        const fullReference = `${pointLabel} ${clauseLabel} ${articleNum} ${docLabel}`;

        // Bảo toàn ngữ cảnh: [Tiêu đề Điều] + [Lời mở đầu mức phạt của Khoản] + [Hành vi của Điểm]
        const content = `${articleTitleLine}\n${clauseIntroText}\n${pointText}`.trim();

        chunks.push({
          id: `${metadata.docNumber}_${articleNum}_${clauseLabel}_${pointLabel}`.replace(
            /[\s\/\.]+/g,
            '_'
          ),
          docNumber: metadata.docNumber,
          domain: metadata.domain,
          article: articleNum,
          clause: clauseLabel,
          point: pointLabel,
          fullReference,
          content,
          keywords: extractKeywords(content),
        });
      }
    }
  }

  return chunks;
}
