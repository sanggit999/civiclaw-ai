# BƯỚC 1: PRODUCT REVIEW — HỆ THỐNG AI AGENT RÀ SOÁT RỦI RO HỢP ĐỒNG CÁ NHÂN (CONTRACT AUDITOR AGENT)

## 1. Vấn đề (Problem Statement)

### Đối tượng gặp vấn đề:
* **Người lao động / Thực tập sinh / Nhân viên văn phòng:** Chuẩn bị ký kết Hợp đồng Lao động (HĐLĐ) hoặc Thỏa thuận Thử việc với doanh nghiệp.
* **Người đi thuê nhà / Sinh viên / Công nhân:** Ký kết Hợp đồng Thuê nhà, Thuê phòng trọ, Căn hộ dịch vụ với bên cho thuê.
* **Công dân vay mượn dân sự:** Ký kết Hợp đồng Vay tiền, Giấy mượn nợ cá nhân.

### Nỗi đau thực tế (Pain Points):
1. **Bất cân xứng thông tin & Vị thế đàm phán:**
   * Hợp đồng luôn do bên nắm quyền lực kinh tế (Bên tuyển dụng, Chủ nhà trọ, Bên cho vay) đơn phương soạn thảo với các điều khoản nghiêng hẳn về lợi ích của họ.
   * Người dân thông thường không có kiến thức pháp lý sâu sắc về *Bộ luật Lao động 2019*, *Luật Nhà ở 2023*, *Bộ luật Dân sự 2015* để nhận diện các "bẫy cài cắm".
2. **Các điều khoản vi phạm pháp luật nhưng người ký không hề hay biết:**
   * **Trong HĐ Lao động:** Doanh nghiệp yêu cầu "nộp giữ bản chính Bằng tốt nghiệp đại học / CCCD" (vi phạm nghiêm trọng Điều 17 BLLĐ 2019); thời gian thử việc 6 tháng cho vị trí thông thường (vi phạm Điều 25 BLLĐ 2019 quy định tối đa 60 ngày hoặc 180 ngày chỉ dành cho người quản lý doanh nghiệp); điều khoản cấm mang thai trong 2 năm đầu (vi phạm Điều 137 BLLĐ 2019); điều khoản trừ lương khi vi phạm nội quy (vi phạm Điều 127 BLLĐ 2019).
   * **Trong HĐ Thuê nhà trọ:** Chủ trọ đơn phương quy định "có quyền tăng giá thuê bất kỳ lúc nào nếu thấy chi phí tăng", tự ý tịch thu 100% tiền cọc dù người thuê thông báo trước đúng luật, hoặc tự ý vào phòng bất kỳ lúc nào; tính tiền điện 5.000đ/kWh vượt khung giá bán lẻ điện sinh hoạt của Nhà nước.
   * **Trong HĐ Vay tài sản:** Lãi suất ngầm trên 20%/năm hoặc mức phạt vi phạm chậm trả gấp nhiều lần số tiền nợ gốc (vi phạm Điều 468 BLDS 2015).
3. **Chi phí tiếp cận Luật sư quá cao:**
   * Thuê luật sư tư vấn soát xét một hợp đồng thuê trọ 3 triệu/tháng hay HĐLĐ 10 triệu/tháng có thể tốn từ 1.000.000đ - 3.000.000đ, hoàn toàn bất khả thi với đại đa số người lao động và sinh viên.
4. **Hạn chế của mô hình RAG một chiều thông thường:**
   * Một hợp đồng hoàn chỉnh có từ 10 - 30 điều khoản. Nếu chỉ dùng RAG hỏi đáp từng câu (Single QA), người dùng không thể biết phải hỏi câu gì vì *"bạn không biết những gì bạn không biết"* (Unknown Unknowns). Cần một **AI Agent tự chủ** tự động bóc tách từng điều khoản, tự lập kế hoạch tra cứu chéo các bộ luật và tổng hợp báo cáo đánh giá rủi ro đa chiều.

### Hậu quả nếu không làm:
* Người dân ký phải hợp đồng "bẫy", bị giữ bằng cấp gốc, bị phạt tiền vô lý khi nghỉ việc, bị đuổi ra khỏi nhà trọ đột ngột mất trắng tiền cọc, hoặc vướng vào nợ nần lãi suất phi pháp mà không có công cụ bảo vệ quyền lợi chính đáng.

---

## 2. Hành vi Mong muốn (Desired Behavior)

CivicLaw AI nâng cấp lên **Giai đoạn 2 (Agentic Evolution)** với module **Contract Auditor Agent**:

