# Bước 1: Product Review — 013: Unified Legal Search, Canonical Domain & Admin Laws Browser

## 1. Vấn đề (Problem Statement)
Qua rà soát thực tế quy trình tra cứu kho dữ liệu luật (`/laws`) từ giao diện Next.js tới Gateway và dữ liệu JSON/Supabase, hệ thống đang gặp 5 lỗi gốc:
1. **Nhiễm chữ thường `'traffic'` từ Test vào Data Production:** File test `specs/001-legal-data-ingestion/tests/real-data.test.ts` hardcode `domain: 'traffic'` và ghi đè trực tiếp lên `data/processed/168_2024_ND-CP.chunks.json` mỗi khi chạy `npm test`.
2. **Phân mảnh chuẩn Domain (3 nơi 3 kiểu):** DB Supabase dùng `TRAFFIC | LABOR | SOCIAL_INSURANCE | HOUSING`, Agent dùng `INSURANCE | CIVIL`, còn Web Admin `/laws` gửi chuỗi tiếng Việt `'Giao thông'`, `'Lao động'`, `'Bảo hiểm xã hội'`, `'Nhà ở'`, `'Dân sự'`. Khi lọc theo lĩnh vực trên `/laws`, `LegalSearchEngine` so khớp trực tiếp chuỗi tiếng Việt với mã tiếng Anh nên luôn trả về `0` kết quả và ghi oan vào `KnowledgeGapQueue`.
3. **Sai tên trường Mapping (`searchLaws`):** API trả về camelCase (`docNumber`, `article`, `clause`, `point`, `fullReference`), trong khi `admin/lib/api-client.ts` đọc `document_number`, `article_number`, `clause_number` (không tồn tại), khiến mọi dòng trên UI rơi về fallback `'Văn bản Luật'` / `'100/2019/NĐ-CP'` và `'Toàn văn'`.
4. **Khó dùng với 2 tình huống chính:**
   - Không duyệt được kho luật khi xóa trống ô tìm kiếm (Browse Mode bị Gateway chặn HTTP 400 rồi UI tự trả mock giả `100/2019/NĐ-CP`).
   - Nhập **"nội dung tranh chấp pháp lý"** dài (15–30 từ) bị chia điểm cho tổng độ dài câu kể, tụt dưới ngưỡng `0.65` và bị xóa sạch kết quả.
5. **UX `/laws` trùng lặp & lỗi thời:** Có 2 bộ lọc `domain` trùng nhau (`TabList` + `Selector`), còn nhãn cũ `"Nghị định 100/123 Giao thông"` và tab `"Bộ luật Dân sự 2015"` (0 chunks), lại double-fetch API khi chuyển tab.

---

## 2. Hành vi Mong muốn & Tiêu chí Nghiệm thu (BDD Criteria)

### Kịch bản 1: Sửa tận gốc `'traffic'` & Bảo vệ dữ liệu Production
- **Given:** Bộ dữ liệu `data/processed/*.chunks.json` và bộ test `real-data.test.ts`.
- **When:** Chạy `npm test` và `npm run ingest`.
- **Then:** `real-data.test.ts` dùng `domain: 'TRAFFIC'`, chỉ ghi file kiểm thử ra thư mục tạm (`os.tmpdir()`) và tự dọn dẹp, tuyệt đối không ghi đè `data/processed/`. Toàn bộ 1.051 chunks của `168/2024/NĐ-CP` mang `domain: 'TRAFFIC'`.

### Kịch bản 2: Chuẩn hóa Canonical Domain thống nhất 1 nguồn sự thật
- **Given:** Kho dữ liệu 4.715 chunks thuộc 4 lĩnh vực có dữ liệu (`TRAFFIC`, `LABOR`, `SOCIAL_INSURANCE`, `HOUSING`).
- **When:** Client hoặc Admin gọi `LegalSearchEngine.search()` / `POST /api/v1/search` với `'TRAFFIC'`, `'traffic'`, `'Giao thông'`, `'INSURANCE'`, `'Bảo hiểm xã hội'`, `'Lao động'`, `'Nhà ở'`.
- **Then:** Hàm `normalizeDomain()` dùng chung tự động quy đổi về đúng mã chuẩn, trả về chính xác điều khoản của lĩnh vực đó mà không bị `0` kết quả oan.

### Kịch bản 3: Browse Mode (Không cần từ khóa) & Lọc Số hiệu Văn bản + Phân trang
- **Given:** Admin truy cập `/laws` hoặc gọi `POST /api/v1/search` với `{ query: "", domain: "TRAFFIC", docNumber: "168/2024/NĐ-CP", mode: "admin", page: 1, limit: 20 }`.
- **When:** Thực thi truy vấn duyệt kho.
- **Then:** Trả về 20 chunks đầu tiên của Nghị định 168/2024/NĐ-CP kèm `totalMatches = 1051`, `isFound = true`, không yêu cầu từ khóa và không ghi vào `KnowledgeGapQueue`.

### Kịch bản 4: Tra cứu "Nội dung tranh chấp pháp lý" dạng câu kể dài
- **Given:** Người dùng nhập mô tả tình huống thực tế dài 15–30 từ (VD: *"Tôi đi xe máy không đội mũ bảo hiểm trên đường phố thì bị cảnh sát giao thông xử phạt bao nhiêu tiền?"* hoặc *"Công ty ký hợp đồng thử việc 90 ngày với nhân viên kỹ thuật có đúng quy định không?"*) với `mode: "admin"`.
- **When:** Hệ thống lọc bổ sung từ nối/đại từ đời thường và chuẩn hóa độ dài câu khi chấm điểm.
- **Then:** Trả về các điều khoản tương ứng (`168/2024/NĐ-CP` về mũ bảo hiểm hoặc `45/2019/QH14` về thử việc) xếp hạng từ cao xuống thấp kèm `totalMatches` thật, không bị triệt tiêu thành `0` kết quả.

### Kịch bản 5: Endpoint động `GET /api/v1/domains` & Giao diện `/laws` chuẩn xác
- **Given:** Gateway khởi động với 4.715 chunks từ 5 văn bản.
- **When:** UI `/laws` tải trang.
- **Then:**
  - Gọi `GET /api/gateway/domains` để dựng **1 thanh Tab Lĩnh vực duy nhất** kèm số lượng chunk thật, đồng bộ với **Selector lọc Văn bản cụ thể** (`168/2024/NĐ-CP`, `36/2024/QH15`, ...).
  - Bảng hiển thị đúng `docNumber`, `article`/`clause`/`point`, `fullReference`, không còn nhãn giả `100/2019/NĐ-CP` hay `'Toàn văn'` tràn lan.
  - Có phân trang `Trước / Sau`, nút `Xóa bộ lọc`, không double-fetch và không nuốt lỗi HTTP thành mock giả.

### Kịch bản 6: Bảo toàn Fallback Guard của Công dân (Spec 002 Regression Safe)
- **Given:** Luồng mặc định (`mode: 'citizen'` hoặc không truyền `mode`) của `LegalSearchEngine`.
- **When:** Gửi câu hỏi ngoài phạm vi (*"thuế thu nhập cá nhân trúng số"*).
- **Then:** Vẫn kích hoạt Fallback Guard (`topScore < 0.65`, `isFound = false`, ghi vào `KnowledgeGapQueue`).
