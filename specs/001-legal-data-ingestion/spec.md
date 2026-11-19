# Bước 1: Product Review — 001: Legal Data Ingestion Pipeline

## 1. Vấn đề (Problem Statement)
* **Đối tượng gặp vấn đề:** Quản trị viên dữ liệu pháp lý (Legal Data Admin) và Hệ thống AI RAG.
* **Nỗi đau thực tế (Pain Point):**
  - Văn bản luật Việt Nam rất dài (hàng trăm trang), có cấu trúc phân cấp chặt chẽ (`Chương -> Điều -> Khoản -> Điểm`). Nếu dùng các kỹ thuật phân đoạn thông thường (cắt theo độ dài 500 ký tự - Fixed-size chunking), câu chữ sẽ bị đứt gãy giữa chừng.
  - Một Điểm luật vi phạm (ví dụ Điểm a: *"Chuyển làn không có tín hiệu"*) nếu bị tách rời độc lập mà mất đi tiêu đề của Điều (loại xe áp dụng) và lời dẫn của Khoản (khung tiền phạt) sẽ biến thành một câu cụt lủn vô nghĩa.
  - File PDF chính thức ký số từ cổng Chính phủ (`datafiles.chinhphu.vn`) là file scan ảnh (112 trang ảnh quét), lẫn nhiều số trang, tiêu ngữ Quốc hiệu và các thực thể HTML (`&#32;`).
* **Hậu quả nếu không làm:** AI tư vấn sai đối tượng (nhầm ô tô sang xe máy), sai khung tiền phạt, hoặc bị ảo giác do dữ liệu rác.

---

## 2. Hành vi Mong muốn (Desired Behavior)
1. **Làm sạch tự động:** Loại bỏ 100% Quốc hiệu, tiêu ngữ, số trang rác và giải mã sạch các thực thể HTML.
2. **Bảo toàn ngữ cảnh 3 tầng (Contextual Chunking):** Mỗi chunk Điểm luật nhỏ nhất khi sinh ra bắt buộc phải mang theo:
   `[Tiêu đề Điều - Đối tượng áp dụng] + [Khung tiền phạt của Khoản] + [Hành vi vi phạm của Điểm]`.
3. **Chuẩn hóa chuỗi trích dẫn (`fullReference`):** Sinh chuỗi chuẩn mực ngành luật:  
   `Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP`.
4. **Chiến lược 2 nguồn (Dual-Source):** Lưu trữ PDF gốc để làm căn cứ đối chứng mộc đỏ; sử dụng toàn văn chuẩn hóa để bóc tách 4.501 chunks chất lượng cao.

---

## 3. Bản Dựng Giao Diện & Tương Tác (Mock-up)

