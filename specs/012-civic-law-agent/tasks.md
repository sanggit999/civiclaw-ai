# Danh Sách Công Việc: CivicLaw Legal Agent

- [x] **Lát 1 (Core Foundations & Types):** Xây dựng `src/agent/types.ts` với đầy đủ `AgentTool`, `AgentDecision`, `DomainLandscapeInfo`, `CivicLawAgentOptions`, `CivicLawAgentResponse`.
- [x] **Lát 2 (Domain Landscape Engine):** Xây dựng `src/agent/domain-landscape.ts` chứa siêu dữ liệu và tổng hợp phong phú 5 bộ luật chính thống (TRAFFIC, LABOR, INSURANCE, HOUSING, CIVIL), bộ nhận diện câu hỏi broad `detectExploratoryDomain`, và bộ phát hiện ngoài phạm vi `isOutOfScopeDomain`.
- [x] **Lát 3 (Bounded ReAct Legal Agent):** Xây dựng `src/agent/civic-law-agent.ts` với class `CivicLawAgent`, cơ chế suy luận có chặn ReAct, đăng ký các tool `domain_landscape`, `search_legal_code`, `honest_fallback`, hỗ trợ Dependency Injection linh hoạt.
- [x] **Lát 4 (Unit Testing & Verification):** Viết bộ kiểm thử toàn diện `specs/012-civic-law-agent/tests/civic-law-agent.test.ts` (14/14 tests pass), xác nhận `npm run build` và `npm test` 100% GREEN (36 files, 203 tests).
- [x] **Lát 5 (Pipeline & Gateway Integration):** Tích hợp `CivicLawAgent` vào `ContextualRagPipeline` (`src/session/pipeline.ts`), cấu hình `scripts/start-gateway.mjs`, nâng cấp REST và SSE Streaming trong `src/api/controllers/chat-controller.ts`, kiểm thử toàn diện `specs/012-civic-law-agent/tests/agent-integration.test.ts` (7/7 tests pass).
