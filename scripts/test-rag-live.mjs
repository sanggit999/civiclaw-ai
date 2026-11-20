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

async function testLiveRag() {
  console.log('================================================================');
  console.log('🏛️  CHẠY THỬ NGHIỆM THỰC TẾ (LIVE E2E): CIVICLAW AI RAG PIPELINE');
  console.log('================================================================\n');

  // 1. Nạp dữ liệu 5 bộ luật từ output của Spec 001
  const processedDir = path.resolve('data/processed');
  let chunks = [];
  if (fs.existsSync(processedDir)) {
    const files = fs.readdirSync(processedDir).filter((f) => f.endsWith('.chunks.json'));
    for (const file of files) {
      const fileData = JSON.parse(fs.readFileSync(path.join(processedDir, file), 'utf8'));
      chunks.push(...fileData);
    }
    console.log(`✅ Đã nạp thành công ${chunks.length} chunks từ 5 bộ luật chính thống trong ${processedDir}.`);
  } else {
    console.warn('⚠️ Không tìm thấy thư mục data/processed.');
  }

  // 2. Khởi tạo các thành phần cốt lõi
  const gapQueue = new KnowledgeGapQueue();
  const searchEngine = new LegalSearchEngine(chunks, gapQueue);
  const retriever = createRetrieverFromSearchEngine(searchEngine);
  const gapRecorder = createGapRecorderFromQueue(gapQueue);
  const verifier = new RegexCitationVerifier();

  // Khởi tạo Gemini LLM Provider với model gemini-3.8-flash
  const llmProvider = new GeminiLlmProvider();

  const pipeline = new GroundedRagPipeline(
    retriever,
    gapRecorder,
    llmProvider,
    verifier
  );

  // 3. Thực hiện câu hỏi thực tế của công dân
  const question = 'Lỗi chuyển làn đường xe ô tô không có tín hiệu báo trước bị phạt bao nhiêu tiền?';
  console.log(`\n❓ CÂU HỎI CỦA CÔNG DÂN: "${question}"`);
  console.log('⏳ Đang tra cứu dữ liệu luật và tổng hợp phản hồi qua Gemini...\n');

  const startTime = performance.now();
  const response = await pipeline.query({
    query: question,
    domain: 'TRAFFIC',
  });
  const duration = ((performance.now() - startTime) / 1000).toFixed(2);

  console.log('----------------------------------------------------------------');
  console.log('🤖 PHẢN HỒI TỪ CIVICLAW AI:');
  console.log('----------------------------------------------------------------');
  console.log(response.answer);
  console.log('----------------------------------------------------------------');
  console.log('\n📊 THÔNG SỐ KIỂM CHỨNG (GROUNDING VERIFICATION):');
  console.log(`- Điểm tin cậy (Confidence Score): ${response.confidenceScore}`);
  console.log(`- Đã kiểm chứng dẫn nguồn (isGrounded): ${response.isGrounded}`);
  console.log(`- Chế độ suy giảm (degradedMode): ${response.degradedMode ?? false}`);
  console.log(`- Số lượng trích dẫn đã xác thực: ${response.citations.length}`);
  response.citations.forEach((c, idx) => {
    console.log(`  [${idx + 1}] ${c.fullReference} (Khớp Điều: ${c.article}, Khoản: ${c.clause || 'N/A'}, Văn bản: ${c.docNumber})`);
  });

  if (response.unverifiedCitations && response.unverifiedCitations.length > 0) {
    console.warn('⚠️ Phát hiện trích dẫn ma:', response.unverifiedCitations);
  } else {
    console.log('✅ 100% Trích dẫn pháp lý được kiểm chứng chéo với nguồn luật!');
  }

  console.log(`⏱️ Thời gian xử lý: ${duration}s`);
  console.log('================================================================\n');
}

testLiveRag().catch((err) => {
  console.error('Lỗi khi chạy Live RAG:', err);
});
