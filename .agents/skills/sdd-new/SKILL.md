---
name: sdd-new
description: Lệnh Khởi tạo Tính năng mới (SDD)
---
<!--
================================================================================
⚠️ CẢNH BÁO: FILE NÀY ĐƯỢC TỰ ĐỘNG SINH (AUTO-GENERATED) TỪ .claude/
TUYỆT ĐỐI KHÔNG SỬA TAY FILE NÀY!
Chỉnh sửa bản gốc tại: .claude/commands/sdd/new.md
Sau đó chạy: npm run sync (hoặc python3 -I scripts/sync-ai-config.py)
================================================================================
-->

# Lệnh Khởi tạo Tính năng mới (SDD)

Mô tả: Tự động khởi tạo thư mục specs/NNN-xxx/ mới từ TEMPLATE và hướng dẫn các bước Clarify.

## Các bước thực hiện:
1. Đọc danh sách các thư mục trong `specs/` để lấy số thứ tự lớn nhất `NNN`.
2. Tạo thư mục `specs/<NNN+1>-<feature_name>/` từ `specs/TEMPLATE/`.
3. Hỏi người dùng các câu hỏi Clarify để điền vào `spec.md`.
