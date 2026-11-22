# BƯỚC 4: CHIA LÁT DỌC (VERTICAL SLICING) — XÁC THỰC CỔNG QUẢN TRỊ (WEB ADMIN AUTH)

---

## Lát 1: Lõi Dịch Vụ Xác Thực & Quản Lý Token Phiên (Auth Core Service Slice)
- [x] `t10.1.1` Định nghĩa Types và Config Interfaces (`admin/lib/auth-types.ts`): `AdminUser`, `AdminSessionPayload`, `AdminAuthConfig`, `DEFAULT_AUTH_CONFIG`.
- [x] `t10.1.2` Viết Unit Tests TDD trong `specs/010-admin-authentication/tests/admin-auth.test.ts`:
  - Xác thực đúng email/password mặc định -> Thành công.
  - Xác thực sai mật khẩu hoặc định dạng email rỗng -> Thất bại kèm mã lỗi.
  - Ký và xác thực session token bảo mật (toàn vẹn dữ liệu, kiểm tra hạn `expiresAt`).
  - Kiểm tra tính linh hoạt cấu hình: Không hardcode credentials cố định.
- [x] `t10.1.3` Triển khai `admin/lib/auth-service.ts` và `admin/lib/auth-edge.ts` (HMAC-SHA256, hỗ trợ Supabase Auth và Local Fallback).
- 👉 **Lệnh kiểm tra Lát 1:** `npx vitest run specs/010-admin-authentication/tests/admin-auth.test.ts -t "Auth Core Service"` (PASS: 7/7 tests)

---

## Lát 2: Bộ API Routes Quản Lý Phiên Đăng Nhập (Auth API Routes Slice)
- [x] `t10.2.1` Triển khai `admin/app/api/auth/login/route.ts`:
  - Nhận `{ email, password }`, kiểm tra qua `auth-service`.
  - Thiết lập cookie `admin_session` an toàn (`httpOnly: true`, `sameSite: 'lax'`, `path: '/'`).
- [x] `t10.2.2` Triển khai `admin/app/api/auth/logout/route.ts`:
  - Xóa cookie `admin_session` (`maxAge: 0`) và trả về `{ success: true }`.
- [x] `t10.2.3` Triển khai `admin/app/api/auth/me/route.ts`:
  - Đọc cookie `admin_session`, xác thực token và trả về thông tin `AdminUser` hiện tại.
- [x] `t10.2.4` Viết Integration Tests kiểm chứng các API routes.
- 👉 **Lệnh kiểm tra Lát 2:** `npx vitest run specs/010-admin-authentication/tests/admin-auth.test.ts -t "Auth API Routes"` (PASS: 6/6 tests)

---

## Lát 3: Chốt Chặn Middleware Bảo Vệ Đường Dẫn (Route Protection Middleware Slice)
- [x] `t10.3.1` Triển khai `admin/middleware.ts`:
  - Đọc cookie `admin_session` qua `auth-edge.ts`.
  - Chặn và chuyển hướng người dùng chưa đăng nhập về `/login?redirect=...`.
  - Tự động chuyển hướng người dùng đã đăng nhập từ `/login` về `/`.
  - Bỏ qua các đường dẫn tĩnh (`_next/*`, `favicon.ico`, static files) và API auth (`/api/auth/*`).
- [x] `t10.3.2` Bổ sung Unit Tests kiểm chứng logic phân luồng của Middleware.
- 👉 **Lệnh kiểm tra Lát 3:** `npx vitest run specs/010-admin-authentication/tests/admin-auth.test.ts -t "Route Protection Middleware"` (PASS: 5/5 tests)

---

## Lát 4: Giao Diện Đăng Nhập Astryx & Tích Hợp Header (UI & Profile Slice)
- [x] `t10.4.1` Triển khai trang đăng nhập `admin/app/login/page.tsx`:
  - Giao diện đăng nhập hiện đại dùng Astryx Card, TextInput, Button, Badge, Banner.
  - Xử lý submit, loading spinner và hiển thị thông báo lỗi trực quan.
- [x] `t10.4.2` Nâng cấp `admin/components/AdminShell.tsx`:
  - Ẩn toàn bộ SideNav và TopNav khi ở trang `/login`.
  - Gọi `/api/auth/me` để hiển thị đúng thông tin user thật (email, role, avatar).
  - Bổ sung nút "Đăng xuất" tiện lợi với thao tác 1 chạm.
- 👉 **Lệnh kiểm tra Lát 4:** `cd admin && npm run build` (PASS: exit code 0)

---

## Lát 5: Kiểm Thử Tích Hợp & Thẩm Định Độc Lập (Code Review Gate)
- [x] `t10.5.1` Chạy toàn bộ test suite hệ thống: `npm test` ngoài thư mục gốc (167/167 tests pass 100%).
- [x] `t10.5.2` Kiểm tra build toàn diện frontend Web Admin: `cd admin && npm run build` (17/17 static & dynamic routes compiled).
- [x] `t10.5.3` Rà soát checklist Chống Hardcode: Không có secrets/passwords trong code production, nạp qua `.env` an toàn.
- [x] `t10.5.4` Kích hoạt Code Review độc lập xác nhận kết luận PASS.
- 👉 **Lệnh kiểm tra Lát 5:** `npm test && cd admin && npm run build` (ALL GREEN)
