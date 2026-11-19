# Bước 1: Product Review — 002: Legal Search, Fallback Guard & Knowledge Gap Queue

## 1. Vấn đề (Problem Statement)
* **Đối tượng gặp vấn đề:** Công dân tra cứu pháp luật (Mobile App) và Quản trị viên hệ thống (Web Admin).
* **Nỗi đau thực tế (Pain Point):**
  - Khi người dùng hỏi một tình huống không có trong 5 bộ luật hiện hành (hoặc chưa được số hóa), các trợ lý AI thông thường sẽ tự "suy diễn", bịa ra số hiệu văn bản và mức phạt không có thật (Hallucination).
  - Quản trị viên không nắm được người dân đang quan tâm những lĩnh vực/bộ luật nào còn thiếu để chủ động nạp thêm dữ liệu.
* **Hậu quả nếu không làm:** Nếu cho LLM tự sinh câu trả lời và tự lưu vào cơ sở dữ liệu, kho dữ liệu luật sẽ bị nhiễm độc (Data Poisoning), phá vỡ cam kết "100% trích dẫn nguồn luật chính thống có thể kiểm chứng".

## 2. Hành vi Mong muốn (Desired Behavior)
1. **Khi câu hỏi có trong luật:** Trả về chính xác điều luật trích dẫn (*Điểm, Khoản, Điều, Số hiệu văn bản*) và nội dung mức xử phạt/quy định.
2. **Khi câu hỏi ngoài phạm vi 5 bộ luật:** Hệ thống kích hoạt **Fallback Guard**, trả về thông báo trung thực (*"Hệ thống chưa tìm thấy căn cứ pháp lý trong 5 bộ luật hiện hành..."*), tuyệt đối không đoán mò.
3. **Thu thập khoảng trống:** Tự động ghi câu hỏi thiếu vào hàng đợi `unresolved_queries`, tự động gom nhóm câu hỏi trùng lặp để tăng lượt đếm `hitCount`.

---

## 3. Bản Dựng Giao Diện & Tương Tác (Mock-up)

### A. Mock-up Mobile App (Góc nhìn Người Dân)
```text
+-------------------------------------------------------------------+
| CIVICLAW AI - TRỢ LÝ PHÁP LÝ                                      |
+-------------------------------------------------------------------+
| User: Thuế thu nhập cá nhân trúng xổ số kiến thiết 2 tỷ là bao     |
|       nhiêu?                                                      |
|                                                                   |
| Assistant:                                                        |
| ℹ️ THÔNG BÁO MINH BẠCH                                            |
| Hệ thống CivicLaw AI hiện quản lý 5 bộ luật cốt lõi (Giao thông,  |
| Lao động, BHXH, Nhà ở).                                           |
|                                                                   |
| Câu hỏi về "Thuế thu nhập cá nhân" hiện chưa nằm trong phạm vi     |
| dữ liệu đã được đối soát chính thức. Để bảo đảm an toàn pháp lý, |
| trợ lý từ chối suy đoán số liệu.                                  |
|                                                                   |
| ✅ Câu hỏi của bạn đã được chuyển vào hàng đợi ghi nhận để Ban    |
| Quản trị cập nhật thêm Luật Thuế TNCN trong thời gian tới.        |
+-------------------------------------------------------------------+
```

### B. Mock-up Web Admin (Góc nhìn Quản Trị Viên)
```text
+-------------------------------------------------------------------+
| BẢNG QUẢN TRỊ - HÀNG ĐỢI KHOẢNG TRỐNG TRI THỨC (KNOWLEDGE GAPS)    |
+-------------------------------------------------------------------+
| Lượt hỏi | Lĩnh vực | Nội dung câu hỏi chưa có luật | Trạng thái  |
|----------|----------|-------------------------------|-------------|
| 142 lượt | OTHER    | Thuế thu nhập cá nhân trúng số| [Nạp Luật]  |
| 89 lượt  | OTHER    | Tranh chấp thừa kế đất đai    | [Nạp Luật]  |
| 12 lượt  | TRAFFIC  | Đăng kiểm xe bán tải quá hạn  | [Đã xử lý]  |
+-------------------------------------------------------------------+
```

---

## 4. Làm Rõ & Giả Định (Clarify - Đã làm rõ)
- [x] **Q1: Khi câu hỏi không có trong luật, có để LLM tự sinh câu trả lời để nạp vào DB không?**
  - *Trả lời:* Tuyệt đối KHÔNG. AI không có thẩm quyền lập pháp. Dữ liệu nạp vào DB bắt buộc phải từ nguồn văn bản luật chính thống do Admin phê duyệt.
- [x] **Q2: Ngưỡng tin cậy (Confidence Threshold) kích hoạt Fallback là bao nhiêu?**
  - *Trả lời:* Mặc định là `0.65` (thang 0.0 - 1.0). Nếu điểm tìm kiếm cao nhất < 0.65, kích hoạt Fallback Guard.
- [x] **Q3: Cơ chế chống trùng lặp trong Knowledge Gap Queue hoạt động thế nào?**
  - *Trả lời:* Sử dụng hệ số Jaccard từ vựng tiếng Việt. Nếu độ trùng >= 60%, tăng `hitCount += 1` thay vì tạo rác DB.

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