1. **Bóc tách Điều khoản Tự động (Clause Segmentation & Semantic Categorization):**
   * Tiếp nhận nội dung văn bản hợp đồng (dưới dạng văn bản thuần Text / Markdown).
   * Tự động nhận diện cấu trúc văn bản: Tiêu đề hợp đồng, các Bên tham gia, từng Điều (`Điều 1`, `Điều 2`...), từng Khoản (`Khoản 1`, `Khoản 2`...).
   * Gán nhãn chủ đề nghiệp vụ cho từng điều khoản: `COMPENSATION_SALARY` (Tiền lương), `PROBATION` (Thử việc), `DEPOSIT` (Đặt cọc), `RENTAL_PRICE` (Giá thuê), `WORKING_HOURS` (Thời giờ làm việc), `DISCIPLINE_PENALTY` (Kỷ luật & Phạt tiền), `TERMINATION` (Chấm dứt hợp đồng), `CONFIDENTIALITY` (Bảo mật & Cạnh tranh), `MISCELLANEOUS` (Khác).

2. **Hộp Công cụ Agentic (Agent Tools) & Vòng lặp ReAct (Reasoning + Action Loop):**
   * Thay vì chỉ RAG thụ động, Agent được trang bị bộ công cụ:
     * `SearchLegalDatabaseTool`: Tra cứu các điều luật liên quan trong kho 4.715 chunks theo phạm vi lĩnh vực (Lao động, Nhà ở, Dân sự).
     * `VerifyClauseLegalityTool`: So sánh ngữ nghĩa điều khoản hợp đồng với quy định pháp luật thực định.
     * `StatutoryLimitCheckerTool`: Kiểm tra các ngưỡng giới hạn cứng theo luật (VD: Thử việc $\le$ 30 hoặc 60 ngày; Báo trước nghỉ việc $\ge$ 30 ngày cho HĐ xác định thời hạn hoặc 45 ngày cho HĐ không xác định thời hạn; Lãi suất vay $\le$ 20%/năm).
     * `ClarificationTool`: Phát hiện khi hợp đồng thiếu các trường thông tin trọng yếu để đề nghị người dùng cung cấp thêm dữ kiện.

3. **Hệ thống Đánh giá Rủi ro 3 Mức (3-Tier Risk Rating):**
   * 🔴 **RỦI RO CAO / TRÁI LUẬT (High / Illegal / Void):**
     * Điều khoản vi phạm trực tiếp quy định cấm của pháp luật hoặc vô hiệu theo luật định.
     * Cung cấp: Tên điều khoản vi phạm + Trích dẫn chính xác Điều, Khoản văn bản luật + Phân tích lý do trái luật + Kiến nghị sửa đổi/bãi bỏ.
   * 🟡 **BẤT LỢI CẦN ĐÀM PHÁN (Medium / Disadvantageous / Asymmetric):**
     * Không vi phạm điều cấm nhưng nghiêng hẳn quyền lợi về phía đối phương hoặc đặt người ký vào thế bị động.
     * Cung cấp: Phân tích rủi ro thực tế + **Mẫu điều khoản đàm phán lại (Renegotiation Proposal)** để người dùng sao chép gửi cho đối tác.
   * 🟢 **HỢP PHÁP & AN TOÀN (Low / Safe / Compliant):**
     * Điều khoản rõ ràng, tuân thủ đúng quy định và thông lệ chuẩn.

4. **Kiểm tra Điều khoản Bắt buộc Bị Bỏ Sót (Mandatory Clause Completeness Check):**
   * Đối chiếu với quy định tại **Điều 21 Bộ luật Lao động 2019** (các nội dung chủ yếu bắt buộc phải có của HĐLĐ) hoặc **Điều 163 Luật Nhà ở 2023** (nội dung hợp đồng thuê nhà ở).
   * Cảnh báo nếu hợp đồng cố tình "lờ đi" các quyền lợi cốt lõi (ví dụ: HĐLĐ không ghi rõ trang thiết bị bảo hộ, không ghi rõ trách nhiệm đóng BHXH; HĐ thuê nhà không ghi thỏa thuận về bảo trì, sửa chữa).

5. **Báo cáo Thẩm định Hợp đồng Tổng thể (Comprehensive Audit Report):**
   * **Điểm an toàn hợp đồng (Safety Score từ 0 - 100):** Đánh giá tổng quan theo trọng số rủi ro.
   * **Tóm tắt điều hành (Executive Summary):** 3-5 câu tổng quan dành cho người bận rộn.
   * **Bảng thống kê số lượng rủi ro:** Số điều khoản Đỏ, Vàng, Xanh.
   * **Danh sách thẻ phân tích chi tiết từng điều khoản:** Kèm đề xuất đàm phán sửa đổi.

