# BƯỚC 1: PRODUCT REVIEW — CỔNG QUẢN TRỊ DỮ LIỆU PHÁP LUẬT VỚI ASTRYX DESIGN SYSTEM (WEB ADMIN PORTAL)

---

## 1. Vấn đề (Problem Statement)

### Đối tượng gặp vấn đề:
* **Quản trị viên Hệ thống (System Admins):** Cần theo dõi tình trạng sức khỏe hạ tầng (Central API Gateway, Supabase DB, LLM Provider).
* **Chuyên viên Pháp lý & Biên tập viên (Legal Curators):** 
  - Cần tra cứu và rà soát kho dữ liệu 4.715 chunks từ 5 bộ luật cốt lõi.
  - Cần duyệt và xử lý các câu hỏi công dân mà hệ thống chưa có luật (`unresolved_queries`) để kịp thời bổ sung văn bản luật mới.
  - Cần điều chỉnh trọng số tìm kiếm hoặc chính sách rà soát hợp đồng (`system_configs`) mà không phải sửa code hay restart server.

### Nỗi đau thực tế (Pain Points):
1. **Thiếu Giao diện Trực quan cho Màn hình Desktop (Desktop Administrative Gap):**
   - Hiện tại toàn bộ dữ liệu 4.715 chunks, bảng cấu hình `system_configs` và hàng đợi `unresolved_queries` chỉ có thể xem qua dòng lệnh hoặc Supabase Studio.
   - Thao tác đối soát văn bản luật dài hàng trăm trang, đọc các trích dẫn và xem biểu đồ phân loại **bắt buộc phải thực hiện trên màn hình máy tính lớn** với chuột và bàn phím.
2. **Nguy cơ Không Đồng Nhất Giao Diện & Khó Khăn Khi Dùng AI Coding:**
   - Khi phát triển giao diện bằng các UI framework cũ, lập trình viên và AI thường xuyên gặp vấn đề sai lệch tokens, nhầm lẫn class CSS, thiếu đồng bộ theme.
   - Cần một Design System hiện đại, hỗ trợ chuẩn **AI-fluent** để AI có thể sinh mã giao diện chính xác tuyệt đối.

### Hậu quả nếu không làm:
* Quản trị viên không thể vận hành hệ thống một cách trực quan; các câu hỏi chưa được giải quyết của người dân bị ứ đọng; và không thể khai thác tối đa sức mạnh của Central API Gateway (Spec 008).

---

## 2. Hành vi Mong muốn (Desired Behavior)

Xây dựng ứng dụng **Web Admin** độc lập trong thư mục `admin/`, sử dụng **Next.js 15 (App Router)**, **React 19**, và Design System **Astryx (Meta)**:

1. **Khởi tạo và Tích hợp Astryx Chuẩn Hóa:**
   - Cài đặt `@astryxdesign/core`, `@stylexjs/stylex`, `@astryxdesign/theme-neutral`, `@astryxdesign/cli`.
   - Chạy `npx @astryxdesign/cli init` để tự động thiết lập tài liệu Agent Docs cho AI hiểu và áp dụng chính xác 100% conventions của Astryx.
   - Nạp các styles pre-compiled (`reset.css`, `astryx.css`, `theme.css`) vào `layout.tsx`.

2. **Màn hình 1: Dashboard Giám sát Hệ thống (System Overview):**
   - Hiển thị tình trạng Gateway (gọi `GET /api/v1/health`): Uptime, trạng thái Database, trạng thái LLM.
   - Thẻ thống kê tổng quan: Tổng số chunks luật đã nạp (4.715), số câu hỏi đang chờ duyệt (`unreviewed`), số phiên bản hợp đồng đã thẩm định.

3. **Màn hình 2: Quản lý & Tra cứu Kho Luật (Legal Chunks Browser):**
   - Tìm kiếm nhanh điều luật qua `POST /api/v1/search`.
   - Hiển thị danh sách chunks dạng bảng (`Table`), cho phép lọc theo lĩnh vực (`domain`: Giao thông, Lao động, BHXH, Nhà ở, Dân sự).
   - Xem chi tiết 3 tầng ngữ cảnh của một điều luật: Chương, Điều, Khoản, Điểm, và nội dung trích dẫn.

4. **Màn hình 3: Hàng đợi Câu hỏi Chưa có Luật (Knowledge Gap Queue):**
   - Hiển thị danh sách các câu hỏi từ bảng `unresolved_queries` có phân loại theo `hit_count` (tần suất hỏi cao nhất xếp trước).
   - Cho phép quản trị viên chuyển trạng thái (`unreviewed` $\rightarrow$ `resolved` hoặc `ignored`) và ghi chú căn cứ pháp lý cần bổ sung.

5. **Màn hình 4: Cấu hình Hệ thống Thời gian thực (Dynamic Configs):**
   - Xem và điều chỉnh các thông số trong `system_configs`: Ngưỡng tự tin (`confidence_threshold`), trọng số tìm kiếm (`search_weights`), danh mục hư từ (`stop_words`).

