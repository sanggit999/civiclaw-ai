# Bước 1: Product Review — 002: Legal Search, Fallback Guard & Knowledge Gap Queue

## 1. Vấn đề (Problem Statement)
* **Đối tượng gặp vấn đề:** Công dân tra cứu pháp luật (Mobile App) và Quản trị viên hệ thống (Web Admin).
* **Nỗi đau thực tế (Pain Point):**
  - Khi người dùng hỏi một tình huống không có trong 5 bộ luật hiện hành (hoặc chưa được số hóa), các trợ lý AI thông thường sẽ tự "suy diễn", bịa ra số hiệu văn bản và mức phạt không có thật (Hallucination).
  - Quản trị viên không nắm được người dân đang quan tâm những lĩnh vực/bộ luật nào còn thiếu để chủ động nạp thêm dữ liệu.
  - Trên điện thoại di động, người dân thường gõ tiếng Việt **không dấu** (`"chuyen lan o to khong xi nhan"`). Nếu hệ thống chỉ khớp từ khóa cứng có dấu thì sẽ trượt và báo không tìm thấy kết quả.
  - Người dùng nhập chuỗi rác (`"   "`, `"???"`) nếu không chặn ở ranh giới sẽ làm ô nhiễm hàng đợi quản trị.
* **Hậu quả nếu không làm:** Nếu cho LLM tự sinh câu trả lời và tự lưu vào cơ sở dữ liệu, kho dữ liệu luật sẽ bị nhiễm độc (Data Poisoning), phá vỡ cam kết "100% trích dẫn nguồn luật chính thống có thể kiểm chứng".

---

## 2. Hành vi Mong muốn (Desired Behavior)
1. **Khi câu hỏi có trong luật:** Trả về chính xác điều luật trích dẫn (*Điểm, Khoản, Điều, Số hiệu văn bản*) và nội dung mức xử phạt/quy định.
2. **Hỗ trợ gõ tiếng Việt không dấu:** Tự động chuẩn hóa dấu thanh để người dân gõ nhanh trên điện thoại vẫn tìm ra đúng điều luật.
3. **Ưu tiên khi hỏi đích danh Điều luật (Citation Booster):** Khi người dùng hỏi *"Điều 25 Bộ luật Lao động"* hoặc *"Điều 6 Nghị định 168"*, hệ thống nhận diện số Điều và đẩy ngay chunk đó lên vị trí đầu bảng.
4. **Khi câu hỏi ngoài phạm vi 5 bộ luật:** Hệ thống kích hoạt **Fallback Guard**, trả về thông báo trung thực (*"Hệ thống chưa tìm thấy căn cứ pháp lý trong 5 bộ luật hiện hành..."*), tuyệt đối không đoán mò.
5. **Thu thập khoảng trống có chọn lọc:** Tự động ghi câu hỏi thiếu vào hàng đợi `unresolved_queries`, tự động gom nhóm câu hỏi trùng lặp để tăng lượt đếm `hitCount`, chặn ghi nhận chuỗi rác.
6. **Công cụ quản trị Web Admin:** Cho phép Admin duyệt câu hỏi đã nạp luật (`resolveGap`), bỏ qua spam (`ignoreGap`) và xem báo cáo thống kê (`getStats`).

---

## 3. Bản Dựng Giao Diện & Tương Tác (Mock-up)

### A. Mock-up Mobile App (Góc nhìn Người Dân)
```text
+-------------------------------------------------------------------+
| CIVICLAW AI - TRỢ LÝ PHÁP LÝ                                      |
+-------------------------------------------------------------------+
| User: chuyen lan duong xe o to khong tin hieu phat bao nhieu      |
|                                                                   |
| Assistant:                                                        |
| 📜 CĂN CỨ PHÁP LÝ: Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP  |
|                                                                   |
| MỨC XỬ PHẠT:                                                      |
| Phạt tiền từ 600.000 đồng đến 800.000 đồng đối với người điều    |
| khiển xe ô tô chuyển làn đường không đúng nơi cho phép hoặc       |
| không có tín hiệu báo trước.                                      |
|                                                                   |
| [Xem toàn văn Điều 6 PDF]  [Trừ điểm GPLX liên quan]               |
+-------------------------------------------------------------------+
```

