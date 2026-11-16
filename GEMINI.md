# Quy chuẩn Cốt lõi của Dự án

> Đọc chi tiết tại [AGENTS.md](file:///d:/civiclaw-ai/AGENTS.md) và [CLAUDE.md](file:///d:/civiclaw-ai/CLAUDE.md).

1. **Spec-Driven Development:** Mọi logic mới bắt buộc tạo trong `specs/NNN-<tên-tính-năng>/` (`spec.md` -> `plan.md` -> `tasks.md` -> `tests/` -> `src/`).
2. **Triết lý Tối giản Ponytail:** Áp dụng thang 7 bậc YAGNI, không sinh code thừa, tận dụng tối đa stdlib/native, chỉ viết code tối thiểu để pass test.
3. **Cấu hình 1 Gốc - 2 Sinh:** Chỉ chỉnh sửa trong `.claude/`. Chạy `npm run sync` để tự động cập nhật `.agents/` và `.codex/`.
