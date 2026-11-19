# Quy chuẩn Cốt lõi của Dự án

> Đọc chi tiết tại [AGENTS.md](file:///d:/civiclaw-ai/AGENTS.md) và [CLAUDE.md](file:///d:/civiclaw-ai/CLAUDE.md).

1. **Spec-Driven Development:** Mọi logic mới bắt buộc theo luồng `spec -> plan -> tasks -> tests & code -> review`. Khi xong spec bắt buộc chạy review (`/code-review` hoặc `/requesting-code-review` trên Antigravity, `/code-review` trên Claude Code, `/review` hoặc `@code-reviewer` trên Codex).
2. **Triết lý Tối giản Ponytail & Chống Hardcode:** Áp dụng thang 7 bậc YAGNI, không sinh code thừa. Tuyệt đối cấm hardcode secrets/endpoints/số ma thuật vào code production (chỉ cho phép mock tạm thời trong Mock-up và Test fixtures cô lập).
3. **Cấu hình 1 Gốc - 2 Sinh:** Chỉ chỉnh sửa trong `.claude/`. Chạy `npm run sync` để tự động cập nhật `.agents/` và `.codex/`.
