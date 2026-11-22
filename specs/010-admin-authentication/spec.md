# BƯỚC 1: PRODUCT REVIEW — XÁC THỰC & BẢO MẬT CỔNG QUẢN TRỊ (WEB ADMIN AUTHENTICATION)

---

## 1. Vấn đề (Problem Statement)

### Đối tượng gặp vấn đề:
* **Quản trị viên Hệ thống (System Admins):** Cần bảo vệ các cấu hình nhạy cảm (`system_configs`), theo dõi sức khỏe gateway và ngăn chặn truy cập trái phép.
* **Chuyên viên Pháp lý & Kiểm duyệt viên (Legal Curators):** Cần danh tính xác thực rõ ràng khi rà soát và cập nhật trạng thái các câu hỏi công dân (`unresolved_queries`).
* **Hệ thống & Toàn bộ Người dùng:** Dữ liệu lịch sử chat, các chunks luật và cấu hình trọng số AI không được phép để lộ công khai cho bất kỳ ai truy cập internet.

### Nỗi đau thực tế (Pain Points):
1. **Lỗ hổng Truy cập Không Xác thực (Zero Authentication Vulnerability):**
   - Hiện tại toàn bộ ứng dụng Web Admin (`admin/`) đang mở công khai (open-access).
   - Bất kỳ ai mở trình duyệt đến `http://localhost:3000` hoặc domain triển khai đều có thể xem toàn bộ 4.715 chunks luật, chỉnh sửa các tham số hệ thống (`confidence_threshold`, `search_weights`), và xóa/sửa dữ liệu mà không cần bất kỳ bước đăng nhập nào.
2. **Thiếu Màn hình Đăng nhập Chuẩn Doanh nghiệp (Enterprise Login):**
   - Chưa có giao diện đăng nhập bảo mật đồng bộ với hệ thống thiết kế **Astryx Design System**.
   - Thanh điều hướng Header (`AdminShell.tsx`) hiện đang gán avatar và thông tin danh tính tĩnh ("Superadmin").
3. **Nguy cơ Rò rỉ Thông tin & Thao tác Trái phép:**
   - Nếu không có cơ chế Route Protection Middleware và quản lý phiên (Session Management), hệ thống không thể phân quyền (RBAC) hoặc ghi nhận nhật ký ai đã thay đổi cấu hình.

### Hậu quả nếu không làm:
* Hệ thống quản trị đối mặt với rủi ro bảo mật nghiêm trọng; cấu hình AI RAG có thể bị phá hoại hoặc thao túng; thông tin tra cứu riêng tư của công dân có nguy cơ bị lộ lọt.

---

## 2. Hành vi Mong muốn (Desired Behavior)

Xây dựng hệ thống xác thực người dùng và bảo vệ đường dẫn toàn diện cho Web Admin:

1. **Màn hình Đăng nhập Chuẩn Astryx (`/login`):**
   - Giao diện đăng nhập hiện đại, tối giản theo chuẩn Design System Astryx (Card, Form, Input, Button, Alert).
   - Hỗ trợ nhập Email và Mật khẩu có kiểm tra tính hợp lệ (Form Validation).
   - Hiển thị thông báo lỗi rõ ràng khi sai thông tin hoặc tài khoản bị khóa.

2. **Cơ chế Xác thực Kép Linh hoạt (Dual Auth Provider):**
   - **Chế độ Supabase Cloud Auth:** Sử dụng `supabase.auth.signInWithPassword` để xác thực người dùng dựa trên cơ sở dữ liệu Supabase đã tích hợp.
   - **Chế độ Fallback An toàn (Offline / Local Dev):** Khi chưa cấu hình Supabase hoặc chạy kiểm thử offline, hệ thống cho phép xác thực qua tài khoản Admin mặc định được cấu hình an toàn qua biến môi trường (`ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_PASSWORD`), tuyệt đối không hardcode mật khẩu trong mã nguồn.

