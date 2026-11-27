# Bước 4: Chia Lát Dọc (Vertical Slicing) — 013: Unified Legal Search

- [x] **Lát 1 (Root Data & Canonical Domain):** Sửa `real-data.test.ts` (dùng `'TRAFFIC'` + `os.tmpdir()`), chạy `npm run ingest` làm sạch `data/processed/168_2024_ND-CP.chunks.json`, thống nhất `normalizeDomain()` trong `src/storage/types.ts` và tái sử dụng cho `LegalSearchEngine`.
  - *Lệnh kiểm tra:* `npx vitest run specs/001-legal-data-ingestion/tests/real-data.test.ts`
- [x] **Lát 2 (Engine Modes & Gateway API):** Nâng cấp `LegalSearchEngine` (Browse Mode, `docNumber` filter, Long Dispute Narrative scoring, `getDomainSummary`, phân trang `page`/`limit`, giữ nguyên Guard `citizen`), cập nhật `SearchController` + thêm `GET /api/v1/domains` trong `gateway-factory.ts`, viết kiểm thử TDD tại `specs/013-unified-legal-search/tests/unified-search.test.ts`.
  - *Lệnh kiểm tra:* `npx vitest run specs/013-unified-legal-search/tests/unified-search.test.ts specs/002-hybrid-search-fallback/tests/search-fallback.test.ts`
- [x] **Lát 3 (Admin API Client & `/laws` UI Redesign):** Sửa `searchLaws()` mapper & bổ sung `fetchLegalDomains()` trong `admin/lib/api-client.ts`, tái thiết kế `admin/app/laws/page.tsx` (Browse mặc định, Tab động 1 nguồn, Selector lọc theo Văn bản, phân trang, highlight từ khóa, xóa bộ lọc, bỏ double-fetch), dọn `100/2019/NĐ-CP` thừa trên dashboard/chat welcome.
  - *Lệnh kiểm tra:* `npx --prefix admin tsc --noEmit && npm test`
- [x] **Lát 4 (Integration, Build, Restart & Independent Review):** `npm run build`, restart Gateway + Next.js, kiểm thử trực tiếp `/api/v1/domains`, `/api/v1/search`, Playwright trang `/laws`, và chạy `/code-review` độc lập trước khi hoàn tất spec.