---

## 3. Bản Dựng Giao Diện & Luồng Tương Tác (Mock-up)

```text
+---------------------------------------------------------------------------------------------------+
| CIVICLAW AI - BÁO CÁO RÀ SOÁT RỦI RO HỢP ĐỒNG CÁ NHÂN (CONTRACT AUDIT REPORT)                     |
+---------------------------------------------------------------------------------------------------+
| 📄 Tên tài liệu: HỢP ĐỒNG LAO ĐỘNG - CÔNG TY TNHH PHÁT TRIỂN CÔNG NGHỆ XYZ                       |
| 🏷️ Loại hợp đồng: Hợp đồng lao động xác định thời hạn (12 tháng)                                   |
| 🛡️ ĐIỂM AN TOÀN PHÁP LÝ: 42 / 100 [MỨC ĐỘ RỦI RO: CAO - KHÔNG NÊN KÝ NGAY]                        |
|                                                                                                   |
| 📊 TỔNG HỢP RỦI RO:                                                                               |
|   🔴 02 Điều khoản TRÁI LUẬT (Vô hiệu từng phần)                                                  |
|   🟡 02 Điều khoản BẤT LỢI CẦN ĐÀM PHÁN                                                           |
|   ⚠️ 01 Điều khoản BẮT BUỘC BỊ THIẾU                                                              |
|   🟢 05 Điều khoản HỢP PHÁP VÀ AN TOÀN                                                            |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
| 🔴 CẢNH BÁO 1: YÊU CẦU GIỮ BẰNG CẤP GỐC (TRÁI LUẬT)                                              |
| ------------------------------------------------------------------------------------------------- |
| • Trích đoạn HĐ: "Điều 8: Người lao động phải nộp bản chính Bằng tốt nghiệp Đại học cho Công ty   |
|   để lưu giữ trong suốt thời hạn hợp đồng."                                                       |
| • ⚖️ Vi phạm pháp luật: Khoản 1 Điều 17 Bộ luật Lao động 2019 nghiêm cấm người sử dụng lao động   |
|   giữ bản chính giấy tờ tùy thân, văn bằng, chứng chỉ của người lao động.                         |
| • 🚨 Hậu quả: Điều khoản này vô hiệu theo Điều 49 BLLĐ 2019. Doanh nghiệp có thể bị xử phạt hành |
|   chính từ 20.000.000đ đến 25.000.000đ theo Nghị định 12/2022/NĐ-CP.                             |
| • 💡 Kiến nghị sửa đổi: Yêu cầu Công ty chỉ lưu bản photo công chứng, giữ lại bản chính của bạn. |
|                                                                                                   |
| 🔴 CẢNH BÁO 2: THỜI GIAN THỬ VIỆC QUÁ QUY ĐỊNH (TRÁI LUẬT)                                       |
| ------------------------------------------------------------------------------------------------- |
| • Trích đoạn HĐ: "Điều 2: Thời gian thử việc là 120 ngày (4 tháng) kể từ ngày ký hợp đồng..."      |
| • ⚖️ Vi phạm pháp luật: Khoản 2 Điều 25 Bộ luật Lao động 2019 quy định thời gian thử việc tối đa |
|   chỉ 60 ngày đối với công việc có chức danh nghề nghiệp cần trình độ chuyên môn kỹ thuật từ CĐ/ĐH.|
| • 💡 Kiến nghị sửa đổi: Đề nghị điều chỉnh thời gian thử việc thành tối đa không quá 60 ngày.     |
|                                                                                                   |
| 🟡 CẢNH BÁO 3: ĐIỀU KHOẢN PHẠT VI PHẠM ĐƠN PHƯƠNG QUÁ NẶNG (BẤT LỢI)                              |
| ------------------------------------------------------------------------------------------------- |
| • Trích đoạn HĐ: "Nếu người lao động nghỉ việc trước thời hạn hợp đồng phải bồi thường 06 tháng   |
|   tiền lương và toàn bộ chi phí đào tạo nội bộ."                                                 |
| • ⚖️ Đánh giá rủi ro: Theo Điều 35 BLLĐ 2019, NLĐ có quyền đơn phương chấm dứt HĐLĐ chỉ cần báo  |
|   trước 30 ngày (với HĐ có thời hạn). Việc áp đặt mức phạt 6 tháng lương khi báo trước đúng hạn  |
|   là trái luật. Chỉ phải bồi thường chi phí đào tạo nếu có ký Hợp đồng đào tạo nghề riêng biệt.  |
| • 📝 MẪU CÂU ĐỀ NGHỊ ĐÀM PHÁN LẠI:                                                                |
|   "Kính đề nghị Công ty sửa đổi Điều 8 theo đúng quy định tại Điều 35 và Điều 40 Bộ luật Lao động|
|   2019: Người lao động có quyền chấm dứt hợp đồng khi thực hiện nghĩa vụ báo trước 30 ngày."      |
|                                                                                                   |
| ⚠️ CẢNH BÁO THIẾU SÓT: THIẾU THÔNG TIN BẢO HIỂM XÃ HỘI (MANDATORY FIELD)                          |
| ------------------------------------------------------------------------------------------------- |
| • Hợp đồng không hề đề cập đến trách nhiệm đóng Bảo hiểm xã hội, BHYT, BHTN theo quy định bắt buộc|
|   tại Điểm f Khoản 1 Điều 21 Bộ luật Lao động 2019 và Luật Bảo hiểm xã hội 2024.                 |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Làm rõ & Giả định (Clarify - Cấm đoán mò)

> [!IMPORTANT]
> Toàn bộ các câu hỏi nghiệp vụ và kỹ thuật dưới đây đã được làm rõ và thống nhất:

- [x] **Q1: Module này hỗ trợ những loại hợp đồng nào trong giai đoạn đầu?**
  - *Trả lời:* Tập trung vào 3 loại hợp đồng dân sự và cá nhân phổ biến nhất tại Việt Nam:
    1. **Hợp đồng lao động & thử việc** (`labor`): Đối chiếu với Bộ luật Lao động 2019 & Luật BHXH 2024.
    2. **Hợp đồng thuê nhà, thuê trọ** (`rental`): Đối chiếu với Luật Nhà ở 2023 & Bộ luật Dân sự 2015.
    3. **Hợp đồng vay tiền cá nhân** (`civil_loan`): Đối chiếu với Bộ luật Dân sự 2015 (lãi suất và bảo đảm tài sản).
- [x] **Q2: Định dạng đầu vào của hợp đồng là gì?**
  - *Trả lời:* Core Engine của Agent nhận đầu vào là chuỗi văn bản (`string`), hỗ trợ định dạng Plain Text hoặc Markdown bóc tách từ file tài liệu. Điều này tuân thủ nguyên tắc Ponytail (độc lập với thư viện phân tích PDF/DOCX nhị phân nặng nề ở tầng lõi, việc parse file thuộc về tầng adapter giao diện client hoặc upload utility).
- [x] **Q3: Cơ chế tính điểm An toàn Pháp lý (Safety Score) hoạt động ra sao?**
  - *Trả lời:* Thang điểm 100:
    - Điểm gốc: $100$ điểm.
    - Mỗi điều khoản 🔴 **Đỏ (Trái luật / Vô hiệu):** Trừ $25$ điểm.
    - Mỗi điều khoản 🟡 **Vàng (Bất lợi cần đàm phán):** Trừ $10$ điểm.
    - Mỗi điều khoản ⚠️ **Bắt buộc bị thiếu:** Trừ $15$ điểm.
    - Điểm tối thiểu không âm: $\max(0, \text{Score})$.
    - Xếp hạng: $\ge 80$: An toàn (Safe); $60 - 79$: Cảnh giác (Caution); $< 60$: Nguy hiểm (High Risk).
- [x] **Q4: Vòng lặp ReAct của Agentic hoạt động thế nào để ngăn chặn lặp vô tận (Infinite Loop Guard)?**
  - *Trả lời:* Agent được thiết lập thông số `maxSteps` (mặc định $6$ bước). Mỗi bước thực hiện chu trình:
    $$\text{Thought} \longrightarrow \text{Action (Tool Call)} \longrightarrow \text{Observation} \longrightarrow \text{Next Step}$$
    Nếu đạt `maxSteps` mà chưa hoàn tất, Agent tự động tổng hợp báo cáo dựa trên những quan sát đã thu thập được để bảo đảm an toàn thời gian phản hồi.
- [x] **Q5: Có cần kết nối mạng hay bắt buộc phải có Gemini API khi chạy kiểm thử unit test không?**
  - *Trả lời:* Tuân thủ chính sách kiểm thử SDD & Ponytail: Hỗ trợ `MockContractLlmProvider` và `MockLegalSearchEngine` trong thư mục `tests/fixtures/` để toàn bộ bộ test BDD chạy offline siêu tốc (< 100ms), độc lập mạng và 0 đồng chi phí API. Tầng kết nối thực tế với Gemini và PostgreSQL sẽ nằm ở lát cắt tích hợp.

---

## 5. Tiêu chí Nghiệm thu (Acceptance Criteria / BDD)

### Kịch bản 1: Thẩm định Hợp đồng Lao động phát hiện Điều khoản Giữ bằng gốc & Thử việc quá luật (Happy Path 🔴 Đỏ)
* **Given (Cho trước):** Người dùng cung cấp văn bản Hợp đồng lao động có điều khoản yêu cầu nộp bản chính Bằng tốt nghiệp đại học và thời gian thử việc 4 tháng (120 ngày) đối với nhân viên kế toán.
* **When (Khi):** `ContractAuditorAgent` thực thi quy trình rà soát hợp đồng.
* **Then (Thì):**
  * Hệ thống phát hiện ít nhất 02 cảnh báo mức 🔴 **HIGH (Trái luật)**.
  * Cảnh báo 1 trích dẫn chính xác **Điều 17 Bộ luật Lao động 2019** (nghiêm cấm giữ bằng cấp gốc).
  * Cảnh báo 2 trích dẫn chính xác **Điều 25 Bộ luật Lao động 2019** (thử việc tối đa 60 ngày).
  * Điểm an toàn hợp đồng bị trừ xuống dưới 60 điểm (Mức nguy hiểm).

### Kịch bản 2: Thẩm định Hợp đồng Thuê nhà có Điều khoản Tăng giá tùy ý & Tịch thu cọc (Happy Path 🔴 Đỏ & 🟡 Vàng)
* **Given (Cho trước):** Người dùng cung cấp Hợp đồng thuê nhà ở với điều khoản: *"Bên cho thuê có quyền tăng tiền nhà bất kỳ lúc nào nếu giá thị trường biến động"* và *"Nếu bên thuê chấm dứt hợp đồng trước hạn sẽ bị tịch thu toàn bộ tiền đặt cọc và không được giải thích lý do"*.
* **When (Khi):** `ContractAuditorAgent` thực thi rà soát với danh mục `rental`.
* **Then (Thì):**
  * Hệ thống gắn cờ 🔴 **Trái luật** hoặc 🟡 **Bất lợi cần đàm phán** dựa trên **Luật Nhà ở 2023** và **Bộ luật Dân sự 2015**.
  * Cung cấp mẫu câu đề xuất đàm phán lại thời hạn báo trước và điều kiện hoàn cọc hợp lý.

### Kịch bản 3: Phát hiện Thiếu hụt Điều khoản Bắt buộc (Missing Mandatory Clauses)
* **Given (Cho trước):** Người dùng cung cấp HĐLĐ nhưng bản hợp đồng cố tình lược bỏ mục *"Bảo hiểm xã hội, Bảo hiểm y tế"* và *"Trang bị bảo hộ lao động"*.
* **When (Khi):** `ContractAuditorAgent` kiểm tra tính toàn vẹn theo danh mục nội dung bắt buộc của **Điều 21 BLLĐ 2019**.
* **Then (Thì):**
  * Hệ thống phát hiện danh sách các điều khoản thiếu hụt (`missingClauses`).
  * Ghi chú rõ đây là quyền lợi luật định bắt buộc người sử dụng lao động phải thể hiện bằng văn bản.

### Kịch bản 4: Hợp đồng Chuẩn mực An toàn (Happy Path 🟢 Xanh)
* **Given (Cho trước):** Người dùng cung cấp hợp đồng thuê nhà tuân thủ chuẩn mực: thử việc 30 ngày, tiền lương rõ ràng, điều kiện trả cọc minh bạch, báo trước 30 ngày.
* **When (Khi):** `ContractAuditorAgent` phân tích toàn bộ các điều khoản.
* **Then (Thì):**
  * 0 điều khoản vi phạm cờ Đỏ.
  * Điểm an toàn $\ge 85 / 100$.
  * Phản hồi đánh giá hợp đồng đạt chuẩn an toàn, người dùng có thể tự tin ký kết.

### Kịch bản 5: Cấu hình Linh hoạt & Triết lý Ponytail (Anti-Hardcode)
* **Given (Cho trước):** Khởi tạo `ContractAuditorAgent` với cấu hình tùy chỉnh (`customConfig`):
  * Tùy biến trọng số điểm phạt (`redPenalty: 30, yellowPenalty: 15`).
  * Tùy biến giới hạn số bước ReAct loop (`maxSteps: 8`).
* **When (Khi):** Thực thi rà soát trên văn bản có điều khoản vi phạm.
* **Then (Thì):** Hệ thống tính toán điểm an toàn theo đúng trọng số được truyền vào, tuyệt đối không dùng số ma thuật fix cứng.
