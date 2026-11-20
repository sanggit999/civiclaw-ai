# BƯỚC 4: CHIA LÁT DỌC (VERTICAL SLICING) — CỔNG TRUY CẬP TRUNG TÂM (CENTRAL API GATEWAY)

---

## Lát 1: Bộ Điều Hướng (Router), CORS & Healthcheck API (Core Slice)
- [x] `t8.1.1` [TDD] Viết kiểm thử `specs/008-central-api-gateway/tests/router-health.test.ts`:
  - Kiểm tra router xử lý đúng method và path (GET, POST, OPTIONS).
  - Kiểm tra tự động thêm CORS headers (`Access-Control-Allow-Origin: *`, `Allow-Methods`, `Allow-Headers`).
  - Kiểm tra `GET /api/v1/health` trả về HTTP 200 kèm `status: "ok"`, `uptime` và `timestamp`.
  - Kiểm tra route không tồn tại trả về HTTP 404 với JSON error chuẩn.
- [x] `t8.1.2` Triển khai `src/api/types.ts`: Định nghĩa `GatewayConfig`, `RouteHandler`, `ApiRequest`, `ApiResponse`, error types.
- [x] `t8.1.3` Triển khai `src/api/router.ts`: Bộ điều hướng URL path và HTTP method tối giản, xử lý CORS preflight `OPTIONS`.
- [x] `t8.1.4` Triển khai `src/api/controllers/health-controller.ts`: Endpoint `/api/v1/health`.
- [x] `t8.1.5` Triển khai `src/api/gateway-server.ts`: Đóng gói `node:http.createServer()`, quản lý vòng đời `start()` và `stop()`.
- [x] **Lệnh kiểm tra Lát 1:** `npx vitest run specs/008-central-api-gateway/tests/router-health.test.ts`

---

## Lát 2: Hỏi Đáp Pháp Lý Streaming SSE & REST (Chat Slice)
- [x] `t8.2.1` [TDD] Viết kiểm thử `specs/008-central-api-gateway/tests/chat-controller.test.ts`:
  - Kiểm tra `POST /api/v1/chat` trả về JSON `ChatResponseDto` kèm trích dẫn nguồn luật.
  - Kiểm tra `POST /api/v1/chat/stream` trả về `Content-Type: text/event-stream` và phát tuần tự các event: `progress`, `citations`, `token`, `done`.
  - Kiểm tra validation: Gửi query rỗng trả về HTTP 400 Bad Request.
- [x] `t8.2.2` Triển khai `src/api/sse-writer.ts`: Helper chuẩn hóa format SSE (`event: ...\ndata: ...\n\n`), phương thức `sendEvent()`, `sendToken()`, `sendError()`, `close()`.
- [x] `t8.2.3` Triển khai `src/api/controllers/chat-controller.ts`: Kết nối với `IContextualRagPipeline`, hỗ trợ cả REST đồng bộ lẫn SSE streaming.
- [x] **Lệnh kiểm tra Lát 2:** `npx vitest run specs/008-central-api-gateway/tests/chat-controller.test.ts`

---

## Lát 3: Rà Soát & Quản Lý Vòng Đời Hợp Đồng (Contract Slice)
- [x] `t8.3.1` [TDD] Viết kiểm thử `specs/008-central-api-gateway/tests/contract-controller.test.ts`:
  - Kiểm tra `POST /api/v1/contracts/audit` tiếp nhận bản thảo hợp đồng, trả về HTTP 200 kèm báo cáo rà soát và hồ sơ version.
  - Kiểm tra tải lên trùng lặp nội dung (`DuplicateContentError`) được map chính xác thành HTTP 409 Conflict.
  - Kiểm tra `GET /api/v1/contracts/:documentId/versions` trả về danh sách lịch sử các phiên bản.
- [x] `t8.3.2` Triển khai `src/api/controllers/contract-controller.ts`: Tích hợp với `ContractLifecycleManager` và `IContractVersionStore`.
- [x] `t8.3.3` Đăng ký các routes hợp đồng vào `HttpRouter`.
- [x] **Lệnh kiểm tra Lát 3:** `npx vitest run specs/008-central-api-gateway/tests/contract-controller.test.ts`

---

## Lát 4: Tra Cứu Luật Nhanh & Kiểm Thử E2E BDD (Integration Slice)
- [x] `t8.4.1` Triển khai `src/api/controllers/search-controller.ts`: Endpoint `POST /api/v1/search` kết nối `LegalSearchEngine`.
- [x] `t8.4.2` Viết kiểm thử E2E tích hợp `specs/008-central-api-gateway/tests/e2e-gateway.test.ts`:
  - Khởi động server thật trên cổng ngẫu nhiên (`port: 0`), gọi qua HTTP client `fetch()`, sau đó tắt server an toàn (`server.stop()`).
- [x] `t8.4.3` Viết kiểm thử BDD Scenarios `specs/008-central-api-gateway/tests/mockup-bdd.test.ts` khớp với 4 kịch bản trong `spec.md`.
- [x] **Lệnh kiểm tra Lát 4:** `npx vitest run specs/008-central-api-gateway/tests/`

---

## Lát 5: Thẩm Định Độc Lập & Nghiệm Thu (Code Review Gate)
- [x] `t8.5.1` Chạy kiểm thử toàn bộ dự án (`npm test`): Đảm bảo 100% tests pass xanh (139/139 passed).
- [x] `t8.5.2` Kiểm tra build TypeScript (`npm run build`): Exit code 0, không có lỗi types.
- [x] `t8.5.3` Thực hiện Code Review độc lập theo chuẩn SDD (sử dụng subagent reviewer - Đạt kết quả PASS).
- [x] `t8.5.4` Cập nhật `README.md` lộ trình Phase 2, commit và push lên GitHub.
