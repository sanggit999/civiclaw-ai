# BƯỚC 1: PRODUCT REVIEW — BỘ BÓC TÁCH TÀI LIỆU, QUẢN LÝ PHIÊN BẢN & LỊCH SỬ THẨM ĐỊNH HỢP ĐỒNG (CONTRACT DOCUMENT PARSER & VERSIONING AUDIT)

## 1. Vấn đề (Problem Statement)

### Đối tượng gặp vấn đề:
* **Người lao động, sinh viên, người đi thuê nhà:** Thường xuyên phải đàm phán nhiều vòng với bên tuyển dụng hoặc chủ nhà trọ trước khi ký hợp đồng chính thức.
* **Người dùng ứng dụng CivicLaw AI:** Nhận các bản hợp đồng dưới dạng tệp tài liệu thực tế (`.docx`, `.pdf`, `.txt`) chứ không phải chuỗi text sạch gõ tay.

### Nỗi đau thực tế (Pain Points):
1. **Thiếu Tầng Bóc tách File Tài liệu Thực Tế:**
   * Ở `specs/006`, `ContractAuditorAgent` đã hoàn thành rất tốt việc phân tích ngữ nghĩa, nhưng chỉ nhận đầu vào là chuỗi string thuần túy.
   * Tài liệu thực tế người dùng nhận được luôn có rất nhiều "nhiễu" văn bản: số trang (`Trang 1/5`, `Page 2 of 4`), tiêu đề lặp lại ở đầu mỗi trang (Running Headers), chân trang (Footers), dấu phân trang rác... Nếu không làm sạch, bộ phân đoạn `ClauseSegmenter` sẽ bị cắt vụn hoặc nhận diện sai cấu trúc điều khoản.
2. **Quá trình Đàm phán Hợp đồng là Chu kỳ Lặp lại Nhiều Vòng (Iterative Negotiation Lifecycle):**
   * Trong thực tế, gần như không ai ký ngay bản hợp đồng đầu tiên nếu có điều khoản bất lợi:
     * *Vòng 1 (Version 1):* Nhận bản thảo v1 $\rightarrow$ CivicLaw AI quét ra 2 điều khoản 🔴 Trái luật (giữ bằng đại học gốc, thử việc 120 ngày) $\rightarrow$ Điểm an toàn 42/100 (HIGH_RISK).
     * *Vòng 2 (Version 2):* Người dùng sao chép mẫu kiến nghị đàm phán của CivicLaw AI gửi cho Công ty $\rightarrow$ Công ty gửi lại bản thảo đã chỉnh sửa v2.
   * **Nỗi sợ lớn nhất của người dùng ở Vòng 2:**
     - Liệu Công ty đã thực sự sửa đúng luật chưa?
     - Công ty có "chữa cháy" chỗ này nhưng lại lén lút "cài cắm" thêm một điều khoản bất lợi mới ở chỗ khác không?
     - Điểm an toàn pháp lý đã cải thiện bao nhiêu điểm so với bản v1?
3. **Mất dấu Phả hệ Tài liệu (Document Lineage & Audit Trail Loss):**
   * Nếu không có cơ chế **Quản lý Phiên bản (Versioning)** và **So sánh Lịch sử Thẩm định (Audit History Diff)**:
     - Mỗi lần tải file lên, hệ thống lại coi như một hợp đồng xa lạ mới toanh.
     - Người dùng không có cái nhìn tổng quan về tiến trình thương lượng (Negotiation Progress).
     - Không có bằng chứng lịch sử đối chiếu sự tiến bộ pháp lý giữa các bản thảo.

### Hậu quả nếu không làm:
* Người dùng gặp khó khăn khi phải tự copy-paste thủ công văn bản từ file Word/PDF; dễ bị đối tác qua mặt khi sửa bản hợp đồng mới; và mất đi toàn bộ giá trị theo dõi vòng đời đàm phán của một trợ lý AI thông minh.

---

## 2. Hành vi Mong muốn (Desired Behavior)

CivicLaw AI mở rộng khả năng tiếp nhận tài liệu thực tế và quản lý vòng đời đàm phán hợp đồng:

1. **Bộ Bóc tách & Làm sạch Tài liệu (Document Parser & Normalizer):**
   * Tiếp nhận các định dạng tệp phổ biến: Plain Text / Markdown (`.txt`, `.md`), Word (`.docx`), và PDF (`.pdf`).
   * Chuẩn hóa văn bản:
     * Loại bỏ số trang: `Trang \d+/\d+`, `Page \d+ of \d+`.
     * Loại bỏ Running Headers & Footers lặp lại giữa các trang.
     * Chuẩn hóa dấu xuống dòng và khoảng trắng thừa.
   * Tính toán mã băm nội dung **SHA-256 (`contentHash`)**:
     * Chặn việc người dùng tải lên trùng lặp cùng một file mà không có thay đổi nội dung (Duplicate Content Guard).

