# Bước 1: Product Review — Auto-IDF Search Scoring & Dynamic System Configs (`014-auto-idf-dynamic-config`)

## 1. Vấn đề (Problem Statement)
- **Đối tượng gặp vấn đề:** Kỹ sư vận hành, Quản trị viên Web Admin (`/configs`, `/laws`) và Công dân tra cứu pháp luật (`/chat`).
- **Nỗi đau thực tế (Pain Point):**
  1. `src/search/engine.ts` đang hardcode `DISPUTE_FILLER_WORDS` bằng danh sách từ **không dấu** để cắt nhiễu cho câu tranh chấp dài. Việc bỏ dấu khiến `'doi'` xóa nhầm `'đội'` (*đội mũ bảo hiểm*), `'xu'` xóa nhầm `'xử'` (*xử phạt*), `'tien'` xóa nhầm `'tiền'` (*phạt tiền*), làm tụt điểm điều luật đúng từ `0.85` xuống `0.69`.
  2. Bảng `system_configs` trên Supabase (chứa `stop_words`, `search_weights`, `confidence_threshold`, `min_query_length`) và giao diện `/configs` đã tồn tại, nhưng `scripts/start-gateway.mjs` chỉ khởi tạo `new LegalSearchEngine(chunks)` mà không nạp cấu hình động từ DB.
- **Hậu quả nếu không làm:**
  - Tiếp tục duy trì danh sách từ thừa kiểu "vá chuột" (whack-a-mole) dễ gãy ngữ nghĩa tiếng Việt có dấu và vi phạm quy chuẩn Anti-Hardcode.
  - Sửa cấu hình tìm kiếm trên Web Admin không có tác dụng thực tế lên Gateway đang chạy.

## 2. Hành vi mong muốn (Desired Behavior)
1. **Loại bỏ hoàn toàn `DISPUTE_FILLER_WORDS` hardcode**, thay bằng cơ chế **Auto-IDF (Inverse Document Frequency)** tính tự động từ tập `chunks` thực tế khi `LegalSearchEngine` khởi tạo hoặc nạp thêm chunks:
   - Từ phổ thông xuất hiện rộng rãi trong kho luật tự động nhận trọng số IDF thấp; từ chuyên ngành đặc thù (*mũ*, *đội*, *nồng*, *cồn*, *thử*, *đèn đỏ*) tự động nhận trọng số IDF cao.
   - Tuyệt đối không dùng bộ lọc mất dấu làm biến mất từ khóa pháp lý có dấu.
2. **Đồng bộ cấu hình động từ Supabase (`system_configs`) vào Gateway:**
   - Khi khởi động (`scripts/start-gateway.mjs`), Gateway nạp `stop_words`, `search_weights`, `confidence_threshold`, `min_query_length` từ Supabase `system_configs` truyền vào `LegalSearchEngine` và `CivicLawAgent` (fallback an toàn về `DEFAULT_SEARCH_CONFIG` / `DEFAULT_STOP_WORDS` khi offline).
   - Cung cấp endpoint `POST /api/v1/search/reload-config` trên Gateway để nạp lại cấu hình ngay lập tức mà không cần khởi động lại server; API `/api/configs` (`PUT`) trên Web Admin tự động kích hoạt reload (best-effort).

## 3. Bản dựng Luồng Xử lý (Mock-up)

```text
[Khởi động / Reload]
Supabase (system_configs) ---> loadSearchSettingsFromSupabase()
   ├── stop_words[]         ---> LegalSearchEngine.updateConfig(...)
   ├── search_weights       ---> LegalSearchEngine.config.weights
   ├── confidence_threshold ---> LegalSearchEngine & CivicLawAgent
   └── min_query_length     ---> LegalSearchEngine.config.minQueryLength

[Truy vấn tra cứu]
"Hôm qua tôi đi xe máy không đội mũ bảo hiểm..."
   ├── Lọc theo stop_words động (có dấu, từ DB) -> giữ nguyên "đội", "mũ", "xử", "tiền"
   ├── Chấm Unigram theo Auto-IDF (mũ: 8.07, đội: 6.41 > luật: 1.24, trường: 2.18)
   └── Bigram (admin mode): ưu tiên các cụm 2 từ thực sự tồn tại trong kho luật
   ===> Top 1: Điểm h Khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP (score ~0.69-0.85)
```

## 4. Làm rõ & Giả định (Clarify)
- [x] **Q1:** Có giữ `DEFAULT_STOP_WORDS` và `DEFAULT_SEARCH_CONFIG` trong `src/search/engine.ts` không?
  - *Trả lời:* Có, nhưng chỉ ở vai trò **Sensible Fallback Defaults** cho unit test offline hoặc khi Supabase tạm gián đoạn. Runtime thực tế ưu tiên cấu hình từ `system_configs`.
- [x] **Q2:** Với từ không xuất hiện trong kho luật (OOV, `df = 0`, ví dụ đại từ `'tôi'`) khi tính IDF thì xử lý thế nào?
  - *Trả lời:* Gán trọng số trung tính `1.0` thay vì $\ln(N+1)+1$ để từ trò chuyện ngoài văn bản luật không làm phình mẫu số và dìm điểm các từ khóa pháp lý thật.

## 5. Tiêu chí Nghiệm thu (Acceptance Criteria / BDD)

### Kịch bản 1: Auto-IDF thay thế `DISPUTE_FILLER_WORDS` không làm mất từ có dấu
* **Given:** `LegalSearchEngine` được khởi tạo với bộ chunks pháp luật (không còn hằng số `DISPUTE_FILLER_WORDS`).
* **When:** Tìm kiếm câu mô tả tranh chấp dài có chứa từ dễ đụng độ mất dấu như `"đội"`, `"xử phạt"`, `"tiền"` (ví dụ: `"Hôm qua tôi đi xe máy không đội mũ bảo hiểm bị xử phạt bao nhiêu tiền"`).
* **Then:** Hệ thống không xóa `'đội'`, `'xử'`, `'tiền'`; xếp hạng Top 1 đúng điều khoản quy định hành vi không đội mũ bảo hiểm và bảo đảm từ hiếm (`mũ`, `đội`) có đóng góp điểm lớn hơn từ phổ thông (`luật`, `người`).

### Kịch bản 2: Fallback an toàn khi thiếu/lỗi kết nối Supabase `system_configs`
* **Given:** Supabase client trả lỗi mạng hoặc bảng `system_configs` thiếu key / chứa dữ liệu sai kiểu.
* **When:** Gọi `loadSearchSettingsFromSupabase(supabase)` hoặc `POST /api/v1/search/reload-config`.
* **Then:** Hệ thống không throw unhandled error; tự động dùng fallback an toàn và giữ nguyên trạng thái hoạt động của Gateway.

### Kịch bản 3: Cấu hình động từ `system_configs` thay đổi hành vi tìm kiếm thực tế (Anti-Hardcode)
* **Given:** `system_configs` trả về bộ `stop_words`, `search_weights`, `confidence_threshold`, `min_query_length` tùy biến.
* **When:** Gọi `LegalSearchEngine.updateConfig(...)` hoặc reload qua Gateway endpoint `POST /api/v1/search/reload-config`.
* **Then:** Engine áp dụng ngay các thông số mới cho lượt `search()` kế tiếp mà không cần khởi tạo lại instance hay giữ lại danh sách chunks.
