---
trigger: always_on
---
<!--
================================================================================
⚠️ CẢNH BÁO: FILE NÀY ĐƯỢC TỰ ĐỘNG SINH (AUTO-GENERATED) TỪ .claude/
TUYỆT ĐỐI KHÔNG SỬA TAY FILE NÀY!
Chỉnh sửa bản gốc tại: .claude/rules/ponytail.md
Sau đó chạy: npm run sync (hoặc python3 -I scripts/sync-ai-config.py)
================================================================================
-->

# Quy tắc Ponytail (Lập trình Tối giản & Thực dụng)

> **Triết lý cốt lõi:**
> *"The best code is the code you never wrote." (Dòng code tốt nhất là dòng code không bao giờ phải viết).*  
> Mỗi dòng code sinh ra đều là một rủi ro và nợ kỹ thuật cần bảo trì.

## 1. Chiếc thang quyết định 7 bậc (The 7-Rung Ladder)
Trước khi viết bất kỳ hàm mới nào, AI phải kiểm tra tuần tự và **dừng lại ở bậc đầu tiên** đáp ứng được yêu cầu:

1. **YAGNI (You Aren't Gonna Need It):** Tính năng này có thực sự cần thiết lúc này không? Nếu là suy đoán viển vông, bỏ qua.
2. **Tái sử dụng (Codebase Reuse):** Kiểm tra xem codebase hiện tại đã có helper, utility, type hoặc pattern tương tự chưa. Ưu tiên tái sử dụng, cấm viết lại hàm đã có.
3. **Thư viện chuẩn (Stdlib):** Tận dụng tối đa built-in methods của ngôn ngữ (VD: TypeScript/JavaScript built-ins, Node.js stdlib) thay vì viết custom code.
4. **Nền tảng gốc (Platform Native):** Dùng tính năng native của trình duyệt, HTML/CSS, OS hoặc ràng buộc của Database thay vì code JavaScript/logic ứng dụng.
5. **Dependency hiện có:** Chỉ dùng các thư viện đã được cài sẵn trong `package.json`. Tuyệt đối không cài thêm package bên ngoài chỉ vì một vài dòng logic đơn giản.
6. **One-liner:** Nếu biểu thức logic có thể viết gọn gàng, rõ nghĩa trong 1 dòng thì giữ nguyên 1 dòng.
7. **Code tối thiểu (Minimum Viable Code):** Chỉ viết code mới khi 6 bậc trên không đáp ứng, và chỉ viết lượng code vừa đủ để vượt qua các bộ test kiểm thử (pass test).

## 2. Sửa lỗi tận gốc (Root Cause, Not Symptoms)
- Không vá lỗi cục bộ tại từng nơi gọi hàm (callers).
- Tìm nguyên nhân gốc rễ: Thêm một điều kiện kiểm tra (guard) duy nhất ở hàm dùng chung thay vì sửa 5 chỗ gọi khác nhau.

## 3. Ranh giới bất khả xâm phạm (Non-Negotiable Red Lines)
Tuyệt đối KHÔNG cắt giảm:
- Xác thực dữ liệu đầu vào (Input validation) tại trust boundary.
- Xử lý lỗi (Error handling) và phòng chống mất mát dữ liệu (Data loss prevention).
- Tính bảo mật và khả năng tiếp cận (Accessibility - a11y).
- **Quy tắc Chống Hardcode (Zero Hardcoded Secrets/Logic):** Không hardcode bí mật, URL, hoặc số ma thuật vào code production.

---

## 4. Chính sách Kiểm soát Hardcode (Hardcoding Policy)

### 🔴 Trường hợp TUYỆT ĐỐI CẤM Hardcode (Zero Tolerance)
Vi phạm các mục này sẽ bị từ chối code (Reject PR/Code) ngay lập tức:
1. **Thông tin nhạy cảm & Bí mật (Secrets & Credentials):**
   - API Keys, Service Role Keys, Database Passwords, JWT Secrets, Access Tokens.
   - *Giải pháp:* Luôn nạp qua biến môi trường (`process.env.VAR_NAME`) và file `.env` (đã nằm trong `.gitignore`).
2. **Điểm cuối môi trường & Mạng (Network & Environment Endpoints):**
   - Supabase Project URL, DB Host, API Base URLs, Port kết nối mạng.
   - *Giải pháp:* Cấu hình qua `.env` kèm giá trị mặc định hợp lý ở tầng Config Provider.
3. **Số ma thuật & Chuỗi ma thuật (Magic Numbers & Magic Strings):**
   - Ví dụ: `if (score >= 0.75)`, `setTimeout(..., 5000)`, `batchSize: 500`.
   - *Giải pháp:* Khai báo hằng số định danh (Named Constants) trong file cấu hình (`constants.ts` / `config.ts`) hoặc nhận qua đối tượng cấu hình tùy biến (Config/Options Object).
4. **Đường dẫn thư mục/file tuyệt đối (Absolute File Paths):**
   - Tuyệt đối không dùng đường dẫn cố định của máy cá nhân (ví dụ: `D:\civiclaw-ai\...` hoặc `C:\Users\...`).
   - *Giải pháp:* Dùng `path.resolve()`, `path.join()`, hoặc biến môi trường gốc.
5. **Dữ liệu sống & Nghiệp vụ Pháp lý (Live Domain Data & Rules):**
   - Mức phạt, tên điều luật, điều khoản thi hành, ngưỡng xử phạt không được gán chết trong thân hàm logic tính toán.
   - *Giải pháp:* Lưu trữ và truy vấn động từ Database (`legal_chunks`, `system_configs`).

---

### 🟡 Trường hợp TẠM THỜI ĐƯỢC PHÉP Hardcode (Controlled & Isolated Scope)
Chỉ được phép hardcode trong các ngữ cảnh bị cô lập và phục vụ mục đích kiểm thử/minh họa:
1. **Bản dựng Mock-up (Spec Bước 1 & Demo UI sơ khởi):**
   - Giao diện mẫu, sơ đồ ASCII, dữ liệu dummy hiển thị phản hồi bot trong `spec.md` hoặc nguyên mẫu UI tĩnh khi backend chưa sẵn sàng.
2. **Dữ liệu giả lập Kiểm thử (Test Fixtures & Test Mocks):**
   - Vector giả 768 chiều, payload response mẫu từ API bên ngoài, mock record DB đặt trong `tests/fixtures/` hoặc file `*.test.ts`.
   - *Mục đích:* Giúp Unit Test chạy offline, siêu tốc, độc lập với mạng và không tốn quota API.
3. **Giá trị Mặc định An toàn (Sensible Fallback Defaults):**
   - Ví dụ: `const limit = options?.limit ?? DEFAULT_LIMIT;` (trong đó `DEFAULT_LIMIT` là hằng số có tên rõ nghĩa, không phải giá trị ngầm định vô danh).

---

### 🟢 Điều kiện Kiểm soát khi Hardcode Tạm thời
- **Gắn cờ nhận diện:** Bắt buộc có chú thích `// TODO(mock): Thay thế bằng API thực tế khi sang Lát cắt Tích hợp`.
- **Cô lập vị trí:** Dữ liệu mock chỉ nằm trong thư mục `tests/` hoặc `mocks/`, tuyệt đối không lọt vào source code production (`src/`).
- **Nghiệm thu chuyển đổi:** Trước khi hoàn thành Lát cắt Cuối cùng (Integration Slice), toàn bộ mock tạm thời ở tầng giao tiếp dữ liệu phải được thay thế bằng kết nối thực tế.