2. **Quản lý Hồ sơ & Phiên bản Hợp đồng (Contract Document & Version Management):**
   * **Hồ sơ Hợp đồng (`ContractDocument`):** Đại diện cho một hợp đồng xuyên suốt quá trình đàm phán:
     * `id`: UUID định danh duy nhất.
     * `title`: Tên hợp đồng (VD: *"Hợp đồng lao động - Công ty Công nghệ XYZ"*).
     * `category`: Loại hợp đồng (`labor`, `rental`, `civil_loan`...).
     * `currentVersion`: Số phiên bản hiện tại (1, 2, 3...).
   * **Bản ghi Phiên bản (`ContractVersion`):** Lưu trữ từng mốc bản thảo cụ thể:
     * `versionNumber`: 1, 2, 3...
     * `fileName`: Tên file gốc người dùng tải lên (VD: `HDLD_XYZ_v1.docx`, `HDLD_XYZ_v2_chinhsua.docx`).
     * `contentHash`: Mã băm SHA-256.
     * `cleanedText`: Nội dung văn bản sạch sau khi bóc tách.
     * `auditReport`: Toàn bộ báo cáo thẩm định từ `ContractAuditorAgent` tương ứng với phiên bản đó.

3. **So sánh Lịch sử Thẩm định (Audit History & Version Comparison Diff):**
   * Khi người dùng tải lên phiên bản mới $v_k$ của một hợp đồng đã có $v_{k-1}$:
   * Hệ thống tự động so sánh đối soát chéo (Diffing Engine):
     * **Biến thiên Điểm số (`scoreDelta`):** $\Delta_{\text{score}} = \text{Score}_{v_k} - \text{Score}_{v_{k-1}}$ (Ví dụ: $+45$ điểm).
     * **Rủi ro đã được giải quyết (`resolvedViolations`):** Danh sách các điều khoản Đỏ/Vàng ở bản trước đã được đối tác sửa đổi hợp pháp thành công ở bản này!
     * **Rủi ro mới phát sinh (`newViolations`):** Cảnh báo nếu đối tác cố tình "cài cắm" thêm điều khoản bất lợi mới vào bản này!
     * **Đánh giá xu hướng (`status`):**
       * 🟢 `IMPROVED`: Bản mới an toàn hơn rõ rệt, rủi ro cũ đã được triệt tiêu.
       * 🔴 `REGRESSED`: Bản mới nguy hiểm hơn hoặc phát sinh thêm bẫy pháp lý.
       * ⚪ `UNCHANGED`: Không có sự thay đổi đáng kể về mặt an toàn pháp lý.

4. **Kiến trúc Lưu trữ Kép (Dual Storage Persistence):**
   * `InMemoryContractVersionStore`: Hỗ trợ kiểm thử TDD offline siêu tốc, không phụ thuộc mạng, 0đ chi phí.
   * `SupabaseContractVersionStore`: Lưu trữ bền vững trên PostgreSQL Supabase (`public.contract_documents` và `public.contract_versions`) với chính sách bảo mật dòng Row Level Security (RLS).

---

## 3. Bản Dựng Giao Diện & Luồng Tương Tác (Mock-up)

