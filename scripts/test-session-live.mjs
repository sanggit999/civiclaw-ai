import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { LegalSearchEngine } from '../dist/search/engine.js';
import { KnowledgeGapQueue } from '../dist/search/gap-queue.js';
import { GeminiLlmProvider } from '../dist/rag/gemini-llm-provider.js';
import { RegexCitationVerifier } from '../dist/rag/citation-verifier.js';
import {
  GroundedRagPipeline,
  createRetrieverFromSearchEngine,
  createGapRecorderFromQueue,
} from '../dist/rag/pipeline.js';
import { InMemorySessionStore } from '../dist/session/in-memory-session-store.js';
import { RuleAndLlmQueryCondenser } from '../dist/session/query-condenser.js';
import { ContextualRagPipeline } from '../dist/session/pipeline.js';

async function testLiveSession() {
  console.log('================================================================');
  console.log('🏛️  CHẠY THỬ NGHIỆM ĐA LƯỢT THỰC TẾ (MULTI-TURN LIVE E2E)');
  console.log('================================================================\n');

  // Nạp 4715 chunks từ 5 bộ luật
  const processedDir = path.resolve('data/processed');
  let chunks = [];
  if (fs.existsSync(processedDir)) {
    const files = fs.readdirSync(processedDir).filter((f) => f.endsWith('.chunks.json'));
    for (const file of files) {
      chunks.push(...JSON.parse(fs.readFileSync(path.join(processedDir, file), 'utf8')));
    }
    console.log(`✅ Đã nạp thành công ${chunks.length} chunks từ kho dữ liệu.`);
  }

  const gapQueue = new KnowledgeGapQueue();
  const searchEngine = new LegalSearchEngine(chunks, gapQueue);
  const retriever = createRetrieverFromSearchEngine(searchEngine);
  const gapRecorder = createGapRecorderFromQueue(gapQueue);
  const verifier = new RegexCitationVerifier();
  const llmProvider = new GeminiLlmProvider({ timeoutMs: 12000 }); // 12 giây timeout bảo đảm phản hồi tức thì

  const ragCore = new GroundedRagPipeline(retriever, gapRecorder, llmProvider, verifier);

  const sessionStore = new InMemorySessionStore();
  const condenser = new RuleAndLlmQueryCondenser(llmProvider); // Pure LLM-only contextual rewriter
  const pipeline = new ContextualRagPipeline(sessionStore, condenser, ragCore);

  const session = await sessionStore.createSession('Phiên tư vấn đa lượt thực tế');
  console.log(`💬 Đã khởi tạo phiên: ${session.id}\n`);

  // LƯỢT 1: Hỏi vi phạm xe máy
  console.log('--- LƯỢT 1 ---');
  console.log('👤 Công dân: "Lỗi chuyển làn đường xe ô tô không có tín hiệu báo trước bị phạt bao nhiêu tiền?"');
  const res1 = await pipeline.chat({
    sessionId: session.id,
    query: 'Lỗi chuyển làn đường xe ô tô không có tín hiệu báo trước bị phạt bao nhiêu tiền?',
    domain: 'TRAFFIC',
  });
  console.log(`⚙️ Tái tạo: [isCondensed = ${res1.isCondensed}] -> "${res1.standaloneQuery}"`);
  console.log(`🤖 Trợ lý: [isGrounded = ${res1.isGrounded}] - Tìm thấy ${res1.citations.length} trích dẫn.`);
  res1.citations.forEach((c) => console.log(`   - ${c.fullReference}`));

  // LƯỢT 2: Hỏi tiếp nối tỉnh lược chủ ngữ ("Thế còn xe mô tô thì sao?")
  console.log('\n--- LƯỢT 2 (Hỏi tiếp nối) ---');
  console.log('👤 Công dân: "Thế còn xe mô tô thì sao?"');
  const res2 = await pipeline.chat({
    sessionId: session.id,
    query: 'Thế còn xe mô tô thì sao?',
    domain: 'TRAFFIC',
  });
  console.log(`⚙️ Tái tạo: [isCondensed = ${res2.isCondensed}] -> "${res2.standaloneQuery}"`);
  console.log(`🤖 Trợ lý: [isGrounded = ${res2.isGrounded}] - Tìm thấy ${res2.citations.length} trích dẫn.`);
  res2.citations.forEach((c) => console.log(`   - ${c.fullReference}`));

  // LƯỢT 3: Đổi chủ đề đột ngột sang thai sản (Topic Shift)
  console.log('\n--- LƯỢT 3 (Đổi chủ đề - Topic Shift) ---');
  const shiftQuery = 'Thời gian hưởng chế độ thai sản khi sinh con của lao động nữ là bao lâu?';
  console.log(`👤 Công dân: "${shiftQuery}"`);
  const res3 = await pipeline.chat({
    sessionId: session.id,
    query: shiftQuery,
  });
  console.log(`⚙️ Tái tạo: [isCondensed = ${res3.isCondensed}] -> "${res3.standaloneQuery}"`);
  console.log(`🤖 Trợ lý: [isGrounded = ${res3.isGrounded}] - Tìm thấy ${res3.citations.length} trích dẫn.`);
  res3.citations.forEach((c) => console.log(`   - ${c.fullReference}`));

  console.log('\n================================================================');
  console.log('✅ HOÀN THÀNH TOÀN BỘ LUỒNG HỘI THOẠI ĐA LƯỢT!');
  console.log('================================================================\n');
}

testLiveSession().catch(console.error);
