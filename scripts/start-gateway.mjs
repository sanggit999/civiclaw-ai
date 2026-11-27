import 'dotenv/config';
import { getSupabaseClient } from '../dist/storage/supabase-client.js';
import { DEFAULT_SEARCH_CONFIG, LegalSearchEngine } from '../dist/search/engine.js';
import {
  GroundedRagPipeline,
  createRetrieverFromSearchEngine,
  createGapRecorderFromQueue,
} from '../dist/rag/pipeline.js';
import { GeminiLlmProvider } from '../dist/rag/gemini-llm-provider.js';
import { RegexCitationVerifier } from '../dist/rag/citation-verifier.js';
import { ContextualRagPipeline } from '../dist/session/pipeline.js';
import { CivicLawAgent } from '../dist/agent/civic-law-agent.js';
import { SupabaseSessionStore } from '../dist/session/supabase-session-store.js';
import { InMemorySessionStore } from '../dist/session/in-memory-session-store.js';
import { RuleAndLlmQueryCondenser } from '../dist/session/query-condenser.js';
import { SinglePassLlmInputRouter } from '../dist/session/input-router.js';
import { ContractLifecycleManager } from '../dist/contract/contract-lifecycle-manager.js';
import { SupabaseContractVersionStore } from '../dist/contract/supabase-version-store.js';
import { InMemoryContractVersionStore } from '../dist/contract/in-memory-version-store.js';
import { createApiGateway } from '../dist/api/gateway-factory.js';
import { loadSearchSettingsFromSupabase } from '../dist/search/config-loader.js';
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

  // 1. Nạp kho dữ liệu điều luật & cấu hình động system_configs từ Supabase
  console.log('📚 Đang nạp 4.715 chunks dữ liệu luật...');
  let chunks = [];
  try {
    chunks = await readAllProcessedChunks();
    console.log(`✅ Đã nạp thành công ${chunks.length} chunks từ data/processed/`);
  } catch (err) {
    console.warn('⚠️ Không tìm thấy file dữ liệu processed. Dùng mảng rỗng.');
  }

  const searchSettings = await loadSearchSettingsFromSupabase(supabase);
  if (searchSettings.loadedKeys.length > 0) {
    console.log(`⚙️  Đã nạp cấu hình động system_configs: ${searchSettings.loadedKeys.join(', ')}`);
  }

  const searchEngine = new LegalSearchEngine(
    chunks,
    undefined,
    searchSettings.config,
    searchSettings.stopWords
  );

  // 2. Thiết lập Session Store
  const sessionStore = supabase
    ? new SupabaseSessionStore(supabase)
    : new InMemorySessionStore();

  // 3. Thiết lập Version Store cho hợp đồng
  const versionStore = supabase
    ? new SupabaseContractVersionStore(supabase)
    : new InMemoryContractVersionStore();

  const lifecycleManager = new ContractLifecycleManager({ versionStore });

  // 4. Thiết lập RAG Pipeline & Contextual Pipeline & CivicLaw Legal Agent
  const retriever = createRetrieverFromSearchEngine(searchEngine);
  const gapRecorder = createGapRecorderFromQueue(searchEngine.getGapQueue());
  const llmProvider = new GeminiLlmProvider({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  });
  const citationVerifier = new RegexCitationVerifier();

  const ragPipeline = new GroundedRagPipeline(
    retriever,
    gapRecorder,
    llmProvider,
    citationVerifier
  );
  const condenser = new RuleAndLlmQueryCondenser(llmProvider);

  // Khởi tạo CivicLawAgent với đầy đủ dependencies (RAG pipeline, LLM, search engine)
  const civicLawAgent = new CivicLawAgent(
    {
      enableExploratoryLandscape: true,
      confidenceThreshold:
        searchSettings.config.defaultConfidenceThreshold ??
        DEFAULT_SEARCH_CONFIG.defaultConfidenceThreshold,
    },
    {
      ragPipeline,
      llmProvider,
      searchEngine,
    }
  );

  const inputRouter = new SinglePassLlmInputRouter(llmProvider);
  const contextualPipeline = new ContextualRagPipeline(
    sessionStore,
    condenser,
    ragPipeline,
    undefined,
    civicLawAgent,
    searchSettings.chatPersona,
    inputRouter
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
