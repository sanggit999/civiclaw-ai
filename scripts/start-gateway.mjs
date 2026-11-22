import 'dotenv/config';
import { getSupabaseClient } from '../dist/storage/supabase-client.js';
import { LegalSearchEngine } from '../dist/search/engine.js';
import { GroundedRagPipeline } from '../dist/rag/pipeline.js';
import { ContextualRagPipeline } from '../dist/session/pipeline.js';
import { SupabaseSessionStore } from '../dist/session/supabase-session-store.js';
import { InMemorySessionStore } from '../dist/session/in-memory-session-store.js';
import { RuleAndLlmQueryCondenser } from '../dist/session/query-condenser.js';
import { ContractLifecycleManager } from '../dist/contract/contract-lifecycle-manager.js';
import { SupabaseContractVersionStore } from '../dist/contract/supabase-version-store.js';
import { InMemoryContractVersionStore } from '../dist/contract/in-memory-version-store.js';
import { createApiGateway } from '../dist/api/gateway-factory.js';
import { readAllProcessedChunks } from './upload-chunks-to-supabase.mjs';

async function bootstrap() {
  console.log('🏛️  CivicLaw AI - Đang khởi động Central API Gateway...\n');

  let supabase;
  try {
    supabase = getSupabaseClient(true);
    console.log('✅ Kết nối Supabase Cloud: Sẵn sàng.');
  } catch (err) {
    console.warn(`⚠️ Cảnh báo Supabase: ${err.message}. Sử dụng chế độ In-Memory fallback.`);
  }

  // 1. Nạp kho dữ liệu điều luật
  console.log('📚 Đang nạp 4.715 chunks dữ liệu luật...');
  let chunks = [];
  try {
    chunks = await readAllProcessedChunks();
    console.log(`✅ Đã nạp thành công ${chunks.length} chunks từ data/processed/`);
  } catch (err) {
    console.warn('⚠️ Không tìm thấy file dữ liệu processed. Dùng mảng rỗng.');
  }

  const searchEngine = new LegalSearchEngine(chunks);

  // 2. Thiết lập Session Store
  const sessionStore = supabase
    ? new SupabaseSessionStore(supabase)
    : new InMemorySessionStore();

  // 3. Thiết lập Version Store cho hợp đồng
  const versionStore = supabase
    ? new SupabaseContractVersionStore(supabase)
    : new InMemoryContractVersionStore();

  const lifecycleManager = new ContractLifecycleManager({ versionStore });

  // 4. Thiết lập RAG Pipeline & Contextual Pipeline
  const ragPipeline = new GroundedRagPipeline(searchEngine);
  const condenser = new RuleAndLlmQueryCondenser();
  const contextualPipeline = new ContextualRagPipeline(
    sessionStore,
    condenser,
    ragPipeline
  );

  // 5. Khởi tạo Gateway Server
  const port = Number(process.env.PORT) || 3001;
  const server = createApiGateway({
    config: { port },
    supabaseClient: supabase,
    ragPipeline: contextualPipeline,
    lifecycleManager,
    versionStore,
    searchEngine,
  });

  await server.start();
  const activePort = server.getPort();

  console.log('\n🚀 Central API Gateway đang hoạt động tại:');
  console.log(`   👉 Host:            http://localhost:${activePort}`);
  console.log(`   👉 Health Check:    http://localhost:${activePort}/api/v1/health`);
  console.log(`   👉 Chat REST:       POST http://localhost:${activePort}/api/v1/chat`);
  console.log(`   👉 Chat Streaming:  POST http://localhost:${activePort}/api/v1/chat/stream (SSE)`);
  console.log(`   👉 Contract Audit:  POST http://localhost:${activePort}/api/v1/contracts/audit`);
  console.log(`   👉 Search Law:      POST http://localhost:${activePort}/api/v1/search`);
  console.log('\nNhấn Ctrl+C để dừng server an toàn.\n');

  const shutdown = async () => {
    console.log('\n🛑 Đang dừng server an toàn...');
    await server.stop();
    console.log('👋 Đã dừng máy chủ thành công.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('❌ Lỗi khởi động API Gateway:', err);
  process.exit(1);
});
