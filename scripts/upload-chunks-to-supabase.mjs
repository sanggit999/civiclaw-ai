#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const PROCESSED_DIR = path.resolve('data', 'processed');
const BATCH_SIZE = 500; // Tối ưu theo data-batch-inserts.md của Supabase Best Practices

function printMissingEnvGuide() {
  console.log(`
================================================================================
⚠️ CHƯA CẤU HÌNH KẾT NỐI SUPABASE TRONG FILE .env
================================================================================
Để nạp 4.715 chunks vào Supabase Database, vui lòng thực hiện 4 bước sau:

1. Đăng ký & Tạo Project:
   - Truy cập https://supabase.com (Gói Miễn phí vĩnh viễn)
   - Tạo Project mới: Tên "civiclaw-ai", chọn khu vực (Region): Singapore (gần Việt Nam nhất)

2. Khởi tạo Bảng & Chỉ mục:
   - Vào mục "SQL Editor" trên thanh bên trái của Supabase Dashboard
   - Nhấn "New query", mở file "specs/003-supabase-storage/schema.sql", copy toàn bộ nội dung và dán vào
   - Nhấn nút "Run" để tự động tạo 3 bảng (legal_chunks, unresolved_queries, system_configs),
     các chỉ mục (HNSW, GIN FTS) và kích hoạt RLS.

3. Lấy API Keys:
   - Vào mục "Project Settings" (icon bánh răng) -> Chọn "API"
   - Copy "Project URL" và Secret key "service_role" (để nạp dữ liệu quyền Admin)

4. Cập nhật file .env:
   - Mở (hoặc tạo mới) file ".env" tại thư mục gốc dự án và điền:
     SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
     SUPABASE_ANON_KEY=eyJhbGciOi...
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

5. Chạy lại lệnh:
   npm run upload:supabase
================================================================================
`);
}

export async function readAllProcessedChunks() {
  if (!fs.existsSync(PROCESSED_DIR)) {
    throw new Error(`Thư mục ${PROCESSED_DIR} không tồn tại! Hãy chạy npm run ingest trước.`);
  }

  const files = fs.readdirSync(PROCESSED_DIR).filter((f) => f.endsWith('.chunks.json'));
  if (files.length === 0) {
    throw new Error('Chưa có file chunks nào được bóc tách! Hãy chạy npm run ingest trước.');
  }

  const allChunks = [];
  for (const file of files) {
    const filePath = path.join(PROCESSED_DIR, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    allChunks.push(...content);
  }

  return allChunks;
}

export function normalizeDomain(domain) {
  const upper = (domain || '').toUpperCase();
  if (upper === 'INSURANCE') return 'SOCIAL_INSURANCE';
  if (['TRAFFIC', 'LABOR', 'SOCIAL_INSURANCE', 'HOUSING'].includes(upper)) {
    return upper;
  }
  return 'OTHER';
}

export function toSupabaseRow(chunk) {
  return {
    id: chunk.id,
    doc_number: chunk.docNumber,
    domain: normalizeDomain(chunk.domain),
    chapter: chunk.chapter || null,
    article: chunk.article,
    clause: chunk.clause || null,
    point: chunk.point || null,
    full_reference: chunk.fullReference,
    content: chunk.content,
    keywords: chunk.keywords || [],
    embedding: null,
  };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🚀 [CivicLaw AI] Bắt đầu tiến trình nạp dữ liệu điều luật vào Supabase...');

  // 1. Đọc toàn bộ chunks từ data/processed/
  const chunks = await readAllProcessedChunks();
  console.log(`📦 Đã nạp thành công ${chunks.length.toLocaleString('vi-VN')} chunks từ ${PROCESSED_DIR}`);

  if (isDryRun) {
    console.log(`🔍 [DRY RUN] Kiểm tra cấu trúc:`);
    const sampleRow = toSupabaseRow(chunks[0]);
    console.log('Mẫu bản ghi hợp lệ:', JSON.stringify(sampleRow, null, 2));
    console.log(`✅ [DRY RUN] Dự kiến chia thành ${Math.ceil(chunks.length / BATCH_SIZE)} lô (${BATCH_SIZE} records/lô).`);
    return;
  }

  // 2. Kiểm tra biến môi trường (Bắt buộc dùng SERVICE_ROLE_KEY để có quyền Admin ghi dữ liệu)
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('your-project-id')) {
    printMissingEnvGuide();
    process.exit(1);
  }

  // 3. Khởi tạo Supabase Client
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
  console.log(`🌐 Đang kết nối tới Supabase: ${supabaseUrl}`);
  console.log(`⚡ Bắt đầu nạp ${chunks.length} chunks trong ${totalBatches} lô (mỗi lô ${BATCH_SIZE} bản ghi)...`);

  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
    const batchChunks = chunks.slice(i, i + BATCH_SIZE);
    const rows = batchChunks.map(toSupabaseRow);

    const { error } = await client
      .from('legal_chunks')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error(`\n❌ Lô ${batchIndex}/${totalBatches} thất bại: ${error.message}`);
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.error(`
================================================================================
⚠️ BẢNG public.legal_chunks CHƯA ĐƯỢC TẠO TRÊN SUPABASE!
================================================================================
Vui lòng mở Supabase Studio -> SQL Editor -> Dán nội dung file:
  specs/003-supabase-storage/schema.sql
và nhấn "Run" để tạo các bảng trước khi chạy nạp dữ liệu.
================================================================================`);
        process.exit(1);
      }
      failCount += rows.length;
    } else {
      successCount += rows.length;
      const percent = Math.round((successCount / chunks.length) * 100);
      console.log(`  ✓ Đã nạp lô ${batchIndex}/${totalBatches} (${successCount}/${chunks.length} chunks - ${percent}%)`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n================================================================================`);
  console.log(`🎉 HOÀN THÀNH TIẾN TRÌNH NẠP DỮ LIỆU (${durationSec}s)`);
  console.log(`  - Thành công: ${successCount.toLocaleString('vi-VN')} bản ghi`);
  if (failCount > 0) {
    console.log(`  - Thất bại: ${failCount.toLocaleString('vi-VN')} bản ghi`);
  }
  console.log(`================================================================================`);

  // Kiểm tra xác thực số lượng trên DB
  const { count } = await client
    .from('legal_chunks')
    .select('*', { count: 'exact', head: true });
  console.log(`📊 Tổng số điều luật đang lưu trên bảng public.legal_chunks: ${count} bản ghi.`);
}

// Chạy trực tiếp nếu file được gọi từ CLI
if (process.argv[1] && process.argv[1].endsWith('upload-chunks-to-supabase.mjs')) {
  main().catch((err) => {
    console.error('Lỗi nghiêm trọng:', err);
    process.exit(1);
  });
}
