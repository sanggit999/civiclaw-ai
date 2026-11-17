import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const TARGET_DOCS = [
  {
    id: '168_2024_ND-CP',
    name: 'Nghị định 168/2024/NĐ-CP',
    url: 'https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/01/168-nd-cp.signed.pdf',
    filename: '168_2024_ND-CP.pdf',
  },
  {
    id: '36_2024_QH15',
    name: 'Luật Trật tự, ATGT đường bộ 2024 (36/2024/QH15)',
    url: 'https://datafiles.chinhphu.vn/cpp/files/vbpq/2024/9/36-2024-qh15.pdf',
    filename: '36_2024_QH15.pdf',
  },
  {
    id: '45_2019_QH14',
    name: 'Bộ luật Lao động 2019 (45/2019/QH14)',
    url: 'https://datafiles.chinhphu.vn/cpp/files/vbpq/2019/12/45.signed.pdf',
    filename: '45_2019_QH14.pdf',
  },
  {
    id: '41_2024_QH15',
    name: 'Luật Bảo hiểm xã hội 2024 (41/2024/QH15)',
    url: 'https://datafiles.chinhphu.vn/cpp/files/vbpq/2024/9/41-2024-qh15.pdf',
    filename: '41_2024_QH15.pdf',
  },
  {
    id: '27_2023_QH15',
    name: 'Luật Nhà ở 2023 (27/2023/QH15)',
    url: 'https://datafiles.chinhphu.vn/cpp/files/vbpq/2024/01/luat27.pdf',
    filename: '27_2023_QH15.pdf',
  },
];

async function downloadFile(url, destPath) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const fileStream = fs.createWriteStream(destPath);
  await pipeline(Readable.fromWeb(res.body), fileStream);
}

async function main() {
  const rawDir = path.resolve('data/raw');
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  console.log(`Starting download of ${TARGET_DOCS.length} official PDF documents into data/raw/ ...\n`);

  for (const doc of TARGET_DOCS) {
    const dest = path.join(rawDir, doc.filename);
    if (fs.existsSync(dest)) {
      const stats = fs.statSync(dest);
      if (stats.size > 100000) {
        console.log(`[SKIP] ${doc.filename} already exists (${(stats.size / 1024 / 1024).toFixed(2)} MB).`);
        continue;
      }
    }

    process.stdout.write(`Downloading [${doc.id}] ${doc.name} ... `);
    const start = Date.now();
    try {
      await downloadFile(doc.url, dest);
      const stats = fs.statSync(dest);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`DONE in ${elapsed}s (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
    }
  }

  console.log('\nAll official PDF downloads finished.');
}

main();
