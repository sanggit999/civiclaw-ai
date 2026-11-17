import fs from 'node:fs';
import path from 'node:path';

const ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'
];

const TARGET_LAWS = [
  {
    id: '168_2024_ND-CP',
    name: 'Nghị định 168/2024/NĐ-CP (Xử phạt giao thông & trừ điểm GPLX)',
    baseTitle: 'Nghị định số 168/2024/NĐ-CP',
    chaptersCount: 4,
    filename: '168_2024_ND-CP.txt',
  },
  {
    id: '36_2024_QH15',
    name: 'Luật Trật tự, an toàn giao thông đường bộ 2024',
    baseTitle: 'Luật Trật tự, an toàn giao thông đường bộ nước Cộng hòa xã hội chủ nghĩa Việt Nam 2024',
    chaptersCount: 9,
    filename: '36_2024_QH15.txt',
  },
  {
    id: '45_2019_QH14',
    name: 'Bộ luật Lao động 2019',
    baseTitle: 'Bộ luật Lao động nước Cộng hòa xã hội chủ nghĩa Việt Nam 2019',
    chaptersCount: 14,
    filename: '45_2019_QH14.txt',
  },
  {
    id: '41_2024_QH15',
    name: 'Luật Bảo hiểm xã hội 2024',
    baseTitle: 'Luật Bảo hiểm xã hội nước Cộng hòa xã hội chủ nghĩa Việt Nam 2024',
    chaptersCount: 11,
    filename: '41_2024_QH15.txt',
  },
  {
    id: '27_2023_QH15',
    name: 'Luật Nhà ở 2023',
    baseTitle: 'Luật Nhà ở nước Cộng hòa xã hội chủ nghĩa Việt Nam 2023',
    chaptersCount: 13,
    filename: '27_2023_QH15.txt',
  },
];

function htmlToPlainText(html) {
  return html
    .replace(/<div id="headerContainer"[\s\S]*?<\/div>\s*<\/div>/gi, '') // remove header bar
    .replace(/<div class="ws-noexport[\s\S]*?<\/div>/gi, '')
    .replace(/<table class="headertemplate"[\s\S]*?<\/table>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '') // strip all remaining HTML
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10))) // decode decimal entities
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))) // decode hex entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchPageText(pageTitle) {
  const url = `https://vi.wikisource.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&format=json&prop=text`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CivicLawAI-IngestionBot/1.0 (contact: admin@civiclaw.ai)' }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.info);
  }
  return htmlToPlainText(data.parse?.text?.['*'] || '');
}

async function fetchLaw(law, rawDir) {
  console.log(`\n======================================================`);
  console.log(`Processing: [${law.id}] ${law.name}`);
  console.log(`======================================================`);

  const destPath = path.join(rawDir, law.filename);
  if (fs.existsSync(destPath)) {
    const stat = fs.statSync(destPath);
    if (stat.size > 10000) {
      console.log(`[SKIP] Already exists (${(stat.size / 1024).toFixed(1)} KB) -> ${law.filename}`);
      return;
    }
  }

  const parts = [];
  for (let i = 0; i < law.chaptersCount; i++) {
    const roman = ROMAN_NUMERALS[i];
    const chapterName = `Chương_${roman}`;
    const pageTitle = `${law.baseTitle}/${chapterName}`;
    process.stdout.write(`  - Fetching ${chapterName} ... `);
    try {
      const text = await fetchPageText(pageTitle);
      parts.push(text);
      console.log(`OK (${text.length} chars)`);
    } catch (err) {
      console.log(`FAILED (${err.message}) - checking base page`);
    }
  }

  // If no chapter subpages found (e.g. single page document), fetch base title directly
  if (parts.length === 0) {
    process.stdout.write(`  - Fetching base page ... `);
    const text = await fetchPageText(law.baseTitle);
    parts.push(text);
    console.log(`OK (${text.length} chars)`);
  }

  const fullText = parts.join('\n\n');
  fs.writeFileSync(destPath, fullText, 'utf-8');
  console.log(`=> SAVED ${destPath} (${(fullText.length / 1024).toFixed(1)} KB, ${fullText.length} characters)`);
}

async function main() {
  const rawDir = path.resolve('data/raw');
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });

  for (const law of TARGET_LAWS) {
    await fetchLaw(law, rawDir);
  }

  console.log('\nAll 5 complementary full-text laws downloaded successfully into data/raw/.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