### B. Mock-up Web Admin (Góc nhìn Quản Trị Viên)
```text
+-----------------------------------------------------------------------------------------+
| BẢNG QUẢN TRỊ - HÀNG ĐỢI KHOẢNG TRỐNG TRI THỨC (KNOWLEDGE GAPS)                          |
| Tổng số: 120 | Đang chờ: 85 | Đã giải quyết: 25 | Bỏ qua: 10                            |
+-----------------------------------------------------------------------------------------+
| Lượt hỏi | Lĩnh vực | Nội dung câu hỏi chưa có luật | Hành động                          |
|----------|----------|-------------------------------|------------------------------------|
| 142 lượt | OTHER    | Thuế thu nhập cá nhân trúng số| [Đã Nạp Luật] [Bỏ qua]             |
| 89 lượt  | OTHER    | Tranh chấp thừa kế đất đai    | [Đã Nạp Luật] [Bỏ qua]             |
| 12 lượt  | TRAFFIC  | Đăng kiểm xe bán tải quá hạn  | [Đã Giải Quyết: Đã thêm TT 02]     |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Làm Rõ & Giả Định (Clarify - Đã làm rõ)
- [x] **Q1: Khi câu hỏi không có trong luật, có để LLM tự sinh câu trả lời để nạp vào DB không?**
  - *Trả lời:* Tuyệt đối KHÔNG. AI không có thẩm quyền lập pháp. Dữ liệu nạp vào DB bắt buộc phải từ nguồn văn bản luật chính thống do Admin phê duyệt.
- [x] **Q2: Ngưỡng tin cậy (Confidence Threshold) kích hoạt Fallback là bao nhiêu?**
  - *Trả lời:* Mặc định là `0.65` (thang 0.0 - 1.0). Nếu điểm tìm kiếm cao nhất < 0.65, kích hoạt Fallback Guard.
- [x] **Q3: Cơ chế chống trùng lặp trong Knowledge Gap Queue hoạt động thế nào?**
  - *Trả lời:* Sử dụng hệ số Jaccard từ vựng tiếng Việt. Nếu độ trùng >= 60%, tăng `hitCount += 1` thay vì tạo rác DB.
- [x] **Q4: Xử lý thế nào với câu hỏi rỗng hoặc toàn dấu câu?**
  - *Trả lời:* Chặn ngay tại Input Validation Guard, không ghi nhận vào Knowledge Gap Queue.

---

## 5. Tiêu chí Nghiệm thu (Acceptance Criteria / BDD)

### Kịch bản 1: Tìm kiếm chính xác có trích dẫn điều luật (Search Success)
* **Given:** Kho dữ liệu có 1.051 chunks của Nghị định 168/2024/NĐ-CP.
* **When:** Người dùng hỏi *"Lỗi chuyển làn đường không có tín hiệu phạt bao nhiêu tiền?"*.
* **Then:** Hệ thống trả về chunk có `fullReference = "Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP"`, điểm tin cậy >= 0.65, không ghi vào hàng đợi thiếu.

### Kịch bản 2: Kích hoạt Fallback Guard khi hỏi ngoài phạm vi (Honest Fallback)
* **Given:** Hệ thống chỉ có 5 bộ luật (Giao thông, Lao động, BHXH, Nhà ở).
* **When:** Người dùng hỏi câu hỏi ngoài phạm vi: *"Quy định về thuế thu nhập cá nhân khi trúng số độc đắc 2 tỷ đồng"*.
* **Then:** Điểm tin cậy < 0.65, trả về thông điệp từ chối trung thực, ghi 1 bản ghi vào `unresolved_queries` với trạng thái `'unreviewed'`.

### Kịch bản 3: Tăng lượt đếm (Hit Count) khi nhiều người cùng hỏi câu hỏi thiếu
* **Given:** Bảng `unresolved_queries` đã có bản ghi về *"thuế thu nhập cá nhân"*.
* **When:** Người dùng khác hỏi tiếp *"cách tính thuế thu nhập cá nhân trúng số vietlott"*.
* **Then:** Không tạo bản ghi mới, tăng `hitCount` lên 2.

### Kịch bản 4: Hỗ trợ tiếng Việt không dấu (Accent Insensitive)
* **Given:** Người dùng gõ không dấu trên điện thoại *"loi chuyen lan duong xe o to khong co tin hieu"*.
* **When:** Chạy tìm kiếm `engine.search()`.
* **Then:** Hệ thống khớp thành công với chunk có dấu `Điểm a Khoản 2 Điều 6`, điểm tin cậy >= 0.65.

### Kịch bản 5: Ưu tiên tìm đích danh Điều luật (Citation Booster)
* **Given:** Người dùng hỏi cụ thể *"quy định tại Điều 25 Bộ luật Lao động 2019"*.
* **When:** Chạy tìm kiếm `engine.search()`.
* **Then:** Chunk `Điều 25` được cộng điểm thưởng Citation Bonus và đứng đầu danh sách kết quả.

### Kịch bản 6: Chặn câu hỏi rỗng / vô nghĩa (Input Validation Guard)
* **Given:** Người dùng gửi câu hỏi rỗng `"   "` hoặc chỉ có dấu câu `"???"`.
* **When:** Chạy tìm kiếm `engine.search()`.
* **Then:** `isFound = false`, `loggedToKnowledgeGap = false`, hàng đợi quản trị không bị ghi rác.

### Kịch bản 7: Quản trị hàng đợi Web Admin (Resolve, Ignore, Stats)
* **Given:** Hàng đợi có câu hỏi thiếu về đất đai và một câu hỏi spam.
* **When:** Admin gọi `resolveGap()` và `ignoreGap()`.
* **Then:** Trạng thái cập nhật chính xác (`resolved`, `ignored`), hàm `getStats()` phản ánh đúng số lượng.

### Kịch bản 8: Không Hardcode — Tùy biến cấu hình trọng số & ngưỡng tin cậy
* **Given:** Một engine được khởi tạo với cấu hình tùy biến (`defaultConfidenceThreshold = 0.95`, `minQueryLength = 5`).
* **When:** Tìm kiếm một câu hỏi có điểm số 0.88.
* **Then:** Hệ thống tuân thủ cấu hình tùy biến, kích hoạt Fallback Guard vì chưa đạt ngưỡng 0.95, chứng minh hệ thống không bị hardcode cứng.
