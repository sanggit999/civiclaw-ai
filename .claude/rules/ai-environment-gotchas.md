---
trigger: always_on
---
# Lưu ý Vận hành & Bẫy Môi trường Thường gặp (AI Gotchas)

## 1. Mở IDE / Codex tại đúng Thư mục Gốc (Root)
- **Cơ chế:** Codex và Antigravity tìm kiếm `AGENTS.md`, `.agents/` và `.codex/` bằng cách duyệt ngược từ thư mục làm việc đến thư mục chứa `.git` gần nhất.
- **Bẫy:** Nếu mở terminal hoặc IDE bên trong một repo con / subfolder (ví dụ: `services/backend/`), AI sẽ coi thư mục con đó là root và không nhận diện được cấu hình ở gốc dự án.
- **Quy tắc:** Luôn mở workspace tại thư mục gốc của dự án (`d:/civiclaw-ai/`).

## 2. Xác thực Tin cậy Dự án trong Codex (~/.codex/config.toml)
- Codex chỉ nạp các file trong `.codex/` khi đường dẫn dự án được xác thực tin cậy trong cấu hình toàn cục `~/.codex/config.toml`:
  ```toml
  [projects."d:/civiclaw-ai"]
  trust = true
  ```

## 3. Vị trí Đặt Skills cho Codex
- Codex **KHÔNG** đọc từ `.codex/skills/`.
- Cả Codex và Antigravity đều đọc chung skills tại `.agents/skills/` (được tự động sinh từ `.claude/skills/` và `.claude/commands/`).

## 4. Chuẩn Thư mục: .agents/ (Số nhiều)
- Antigravity hỗ trợ backward-compatible với `.agent/` (số ít), nhưng chuẩn hiện đại và thống nhất cho cả Codex + Antigravity là `.agents/` (số nhiều).
- Tuyệt đối không tạo lại thư mục `.agent/`.

## 5. Dọn dẹp Bản Sao lưu Tạm thời (tmp/)
- Các bản cấu hình cũ đã được chuyển sang `tmp/ai-config-backup-2026-11-11/`.
- Khi hệ thống đồng bộ mới đã kiểm thử ổn định, có thể xóa thư mục `tmp/` để giữ repo sạch sẽ.
