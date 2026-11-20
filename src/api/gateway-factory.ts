import { ApiGatewayServer } from './gateway-server.js';
import { HttpRouter } from './router.js';
import { HealthController } from './controllers/health-controller.js';
import { ChatController } from './controllers/chat-controller.js';
import { ContractController } from './controllers/contract-controller.js';
import { SearchController } from './controllers/search-controller.js';
import { IContextualRagPipeline } from '../session/pipeline.js';
import { ContractLifecycleManager } from '../contract/contract-lifecycle-manager.js';
import { IContractVersionStore } from '../contract/version-types.js';
import { LegalSearchEngine } from '../search/engine.js';
import { GatewayConfig } from './types.js';

export interface GatewayDependencies {
  config?: Partial<GatewayConfig>;
  ragPipeline?: IContextualRagPipeline;
  lifecycleManager?: ContractLifecycleManager;
  versionStore?: IContractVersionStore;
  searchEngine?: LegalSearchEngine;
}

/**
 * Khởi tạo và thiết lập máy chủ Central API Gateway hoàn chỉnh với đầy đủ các routes
 */
export function createApiGateway(deps?: GatewayDependencies): ApiGatewayServer {
  const router = new HttpRouter(deps?.config);

  // 1. Health Controller
  const healthController = new HealthController();
  router.register('GET', '/api/v1/health', (req, res) => healthController.handleHealth(req, res));

  // 2. Chat Controller (nếu có pipeline)
  if (deps?.ragPipeline) {
    const chatController = new ChatController(deps.ragPipeline);
    router.register('POST', '/api/v1/chat', (req, res) => chatController.handleChat(req, res));
    router.register('POST', '/api/v1/chat/stream', (req, res) => chatController.handleChatStream(req, res));
  }

  // 3. Contract Controller (nếu có lifecycle manager)
  if (deps?.lifecycleManager) {
    const contractController = new ContractController(deps.lifecycleManager, deps.versionStore);
    router.register('POST', '/api/v1/contracts/audit', (req, res) => contractController.handleAudit(req, res));
    router.register('GET', '/api/v1/contracts/versions', (req, res) => contractController.handleListVersions(req, res));
  }

  // 4. Search Controller (nếu có search engine)
  if (deps?.searchEngine) {
    const searchController = new SearchController(deps.searchEngine);
    router.register('POST', '/api/v1/search', (req, res) => searchController.handleSearch(req, res));
  }

  return new ApiGatewayServer(deps?.config, router);
}
