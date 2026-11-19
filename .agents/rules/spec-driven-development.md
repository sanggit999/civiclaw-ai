---
trigger: always_on
---
<!--
================================================================================
⚠️ CẢNH BÁO: FILE NÀY ĐƯỢC TỰ ĐỘNG SINH (AUTO-GENERATED) TỪ .claude/
TUYỆT ĐỐI KHÔNG SỬA TAY FILE NÀY!
Chỉnh sửa bản gốc tại: .claude/rules/spec-driven-development.md
Sau đó chạy: npm run sync (hoặc python3 -I scripts/sync-ai-config.py)
================================================================================
-->

# Quy chuẩn Spec-Driven Development (SDD) — Khung 4 Bước

> **Triết lý cốt lõi:**
> *"5 phút viết spec thay vì 5 ngày ngồi sửa".*  
> Code sinh ra phải phục vụ Spec, phát triển theo lát cắt dọc (Vertical Slicing) để lát nào xong kiểm tra được ngay lát đó, tuyệt đối không làm theo tầng ngang (Horizontal Layering) gây nợ tích hợp.

---

## 4 Bước Bắt Buộc Cho Mọi Tính Năng

### Bước 1: Product Review (Đặc tả Sản phẩm trong `spec.md`)
1. **Vấn đề (Problem Statement):** Người dùng hoặc hệ thống đang gặp khó khăn gì?
2. **Hành vi mong muốn (Desired Behavior):** Kỳ vọng hệ thống giải quyết vấn đề như thế nào? Kèm tiêu chí nghiệm thu BDD (`Given-When-Then`).
3. **Mock-up:** Bản dựng giao diện trực quan (ASCII / Mermaid / Luồng hội thoại mẫu giữa Người dùng và Bot).

### Bước 2: Kiến trúc (System Architecture trong `plan.md`)
1. **Hợp đồng giữa các component (Component Contracts):** Input, Output, Giao thức truyền tin giữa các thành phần.
2. **Mô hình Dữ liệu (Data Model):** Cấu trúc bảng Database, Schema, DTOs.
3. **Ràng buộc & Ranh giới bất biến (Invariants & Red Lines):** Các điều kiện an toàn, bảo mật, xác thực tại trust boundary và cơ chế xử lý sự cố (Fallback Boundaries).

### Bước 3: Program Design (Thiết kế Chi tiết Mã nguồn trong `plan.md`)
1. **Types & Interfaces:** Định nghĩa kiểu dữ liệu chặt chẽ trong TypeScript.
2. **Signatures:** Tên hàm, tham số đầu vào, kiểu trả về của các Class/Functions.
3. **Call Graph:** Sơ đồ luồng gọi hàm qua lại giữa các module bằng sơ đồ Mermaid (ai gọi ai, xử lý rẽ nhánh lỗi).

### Bước 4: Chia Lát Dọc (Vertical Slicing trong `tasks.md`)
* Tuyệt đối không chia theo tầng ngang (ví dụ: làm toàn bộ DB -> làm toàn bộ API -> làm toàn bộ UI).
* **Chia theo Lát cắt Dọc (Vertical Slices):** Mỗi lát cắt đi xuyên từ Input -> Logic -> Output và **BẮT BUỘC có lệnh kiểm thử độc lập (Test Verification Command)** để xong lát nào nghiệm thu ngay lát đó:
  - **Lát 1 (Core Slice):** Luồng đi thẳng thành công tối thiểu (Happy Path E2E).
  - **Lát 2 (Resilience Slice):** Xử lý ngoại lệ, Fallback Guard, chặn lỗi.
  - **Lát 3 (Optimization Slice):** Khử trùng lặp, tối ưu hiệu năng hoặc tích hợp mở rộng.

---

## Cấu Trúc Đóng Gói Thư Mục Tính Năng (`specs/NNN-xxx/`)
Mỗi tính năng mới bắt buộc tạo một thư mục `specs/NNN-<tên-tính-năng>/` chứa trọn gói:
- `spec.md` (Chứa Bước 1: Product Review)
- `plan.md` (Chứa Bước 2: Kiến trúc & Bước 3: Program Design)
- `tasks.md` (Chứa Bước 4: Chia lát dọc với lệnh kiểm tra cho từng slice)
- `tests/<tên-tính-năng>.test.ts` (Bộ kiểm thử tương ứng cho từng slice)