---

## 3. Bản Dựng Giao Diện & Bố Cục (Mock-up)

```text
+---------------------------------------------------------------------------------------------------+
| 🏛️ CIVICLAW AI — CỔNG QUẢN TRỊ TRUNG TÂM (ADMIN PORTAL)                      [🟢 Gateway: Online] |
+---------------------------------------------------------------------------------------------------+
| [📊 Dashboard]    [📚 Kho Dữ Liệu Luật]    [❓ Hàng Đợi Chưa Duyệt]    [⚙️ Cấu Hình Hệ Thống]      |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
| 📈 TỔNG QUAN HẠ TẦNG & DỮ LIỆU:                                                                   |
| +-------------------------+ +-------------------------+ +-------------------------+               |
| | 🟢 Gateway Server       | | 📚 4.715 Điều Luật      | | ❓ 12 Câu Hỏi Chờ       |               |
| | Port: 3000 | Uptime: 4h | | 05 Bộ luật chính thống  | | Đang chờ Admin bổ sung  |               |
| +-------------------------+ +-------------------------+ +-------------------------+               |
|                                                                                                   |
| 🔍 TRA CỨU NHANH KHO LUẬT (Legal Search Console):                                                 |
| [ Nhập từ khóa: "vượt đèn đỏ"                                  ] [ Lọc: Giao thông ▼ ] [Tìm kiếm] |
|                                                                                                   |
| Danh sách kết quả:                                                                                |
| ------------------------------------------------------------------------------------------------- |
| • Điểm a Khoản 5 Điều 6 Nghị định 168/2024/NĐ-CP | Độ khớp: 95% | [Xem chi tiết 3 tầng ngữ cảnh]  |
| • Điểm đ Khoản 3 Điều 6 Nghị định 168/2024/NĐ-CP | Độ khớp: 88% | [Xem chi tiết 3 tầng ngữ cảnh]  |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Làm Rõ & Ràng Buộc Nghiệp Vụ (Clarify - Cấm Đoán Mò)

- [x] **Q1: Web Admin giao tiếp với Backend qua phương thức nào?**
  - *Trả lời:* Gọi trực tiếp qua HTTP REST API của Central API Gateway (Spec 008, cổng `3000`) và truy vấn Supabase client cho các thao tác quản trị dữ liệu nội bộ.
- [x] **Q2: Tại sao ứng dụng được đặt trong thư mục `admin/` riêng biệt?**
  - *Trả lời:* Tuân thủ kiến trúc phân tách sạch sẽ (Clean Monorepo Separation). Repo gốc lưu trữ backend và các specs kiểm thử; thư mục `admin/` là một ứng dụng Next.js độc lập với `package.json` riêng, không gây xung đột dependency.
- [x] **Q3: Cơ chế StyleX trong Next.js được xử lý ra sao để không làm chậm build?**
  - *Trả lời:* Sử dụng phương án Pre-compiled CSS theo tài liệu khuyến nghị của Meta (`@astryxdesign/core/astryx.css` và `@astryxdesign/theme-neutral/theme.css`). Tránh việc phải chèn Babel plugin gây mất Turbopack của Next.js 15.

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria / BDD Scenarios)

### Kịch bản 1: Khởi tạo dự án và thiết lập Astryx thành công (Astryx Setup)
- **Given:** Thư mục `admin/` được khởi tạo với Next.js 15 + React 19.
- **When:** Cài đặt các gói `@astryxdesign/*` và chạy `npx @astryxdesign/cli init`.
- **Then:** Các file Agent Docs được sinh ra, styles pre-compiled được nạp vào `layout.tsx`, trang chủ render thành công mà không có lỗi CSS hay hydration.

### Kịch bản 2: Dashboard hiển thị trạng thái Gateway thời gian thực (Gateway Status)
- **Given:** Central API Gateway đang chạy tại `http://localhost:3000`.
- **When:** Người dùng mở trang Dashboard Admin.
- **Then:** Giao diện hiển thị thẻ Card của Astryx với trạng thái `🟢 Sẵn sàng hoạt động`, thời gian uptime và tình trạng kết nối cơ sở dữ liệu.

### Kịch bản 3: Tra cứu và xem chi tiết kho luật (Legal Chunks Browser)
- **Given:** Người dùng truy cập trang `/laws`.
- **When:** Nhập từ khóa tìm kiếm và chọn bộ lọc lĩnh vực.
- **Then:** Hệ thống gọi API Gateway `/api/v1/search` và hiển thị kết quả điều luật tương ứng với đầy đủ trích dẫn và nội dung.

### Kịch bản 4: Giám sát hàng đợi câu hỏi chưa có luật (Knowledge Gap Queue)
- **Given:** Người dùng truy cập trang `/gaps`.
- **When:** Xem danh sách câu hỏi chưa được giải quyết.
- **Then:** Giao diện hiển thị danh sách xếp theo `hit_count` giảm dần, cho phép đánh dấu đã xử lý (`resolved`).
