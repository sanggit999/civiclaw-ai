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

# Quy tắc Spec-Driven Development (SDD)

> **Triết lý:**
> - `spec`  = Cái gì & Vì sao & Tiêu chí nghiệm thu (Given-When-Then). Clarify trước, cấm đoán mò.
> - `plan`  = Thế nào (Kiến trúc & Giải pháp kỹ thuật).
> - `tasks` = Chia nhỏ danh sách việc (- [ ] t1), review xong mới tích (- [x]).
> - `tests` = Viết test trước, code sau (TDD).
> - `code`  = Thực thi vừa đủ để pass test. Code chạy theo spec, không phải spec chạy theo code.
>
> 💡 *Nguyên tắc vàng: "5 phút viết spec thay vì 5 ngày ngồi sửa".*

## Cấu trúc Đóng gói Tính năng (`specs/NNN-xxx/`)
Mỗi tính năng mới bắt buộc tạo một thư mục `specs/NNN-<tên-tính-năng>/` chứa trọn gói:
- `spec.md`
- `plan.md`
- `tasks.md`
- `tests/<tên-tính-năng>.test.ts`
