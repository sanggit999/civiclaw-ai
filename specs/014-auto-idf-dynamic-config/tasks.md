# Bước 4: Chia Lát Dọc (Vertical Slicing Tasks) — Auto-IDF & Dynamic System Configs (`014`)

---

### Lát cắt 1: Auto-IDF thay thế `DISPUTE_FILLER_WORDS` trong `LegalSearchEngine`
*Mục tiêu: Xóa bỏ hoàn toàn `DISPUTE_FILLER_WORDS`, tính Auto-IDF tự động trên tập chunks và giữ nguyên độ chính xác cho câu ngắn, trích dẫn điều luật và mô tả tranh chấp dài.*
- [x] `t1.1: Viết Unit Test TDD kiểm chứng Auto-IDF (trọng số từ hiếm > từ phổ thông, không xóa nhầm 'đội'/'xử'/'tiền', câu tranh chấp dài lên đúng Top 1)`
- [x] `t1.2: Xóa DISPUTE_FILLER_WORDS, triển khai rebuildIdfIndex() + Auto-IDF unigram/bigram trong src/search/engine.ts`
*👉 Lệnh kiểm tra Lát 1:* `npm test -- specs/014-auto-idf-dynamic-config/tests/auto-idf-config.test.ts`

---

### Lát cắt 2: Nạp & Reload Cấu hình Động `system_configs` từ Supabase
*Mục tiêu: Đọc `stop_words`, `search_weights`, `confidence_threshold`, `min_query_length` từ Supabase vào Gateway khi khởi động và hỗ trợ hot-reload qua API.*
- [x] `t2.1: Viết Unit Test TDD cho loadSearchSettingsFromSupabase (happy path + fallback khi DB lỗi/sai kiểu), updateConfig() và POST /api/v1/search/reload-config`
- [x] `t2.2: Tạo src/search/config-loader.ts, thêm updateConfig() trong engine.ts, thêm handleReloadConfig trong search-controller.ts & gateway-factory.ts`
- [x] `t2.3: Kết nối nạp system_configs trong scripts/start-gateway.mjs và hook reload best-effort trong admin/app/api/configs/route.ts`
*👉 Lệnh kiểm tra Lát 2:* `npm test -- specs/014-auto-idf-dynamic-config/tests/auto-idf-config.test.ts`

---

### Lát cắt 3: Kiểm chứng Toàn bộ & Dữ liệu Thực 4.715 Chunks
*Mục tiêu: Đảm bảo không làm gãy bất kỳ spec cũ nào (đặc biệt Spec 002, 009, 013), build sạch TypeScript backend + Admin và kiểm chứng thực tế trên 4.715 chunks.*
- [x] `t3.1: Chạy npm run build, npx --prefix admin tsc --noEmit, và full npm test`
- [x] `t3.2: Chạy kịch bản xác minh thực nghiệm trên 4.715 chunks và kiểm tra endpoint reload-config trên Gateway`
- [x] `t3.3: Kích hoạt Code Review Gate (/code-review)`
*👉 Lệnh kiểm tra Lát 3:* `npm run build && npm test && npx --prefix admin tsc --noEmit`

---

## 🛡️ Chốt chặn Thẩm định (Code Review Gate)
- [x] Không còn `DISPUTE_FILLER_WORDS` trong `src/`.
- [x] Không hardcode secrets, credentials, hoặc dữ liệu nghiệp vụ cứng không có fallback/config.
- [x] Reviewer xác nhận: **PASS**.