3. **Quản lý Phiên Bảo mật (Secure Session Cookie):**
   - Sau khi đăng nhập thành công, hệ thống cấp phát Cookie phiên làm việc bảo mật (HTTP-Only, SameSite=Lax, Secure trên production).
   - Cung cấp các API Routes nội bộ:
     - `POST /api/auth/login`: Xác thực credentials và thiết lập session cookie.
     - `POST /api/auth/logout`: Hủy session cookie và đăng xuất an toàn.
     - `GET /api/auth/me`: Kiểm tra danh tính người dùng hiện tại từ cookie.

4. **Chốt chặn Bảo vệ Đường dẫn (Next.js Route Protection Middleware):**
   - Tệp `middleware.ts` kiểm tra cookie phiên trước mọi yêu cầu truy cập:
     - Nếu chưa đăng nhập mà truy cập các trang nội bộ (`/`, `/laws`, `/gaps`, `/configs`, `/sessions`, `/contracts`): Tự động chuyển hướng (Redirect) về `/login`.
     - Nếu đã đăng nhập mà truy cập trang `/login`: Tự động chuyển hướng vào `/`.
     - Cho phép bỏ qua (Bypass) các tài nguyên tĩnh (`_next/static`, `_next/image`, `favicon.ico`, các file CSS/font của Astryx) và API login.

5. **Tích hợp Danh tính Thật trên AdminShell:**
   - Cập nhật Header của `AdminShell.tsx` để hiển thị email, tên hiển thị thật của người dùng và vai trò (`Admin` / `Curator`).
   - Bổ sung nút **Đăng xuất (Sign Out)** tiện lợi, xóa phiên và chuyển hướng về `/login`.

---

## 3. Bản Dựng Giao Diện & Luồng Tương Tác (Mock-up)

### 3.1. Giao diện Đăng nhập (`/login`)
```text
+-------------------------------------------------------------------+
| 🏛️ CIVICLAW AI — HỆ THỐNG QUẢN TRỊ TRUNG TÂM                     |
+-------------------------------------------------------------------+
|                                                                   |
|                      +------------------------+                   |
|                      |   ĐĂNG NHẬP ADMIN      |                   |
|                      |  CivicLaw Portal v1.0  |                   |
|                      +------------------------+                   |
|                      | Email:                 |                   |
|                      | [ admin@civiclaw.vn  ] |                   |
|                      |                        |                   |
|                      | Mật khẩu:              |                   |
|                      | [ ****************   ] |                   |
|                      |                        |                   |
|                      | [ 🔒 ĐĂNG NHẬP NGAY  ] |                   |
|                      +------------------------+                   |
|                      | [!] Vui lòng đăng nhập |                   |
|                      | để truy cập dữ liệu    |                   |
|                      +------------------------+                   |
|                                                                   |
+-------------------------------------------------------------------+
```

### 3.2. Luồng Chuyển hướng & Chốt chặn Middleware
```text
[Người dùng chưa đăng nhập] ---> Truy cập http://localhost:3000/laws
                                        |
                             [Middleware kiểm tra Cookie]
                                        |
                               [Không có Token?]
                                        |
                                        v
                       [Chuyển hướng: /login?redirect=/laws]
                                        |
                             [Nhập đúng Email/Pass]
                                        |
                                        v
                   [Ghi nhận Cookie + Chuyển hướng vào /laws]
```

---

## 4. Làm Rõ & Ràng Buộc Nghiệp Vụ (Clarify - Cấm Đoán Mò)

- [x] **Q1: Cơ chế xác thực chính sử dụng công nghệ gì?**
  - *Trả lời:* Tận dụng thư viện `@supabase/supabase-js` đã có sẵn trong `admin/package.json` kết hợp Next.js Route Handlers và HTTP-only Cookies. Không cài thêm các thư viện cồng kềnh như `next-auth` hay `@supabase/ssr` (tuân thủ Thang 7 bậc Ponytail - YAGNI & Reuse).