### Mock-up Web Admin: Màn hình Giám Sát & Nạp Dữ Liệu Luật
```text
+-----------------------------------------------------------------------------------------+
| CIVICLAW AI - QUẢN LÝ DỮ LIỆU PHÁP LUẬT (LEGAL DATA INGESTION)                          |
+-----------------------------------------------------------------------------------------+
| [Tải lên PDF/Text] -> Chọn file: 168_2024_ND-CP.txt | Lĩnh vực: [GIAO THÔNG ▼]         |
|                                                                                         |
| TIẾN TRÌNH XỬ LÝ:                                                                       |
| [✓] 1. Làm sạch tiêu ngữ & giải mã thực thể HTML ................ (Đã lọc 112 trang)    |
| [✓] 2. Bóc tách phân cấp Chương -> Điều -> Khoản -> Điểm ......... (1.051 Chunks)       |
| [✓] 3. Trích xuất từ khóa mức phạt & chủ thể ..................... (4.200 Từ khóa)     |
|                                                                                         |
| BẢN XEM TRƯỚC CHUNK ĐIỂN HÌNH (QUALITY ASSURANCE):                                      |
| +-------------------------------------------------------------------------------------+ |
| | ID: 168_2024_NĐ-CP_Điều_6_Khoản_2_Điểm_a                                            | |
| | Trích dẫn: Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP                           | |
| | Ngữ cảnh Điều: Điều 6. Xử phạt người điều khiển xe ô tô...                          | |
| | Mức phạt Khoản: 2. Phạt tiền từ 600.000 đồng đến 800.000 đồng...                    | |
| | Hành vi Điểm: a) Chuyển làn đường không đúng nơi cho phép hoặc không có tín hiệu... | |
| | Từ khóa bắt được: ["600.000 đồng", "800.000 đồng", "xe ô tô", "ô tô"]                | |
| +-------------------------------------------------------------------------------------+ |
| [Lưu vào Kho Dữ Liệu Processed]  [Tải Xuất Bản JSON]                                     |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Làm Rõ & Giả Định (Clarify - Cấm đoán mò)
- [x] **Q1: Nguồn dữ liệu đầu vào gồm những định dạng nào và lưu ở đâu?**
  - *Trả lời:* File PDF gốc đính kèm lưu tại `data/raw/*.pdf` làm chứng cứ pháp lý. Nguồn toàn văn bổ sung sạch (từ Cổng thông tin Chính phủ / Công Báo) lưu tại `data/raw/*.txt` làm nguồn bóc tách trực tiếp.
- [x] **Q2: Chiến lược phân đoạn (Chunking Strategy) là gì?**
  - *Trả lời:* Phân đoạn theo phân cấp pháp lý ngữ nghĩa nhỏ nhất: Điều đơn lẻ -> Khoản -> Điểm (có kèm ngữ cảnh tiêu đề Điều và mức phạt Khoản). Tuyệt đối không cắt theo số ký tự cố định.
- [x] **Q3: Cú pháp trích dẫn (`fullReference`) được chuẩn hóa ra sao?**
  - *Trả lời:* `[Điểm ...] [Khoản ...] [Điều ...] [Tên/Số hiệu văn bản]` (Ví dụ: `Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP`).
- [x] **Q4: Dữ liệu bóc tách được lưu vào đâu?**
  - *Trả lời:* Định dạng JSON có cấu trúc trong thư mục `data/processed/<id>.chunks.json`.

---

## 5. Tiêu chí Nghiệm thu (Acceptance Criteria / BDD)

### Kịch bản 1: Bóc tách thành công một Điều luật có phân cấp Khoản và Điểm (Happy Path)
* **Given:** Văn bản quy định mức phạt ô tô chuyển làn không xi nhan tại Điểm a Khoản 2 Điều 6.
* **When:** Chạy `parseLegalText(cleanedText, metadata)`.
* **Then:** 
  * Chunk tạo ra có `fullReference = "Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP"`.
  * `content` chứa đầy đủ 3 phần: Tiêu đề Điều 6, mức phạt Khoản 2 (600k - 800k), hành vi Điểm a.
  * `keywords` tự động bắt đúng: `["600.000 đồng", "800.000 đồng", "xe ô tô", "ô tô"]`.

### Kịch bản 2: Làm sạch thực thể HTML và dòng rác tiêu ngữ (Cleaner Resilience)
* **Given:** Văn bản thô dính tiêu ngữ Quốc hiệu, dòng số trang *"Trang 12/120"* và các ký tự thực thể như `&#32;2.` hoặc `&nbsp;`.
* **When:** Chạy qua `cleanLegalText(rawText)`.
* **Then:** Tiêu ngữ, số trang bị xóa hoàn toàn; thực thể `&#32;` được giải mã thành dấu cách, không làm trượt regex nhận diện Khoản.

### Kịch bản 3: Xử lý thành công toàn bộ 5 bộ luật thực tế (Full Real Data Integration)
* **Given:** 5 file văn bản toàn văn trong `data/raw/` (`168_2024_ND-CP`, `36_2024_QH15`, `45_2019_QH14`, `41_2024_QH15`, `27_2023_QH15`).
* **When:** Chạy quy trình bóc tách hàng loạt.
* **Then:** Sinh ra tổng cộng **4.501 chunks** không lỗi, lưu trữ đầy đủ tại `data/processed/`.
