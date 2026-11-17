# Đặc tả Tính năng: Nạp & Phân Đoạn Dữ Liệu 5 Bộ Luật Nền Tảng (Legal Data Ingestion)

## 1. Cái gì
Xây dựng pipeline tiếp nhận, làm sạch, phân đoạn (Chunking) và gắn nhãn metadata cho 5 bộ văn bản quy phạm pháp luật Việt Nam nền tảng:
1. **Nghị định 168/2024/NĐ-CP** (Xử phạt giao thông đường bộ & trừ điểm GPLX)
2. **Luật Trật tự, an toàn giao thông đường bộ 2024** (`36/2024/QH15`)
3. **Bộ luật Lao động 2019** (`45/2019/QH14`)
4. **Luật Bảo hiểm xã hội 2024** (`41/2024/QH15`)
5. **Luật Nhà ở 2023** (`27/2023/QH15`)

Dữ liệu đầu vào kết hợp cả **bản PDF gốc lưu trữ** và **bản HTML/Text toàn văn sạch từ Cổng thông tin Chính phủ**.

## 2. Vì sao
* Dữ liệu luật là "nguồn chân lý" (Ground Truth) cho toàn bộ hệ thống RAG và AI Agent. Nếu bóc tách sai một câu, một từ hoặc bị lẫn số trang rác, AI sẽ tư vấn sai cho công dân.
* Văn bản luật Việt Nam có cấu trúc ngữ nghĩa chặt chẽ (`Chương -> Điều -> Khoản -> Điểm`). Kỹ thuật phân đoạn theo phân cấp pháp lý (**Hierarchical Legal Chunking**) bảo đảm bảo toàn trọn vẹn ngữ cảnh của từng chế tài và mức phạt.

## 3. Clarify & Giả định (Không đoán mò)

> [!IMPORTANT]
> Các câu hỏi làm rõ cốt lõi trước khi thiết kế giải pháp:

- [x] **Q1: Nguồn dữ liệu đầu vào gồm những định dạng nào và lưu ở đâu?**
  - *Trả lời:* 
    * File PDF gốc đính kèm được tải về và lưu tại `data/raw/` làm tài liệu đối chiếu pháp lý chính thức.
    * Nguồn bổ sung (Bản HTML/Text toàn văn sạch từ Cổng thông tin Chính phủ `vanban.chinhphu.vn`) được sử dụng làm nguồn chính để bóc tách text, nhằm tránh lỗi vỡ font, xô lệch bảng biểu và lẫn số trang của file PDF scan.
- [x] **Q2: Chiến lược phân đoạn (Chunking Strategy) là gì?**
  - *Trả lời:* Tuyệt đối không dùng Fixed-size chunking (cắt theo 500 hay 1000 ký tự). Bắt buộc phân đoạn theo đơn vị ngữ nghĩa pháp lý nhỏ nhất có thể trích dẫn được:
    * Nếu Điều luật chia thành nhiều Khoản: Mỗi Khoản là một đơn vị chunk.
    * Nếu Khoản chia thành nhiều Điểm quy định mức phạt cụ thể: Mỗi Điểm là một đơn vị chunk (kèm theo câu mở đầu của Khoản để giữ ngữ cảnh).
- [x] **Q3: Chuỗi trích dẫn (`full_reference`) phải có cấu trúc như thế nào?**
  - *Trả lời:* Chuẩn hóa theo cú pháp chuẩn của ngành luật:  
    `[Điểm ...] [Khoản ...] [Điều ...] [Số hiệu văn bản]`  
    *(Ví dụ: "Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP")*.
- [x] **Q4: Dữ liệu bóc tách được lưu vào đâu ở module này?**
  - *Trả lời:* Được chuẩn hóa và lưu trữ dạng JSON/JSONL trong `data/processed/` kèm đầy đủ metadata (`doc_number`, `domain`, `is_active`, `full_reference`, `content`, `keywords`), sẵn sàng nạp vào Vector Database ở module tìm kiếm tiếp theo.

---

## 4. Tiêu chí Nghiệm thu (Acceptance Criteria)

### Kịch bản 1: Bóc tách thành công một Điều luật có phân cấp Khoản và Điểm
* **Given (Cho trước):** Đoạn văn bản luật quy định:
  *"Điều 6. Xử phạt người điều khiển xe mô tô, xe gắn máy...*  
  *Khoản 2. Phạt tiền từ 300.000 đồng đến 400.000 đồng đối với một trong các hành vi vi phạm sau đây:*  
  *a) Không chấp hành hiệu lệnh, chỉ dẫn của biển báo hiệu, vạch kẻ đường..."*
* **When (Khi):** Chạy hàm bóc tách Legal Chunker.
* **Then (Thì):** 
  * Tạo ra chunk có `full_reference` là: `"Điểm a Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP"`.
  * Nội dung `content` phải chứa trọn vẹn cả tiêu đề Điều, mức phạt của Khoản và hành vi của Điểm.
  * Mảng `keywords` tự động nhận diện các từ khóa: `['xe mô tô', 'xe gắn máy', 'biển báo hiệu', 'vạch kẻ đường', '300.000', '400.000']`.

### Kịch bản 2: Gắn đúng Metadata và Lĩnh vực (Domain)
* **Given (Cho trước):** Văn bản có số hiệu `168/2024/NĐ-CP`.
* **When (Khi):** Pipeline nạp dữ liệu xử lý văn bản.
* **Then (Thì):** Văn bản được gán chính xác:
  * `domain = 'TRAFFIC'`
  * `is_active = true` (vì ngày hết hạn chưa đến)
  * `doc_number = '168/2024/NĐ-CP'`.

### Kịch bản 3: Làm sạch rác văn bản (Clean Text)
* **Given (Cho trước):** Văn bản thô có chứa các dòng rác như: *"Trang 15/120"*, *"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"*, *"Độc lập - Tự do - Hạnh phúc"*, hoặc khoảng trắng thừa.
* **When (Khi):** Chạy qua bộ tiền xử lý (Pre-processor).
* **Then (Thì):** Các dòng rác tiêu ngữ và số trang bị loại bỏ 100%, chỉ giữ lại nội dung pháp lý thuần khiết.