- [x] **Q2: Nếu đang chạy offline hoặc chưa kết nối Supabase thì admin đăng nhập như thế nào?**
  - *Trả lời:* Hệ thống cung cấp cơ chế Local Config Fallback: Kiểm tra thông tin đăng nhập với biến môi trường `ADMIN_DEFAULT_EMAIL` và `ADMIN_DEFAULT_PASSWORD` (có giá trị mặc định rõ ràng cho môi trường dev/test, cấu hình độc lập qua `.env`).
- [x] **Q3: Cookie phiên được bảo mật như thế nào?**
  - *Trả lời:* Sử dụng cookie `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, và `maxAge: 7 * 24 * 3600` (7 ngày). Phía client JavaScript không thể đọc trộm cookie này, chống tấn công XSS.
- [x] **Q4: Trang `/login` có bị bọc bởi khung `AdminShell` (Sidebar & TopNav) không?**
  - *Trả lời:* Không. Trang `/login` hiển thị toàn màn hình (Centered Card Layout), không hiển thị SideNav hay TopNav của hệ thống quản trị để đảm bảo trải nghiệm đăng nhập sạch sẽ và bảo mật.

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria / BDD Scenarios)

### Kịch bản 1: Đăng nhập thành công với thông tin hợp lệ (Happy Path)
* **Given (Cho trước):** Người dùng chưa đăng nhập, đang ở trang `/login`.
* **When (Khi):** Nhập email và mật khẩu chính xác, nhấn nút "Đăng nhập".
* **Then (Thì):** Hệ thống trả về mã `200 OK`, thiết lập HTTP-only cookie `admin_session`, và chuyển hướng người dùng vào trang Dashboard `/`.

### Kịch bản 2: Từ chối đăng nhập khi sai mật khẩu hoặc thiếu trường (Invalid Credentials)
* **Given (Cho trước):** Người dùng ở trang `/login`.
* **When (Khi):** Nhập sai mật khẩu hoặc để trống email.
* **Then (Thì):** Hệ thống trả về mã lỗi `401 Unauthorized` (hoặc `400 Bad Request`), hiển thị thông báo lỗi trực quan trên giao diện và không cấp phát cookie.

### Kịch bản 3: Chốt chặn Middleware bảo vệ các đường dẫn nội bộ (Route Protection Guard)
* **Given (Cho trước):** Người dùng chưa đăng nhập (không có cookie hợp lệ).
* **When (Khi):** Cố gắng truy cập trực tiếp vào `/laws`, `/gaps`, `/configs`, hoặc `/sessions`.
* **Then (Thì):** Middleware chặn yêu cầu và chuyển hướng người dùng về `/login?redirect=...`.

### Kịch bản 4: Tự động chuyển hướng khi người dùng đã đăng nhập (Already Authenticated)
* **Given (Cho trước):** Người dùng đã đăng nhập thành công và sở hữu cookie hợp lệ.
* **When (Khi):** Mở đường dẫn `/login`.
* **Then (Thì):** Middleware nhận diện phiên hợp lệ và tự động chuyển hướng người dùng về trang chủ `/`.

### Kịch bản 5: Đăng xuất an toàn và hủy phiên (Sign Out)
* **Given (Cho trước):** Người dùng đang đăng nhập trong hệ thống.
* **When (Khi):** Nhấn nút "Đăng xuất" tại Header hoặc gọi API `POST /api/auth/logout`.
* **Then (Thì):** Hệ thống xóa sạch cookie `admin_session` và chuyển hướng trình duyệt về `/login`.

### Kịch bản 6: Cấu hình linh hoạt — Không Hardcode Thông tin Quản trị
* **Given (Cho trước):** Tài khoản mặc định được truyền qua biến môi trường hoặc options tùy biến.
* **When (Khi):** Hệ thống khởi tạo AuthService.
* **Then (Thì):** Hệ thống đối chiếu chính xác với cấu hình được nạp, không chứa bất kỳ chuỗi mật khẩu hay email nào bị fix cứng trong code `src/` hoặc `admin/`.
