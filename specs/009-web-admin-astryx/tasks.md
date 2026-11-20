# BƯỚC 4: CHIA LÁT DỌC (VERTICAL SLICING) — CỔNG QUẢN TRỊ ASTRYX (WEB ADMIN)

---

## Lát 1: Khởi Tạo Dự Án & Thiết Lập Astryx Design System (Core Setup)
- [x] `t9.1.1` Tạo cấu trúc thư mục `admin/` kèm `package.json`, `tsconfig.json`, `next.config.mjs`.
- [x] `t9.1.2` Cài đặt dependencies: `next@^15.0.0`, `react@^19.0.0`, `react-dom@^19.0.0`, `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@stylexjs/stylex`, `@astryxdesign/cli`.
- [x] `t9.1.3` Chạy lệnh `npx @astryxdesign/cli init` trong thư mục `admin/` để sinh Agent Docs và khám phá conventions.
- [x] `t9.1.4` Cấu hình Root Layout `admin/app/layout.tsx` nạp các styles pre-compiled của Astryx (`reset.css`, `astryx.css`, `theme.css`, `fonts.css`).
- [x] **Lệnh kiểm tra Lát 1:** `cd admin && npm run build` (PASS: exit code 0)

---

## Lát 2: Dashboard Quản Trị & Kết Nối Gateway Health (Dashboard Slice)
- [x] `t9.2.1` Triển khai `admin/lib/api-client.ts`: Wrapper gọi các endpoint Central API Gateway (`http://localhost:3000`).
- [x] `t9.2.2` Triển khai `admin/components/AdminShell.tsx`: Khung điều hướng chuẩn Astryx AppShell với TopNav và SideNav (Zero `<div>`).
- [x] `t9.2.3` Triển khai `admin/components/StatCard.tsx`: Thẻ hiển thị số liệu thống kê bằng Astryx Card, Typography, Badge.
- [x] `t9.2.4` Triển khai trang Dashboard chính `admin/app/page.tsx`: Hiển thị trạng thái Gateway thời gian thực, uptime, và các lối tắt nhanh.
- [x] **Lệnh kiểm tra Lát 2:** `cd admin && npm run build` (PASS: exit code 0)

---

## Lát 3: Tra Cứu & Trình Duyệt Kho Luật 4.715 Chunks (Laws Browser Slice)
- [x] `t9.3.1` Triển khai trang `admin/app/laws/page.tsx`:
  - Thanh tìm kiếm từ khóa kết hợp chọn domain (Giao thông, Lao động, BHXH, Nhà ở, Dân sự).
  - Bảng danh sách kết quả tra cứu gọi API Gateway `POST /api/v1/search`.
  - Hiển thị đầy đủ số hiệu, điều, khoản, điểm, và nội dung trích dẫn qua Astryx Table.
- [x] **Lệnh kiểm tra Lát 3:** `cd admin && npm run build` (PASS: exit code 0)

---

## Lát 4: Hàng Đợi Câu Hỏi Chưa Có Luật & Cấu Hình Động (Gaps & Configs Slice)
- [x] `t9.4.1` Triển khai trang `admin/app/gaps/page.tsx`:
  - Danh sách câu hỏi công dân từ `unresolved_queries`, sắp xếp theo `hit_count` giảm dần.
  - Nút chuyển trạng thái (`unreviewed` -> `resolved` / `ignored`).
- [x] `t9.4.2` Triển khai trang `admin/app/configs/page.tsx`:
  - Trình xem và chỉnh sửa JSON cấu hình `system_configs` (search weights, confidence threshold, stop words).
- [x] **Lệnh kiểm tra Lát 4:** `cd admin && npm run build` (PASS: exit code 0)

---

## Lát 5: Kiểm Thử Tích Hợp & Thẩm Định Độc Lập (Code Review Gate)
- [x] `t9.5.1` Viết kiểm thử tự động xác minh giao tiếp client-gateway: `specs/009-web-admin-astryx/tests/admin-api.test.ts` (PASS: 7/7 tests).
- [x] `t9.5.2` Kiểm tra build toàn diện cả backend và frontend: `npm test` ngoài root (146/146 tests passing) và `npm run build` trong `admin/` (4 routes static 100%).
- [x] `t9.5.3` Thực hiện Code Review độc lập theo chuẩn SDD (sử dụng subagent reviewer - PASS).
- [x] `t9.5.4` Cập nhật `README.md` lộ trình Phase 2, commit và push lên GitHub.
