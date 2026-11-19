import fs from 'node:fs';
import path from 'node:path';
import { cleanLegalText } from '../dist/ingestion/cleaner.js';
import { parseLegalText } from '../dist/ingestion/parser.js';

const LAWS_METADATA = [
  {
    docNumber: '168/2024/NĐ-CP',
    title: 'Nghị định 168/2024/NĐ-CP xử phạt vi phạm giao thông đường bộ và trừ điểm GPLX',
    domain: 'TRAFFIC',
    effectiveDate: '2025-01-01',
    sourceUrl: 'https://vanban.chinhphu.vn/?pageid=27160&docid=212167',
    rawFile: '168_2024_ND-CP.txt',
    outputFile: '168_2024_ND-CP.chunks.json',
  },
  {
    docNumber: '36/2024/QH15',
    title: 'Luật Trật tự, an toàn giao thông đường bộ 2024',
    domain: 'TRAFFIC',
    effectiveDate: '2025-01-01',
    sourceUrl: 'https://vanban.chinhphu.vn/?pageid=27160&docid=211194',
    rawFile: '36_2024_QH15.txt',
    outputFile: '36_2024_QH15.chunks.json',
  },
  {
    docNumber: '45/2019/QH14',
    title: 'Bộ luật Lao động 2019',
    domain: 'LABOR',
    effectiveDate: '2021-01-01',
    sourceUrl: 'https://vanban.chinhphu.vn/?pageid=27160&docid=198540',
    rawFile: '45_2019_QH14.txt',
    outputFile: '45_2019_QH14.chunks.json',
  },
  {
    docNumber: '41/2024/QH15',
    title: 'Luật Bảo hiểm xã hội 2024',
    domain: 'SOCIAL_INSURANCE',
    effectiveDate: '2025-07-01',
    sourceUrl: 'https://vanban.chinhphu.vn/?pageid=27160&docid=211199',
    rawFile: '41_2024_QH15.txt',
    outputFile: '41_2024_QH15.chunks.json',
  },
  {
    docNumber: '27/2023/QH15',
    title: 'Luật Nhà ở 2023',
    domain: 'HOUSING',
    effectiveDate: '2024-08-01',
    sourceUrl: 'https://vanban.chinhphu.vn/?pageid=27160&docid=209627',
    rawFile: '27_2023_QH15.txt',
    outputFile: '27_2023_QH15.chunks.json',
  },
];

async function ingestAll() {
  const rawDir = path.resolve('data/raw');
  const processedDir = path.resolve('data/processed');
  if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

  console.log(`Starting parsing pipeline for all ${LAWS_METADATA.length} legal documents...\n`);

  let totalChunks = 0;

  for (const item of LAWS_METADATA) {
    const rawPath = path.join(rawDir, item.rawFile);
    if (!fs.existsSync(rawPath)) {
      console.log(`[SKIP] Missing raw file: ${item.rawFile}`);
      continue;
    }

    const rawText = fs.readFileSync(rawPath, 'utf-8');
    const cleaned = cleanLegalText(rawText);
    const chunks = parseLegalText(cleaned, item);

    const outPath = path.join(processedDir, item.outputFile);
    fs.writeFileSync(outPath, JSON.stringify(chunks, null, 2), 'utf-8');

    console.log(`✓ [${item.docNumber}] ${item.title.slice(0, 45)}... -> ${chunks.length} chunks saved to ${item.outputFile}`);
    totalChunks += chunks.length;
  }

  console.log(`\nAll done! Total chunks generated across 5 laws: ${totalChunks}`);
}

ingestAll();