```text
+---------------------------------------------------------------------------------------------------+
| CIVICLAW AI - LỊCH SỬ THẨM ĐỊNH & SO SÁNH PHIÊN BẢN HỢP ĐỒNG                                      |
+---------------------------------------------------------------------------------------------------+
| 📄 Tài liệu: HỢP ĐỒNG LAO ĐỘNG - CÔNG TY CÔNG NGHỆ XYZ                                            |
| 🕒 Lịch sử đàm phán: 02 Phiên bản [v1 -> v2]                                                      |
|                                                                                                   |
| 🔄 SO SÁNH TIẾN TRÌNH: [Version 1 (01/01/2026)] ---> [Version 2 (05/01/2026)]                     |
| ------------------------------------------------------------------------------------------------- |
| • Điểm an toàn pháp lý:  42 / 100 (HIGH_RISK)   --->  100 / 100 (SAFE)   [Tăng +58 Điểm! 🚀]      |
| • Điều khoản Trái luật:  🔴 02 điều khoản       --->  🔴 00 điều khoản   [Đã xử lý triệt để! ✅]  |
| • Điều khoản Bất lợi:    🟡 01 điều khoản       --->  🟡 00 điều khoản                            |
| • Trạng thái đàm phán:   🟢 CẢI THIỆN XUẤT SẮC (IMPROVED) - ĐỦ ĐIỀU KIỆN KÝ KẾT                   |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
| 🎉 CÁC RỦI RO ĐÃ ĐƯỢC ĐỐI TÁC KHẮC PHỤC THÀNH CÔNG (RESOLVED VIOLATIONS):                         |
| ------------------------------------------------------------------------------------------------- |
| ✅ 1. Bãi bỏ yêu cầu giữ Bằng Đại học gốc (Điều 4 cũ):                                            |
|    - Bản v1: Bắt buộc nộp bản chính Bằng tốt nghiệp ĐH (Vi phạm Điều 17 BLLĐ 2019).               |
|    - Bản v2: Đã sửa thành "Người lao động chỉ nộp bản sao công chứng để đối chiếu hồ sơ".         |
|                                                                                                   |
| ✅ 2. Rút ngắn thời gian thử việc đúng luật (Điều 2 cũ):                                          |
|    - Bản v1: Thử việc 120 ngày (4 tháng) (Vi phạm Khoản 2 Điều 25 BLLĐ 2019).                     |
|    - Bản v2: Đã sửa thành "Thời gian thử việc là 60 ngày đối với vị trí kỹ sư phần mềm".          |
|                                                                                                   |
| 🛡️ RỦI RO MỚI PHÁT SINH (NEW VIOLATIONS):                                                         |
| ------------------------------------------------------------------------------------------------- |
|    Không phát hiện rủi ro mới nào! Đối tác không cài cắm thêm điều khoản bất lợi trong bản v2.    |
|                                                                                                   |
| 💡 KẾT LUẬN TƯ VẤN:                                                                               |
|    Bản hợp đồng Version 2 đã hoàn toàn phù hợp với Bộ luật Lao động 2019. Bạn có thể tự tin ký.  |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Làm rõ & Giả định (Clarify - Cấm đoán mò)

> [!IMPORTANT]
> Toàn bộ các câu hỏi nghiệp vụ và kỹ thuật đã được thống nhất rõ ràng:

- [x] **Q1: Cơ chế nhận diện hai văn bản thuộc cùng một Hồ sơ Hợp đồng (Document) hoạt động thế nào?**
  - *Trả lời:*
    - Khi người dùng tải lên lần đầu: Hệ thống cấp một `documentId` mới (UUID) và tạo phiên bản `v1`.
    - Khi người dùng tải lên bản chỉnh sửa tiếp theo: Client gửi kèm `documentId` hiện tại $\rightarrow$ Hệ thống tự động tăng `versionNumber = previousVersion + 1`, gắn liền vào cùng một phả hệ tài liệu.
- [x] **Q2: Cơ chế so sánh rủi ro (Audit Diff) hoạt động ra sao?**
  - *Trả lời:*
    - So sánh danh sách `findings` của bản trước ($v_{k-1}$) và bản hiện tại ($v_k$).
    - Một vi phạm ở $v_{k-1}$ được coi là **Đã giải quyết (`resolvedViolations`)** nếu không còn xuất hiện vi phạm tương tự ở $v_k$ (dựa trên nhóm vi phạm hoặc điều luật bị vi phạm).
    - Một vi phạm ở $v_k$ được coi là **Mới phát sinh (`newViolations`)** nếu ở $v_{k-1}$ không hề có vi phạm này.
- [x] **Q3: Xử lý thế nào nếu người dùng vô tình tải lên cùng một file nội dung giống hệt nhau?**
  - *Trả lời:* Hệ thống tính mã băm SHA-256 (`contentHash`). Nếu `contentHash` của file mới trùng khớp với phiên bản gần nhất của `documentId`, hệ thống ném ra cảnh báo `DuplicateContentError` ("Nội dung tệp không có sự thay đổi so với phiên bản hiện tại"), tránh sinh rác phiên bản.
- [x] **Q4: Tầng Document Parser xử lý các định dạng nhị phân (.docx, .pdf) theo nguyên tắc nào của Ponytail?**
  - *Trả lời:* Thiết kế theo **Adapter Pattern**:
    - Core engine giao tiếp qua interface `IDocumentParser` nhận `Buffer | string` và trả về text sạch.
    - Cung cấp `TextDocumentParser` (cho `.txt`, `.md`), `DocxDocumentParser` (bóc tách cấu trúc XML sạch sẽ không phụ thuộc thư viện nặng), và `MockDocumentParser` cho kiểm thử offline siêu tốc.
- [x] **Q5: Có cần migration cơ sở dữ liệu trên Supabase không?**
  - *Trả lời:* Có. Chúng ta cung cấp file `schema.sql` định nghĩa 2 bảng quan hệ: `public.contract_documents` và `public.contract_versions` kèm Foreign Keys, RLS policies và Indexes tối ưu.

---

## 5. Tiêu chí Nghiệm thu (Acceptance Criteria / BDD)

### Kịch bản 1: Bóc tách & Làm sạch Nhiễu Tài liệu (Happy Path Parser)
* **Given (Cho trước):** Người dùng tải lên văn bản hợp đồng chứa các dòng nhiễu như *"Trang 1/4"*, *"Page 2 of 4"*, các tiêu đề lặp lại *"CÔNG TY XYZ - HỢP ĐỒNG LAO ĐỘNG"* ở đầu mỗi trang và khoảng trắng thừa.
* **When (Khi):** `DocumentParser.parseAndClean()` thực thi xử lý.
* **Then (Thì):**
  * Toàn bộ số trang và header lặp lại bị loại bỏ sạch sẽ.
  * Các điều khoản `Điều 1`, `Điều 2` được bảo toàn nguyên vẹn ngữ cảnh.
  * Sinh mã băm SHA-256 chính xác cho nội dung sạch.

### Kịch bản 2: Khởi tạo Hồ sơ Hợp đồng & Lưu Phiên bản 1 (Happy Path v1 Upload)
* **Given (Cho trước):** Người dùng tải lên bản hợp đồng thô lần đầu tiên (`HDLD_v1.docx`).
* **When (Khi):** Hệ thống thực thi quy trình tiếp nhận và thẩm định qua `ContractAuditorAgent`.
* **Then (Thì):**
  * Khởi tạo một `ContractDocument` mới với `currentVersion = 1`.
  * Lưu bản ghi `ContractVersion` với `versionNumber = 1`, lưu `contentHash` và toàn văn `ContractAuditReport`.
  * Trả về báo cáo thẩm định ban đầu cho người dùng.

### Kịch bản 3: Tải lên Phiên bản 2 & So sánh Lịch sử Thẩm định (Happy Path v2 Diff & Resolved Risks)
* **Given (Cho trước):**
  * Phiên bản 1 của hợp đồng bị 2 cờ 🔴 Đỏ (giữ bằng gốc và thử việc 120 ngày), đạt 42 điểm (HIGH_RISK).
  * Đối tác gửi lại bản hợp đồng mới đã sửa thành thử việc 60 ngày và bỏ điều khoản giữ bằng gốc.
* **When (Khi):** Người dùng tải bản mới lên cùng `documentId` để tạo phiên bản `v2`.
* **Then (Thì):**
  * Hệ thống lưu phiên bản `v2` với `versionNumber = 2`.
  * Động cơ so sánh lịch sử (Audit Diff Engine) phát hiện:
    * `scoreDelta = +58` (từ 42 lên 100 điểm).
    * `resolvedViolations` chứa đúng 2 vi phạm đã được khắc phục.
    * `newViolations` là danh sách rỗng (0 rủi ro mới).
    * Trạng thái tổng quan là `IMPROVED`.

### Kịch bản 4: Chặn tải lên tệp nội dung trùng lặp (Duplicate Content Guard)
* **Given (Cho trước):** Hợp đồng đã có phiên bản `v1` với mã băm SHA-256 `hashA`.
* **When (Khi):** Người dùng tiếp tục tải lên một tệp có nội dung tạo ra đúng mã băm `hashA` cho cùng `documentId`.
* **Then (Thì):**
  * Hệ thống từ chối tạo version mới và trả về thông báo lỗi rõ ràng.
  * Không làm tăng số phiên bản và không tạo dữ liệu rác trong database.

### Kịch bản 5: Quản lý Phiên bản Đa Môi trường & Chống Hardcode (Storage Flexibility)
* **Given (Cho trước):** Hệ thống có thể chuyển đổi linh hoạt giữa `InMemoryContractVersionStore` (offline) và `SupabaseContractVersionStore` (cloud).
* **When (Khi):** Thực thi lưu trữ và truy vấn lịch sử các phiên bản của một hợp đồng.
* **Then (Thì):** Dữ liệu được bảo toàn tính toàn vẹn, lịch sử các phiên bản được sắp xếp theo thứ tự thời gian tăng dần và tuân thủ chặt chẽ ranh giới bảo mật.
