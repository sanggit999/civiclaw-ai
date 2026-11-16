---
name: sdd-generator
description: Hướng dẫn khởi tạo một module mới theo quy chuẩn Spec-Driven Development (specs/NNN-xxx/).
---

# SDD Generator Skill

Khi người dùng yêu cầu làm tính năng hoặc logic mới:
1. Đếm số thư mục trong `specs/` để xác định số thứ tự tiếp theo: `NNN` (ví dụ `002`).
2. Sao chép thư mục `specs/TEMPLATE/` sang `specs/NNN-<tên-tính-năng>/`.
3. Hỏi người dùng các câu hỏi Clarify để lấp đầy các điểm mù.
4. Hoàn thiện `spec.md`, `plan.md`, `tasks.md`, viết `tests/` trước rồi mới code `src/`.
