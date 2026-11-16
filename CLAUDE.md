# CLAUDE.md - Tóm tắt Dự án cho Claude Code

## 1. Giới thiệu Dự án
**CivicLaw AI** là hệ thống trợ lý AI hỗ trợ công dân và cơ quan pháp lý, phát triển theo tôn chỉ minh bạch, chính xác và có thể kiểm chứng.

---

## 2. Quy chuẩn Cốt lõi: Spec-Driven Development (SDD)
Mọi tính năng hoặc logic mới **BẮT BUỘC** phải tuân theo luồng 5 bước:
`spec -> plan -> tasks -> tests -> code`

* **Cấu trúc lưu trữ:** Mỗi tính năng được đóng gói trọn vẹn trong thư mục `specs/NNN-<tên-tính-năng>/`:
  - `spec.md`: Cái gì & Vì sao & Clarify (không đoán mò) & Tiêu chí nghiệm thu (Given-When-Then).
  - `plan.md`: Thế nào (Kiến trúc, Data models, Luồng dữ liệu).
  - `tasks.md`: Chia việc thành các mục nhỏ (`- [ ] t1`), chỉ review và test pass mới tích (`- [x]`).
  - `tests/<tên>.test.ts`: Viết kiểm thử trước khi viết mã (TDD).
* **Quy tắc vàng:** *"5 phút viết spec thay vì 5 ngày ngồi sửa"*. Tuyệt đối không sửa spec để hợp thức hóa code sai.

---

## 3. Triết lý Lập trình Tối giản: Ponytail (The 7-Rung Ladder)
> *"The best code is the code you never wrote."*  
> Mỗi dòng code mới đều là một nợ kỹ thuật (technical liability). Khi chuyển từ `tasks -> tests -> code`, Claude **BẮT BUỘC** kiểm tra tuần tự và dừng lại ở bậc đầu tiên thỏa mãn:

1. **YAGNI (You Aren't Gonna Need It):** Tính năng có thực sự cần thiết lúc này không? Tuyệt đối không đoán mò nhu cầu tương lai.
2. **Reuse (Tái sử dụng):** Tìm kiếm trong codebase trước. Không viết lại helper, utility hoặc type đã có sẵn.
3. **Stdlib (Thư viện chuẩn):** Tận dụng tối đa API/methods có sẵn của TypeScript/JavaScript và Node.js.
4. **Platform Native:** Dùng HTML5/CSS, OS primitives, hoặc Database constraints thay vì viết JS/code ứng dụng.
5. **Installed Dependencies:** Chỉ dùng thư viện đã khai báo trong `package.json`. Tuyệt đối không cài thêm package mới.
6. **One-liner:** Nếu biểu thức logic có thể viết ngắn gọn, rõ nghĩa trong 1 dòng thì giữ nguyên 1 dòng.
7. **Minimum Viable Code:** Chỉ viết lượng code vừa đủ để vượt qua các bộ test kiểm thử (pass test theo spec).

* **Sửa bug:** Tìm và sửa nguyên nhân gốc (root cause) ở hàm chia sẻ, không vá víu tại từng caller.
* **Red Lines bất khả xâm phạm:** Không bao giờ cắt giảm input validation tại trust boundary, xử lý lỗi (error handling), bảo mật và an toàn dữ liệu.

---

## 4. Kiến trúc Cấu hình AI: 1 Bản Gốc - 2 Bản Sinh
- **Bản gốc (Single Source of Truth):** Thư mục `.claude/`. Mọi chỉnh sửa về skills, rules, agents **chỉ thực hiện ở đây**.
- **Đồng bộ:** Sau khi cập nhật `.claude/`, chạy lệnh đồng bộ để tự động sinh cấu hình cho Codex và Antigravity:
  ```bash
  npm run sync        # hoặc: python3 -I scripts/sync-ai-config.py
  ```
- **Không sửa tay:** Tuyệt đối không sửa tay trong `.agents/` và `.codex/agents/`.

---

## 5. Lưu ý Vận hành Quan trọng (Gotchas)
1. **Mở đúng thư mục gốc:** Luôn mở IDE/terminal tại thư mục gốc dự án, không mở trong thư mục con để AI không bị mất gốc `AGENTS.md`.
2. **Trust Codex:** Đảm bảo dự án được trust trong `~/.codex/config.toml` thì Codex mới nạp `.codex/`.
3. **Vị trí Skills:** Skills của Codex nằm tại `.agents/skills/`, không nằm trong `.codex/skills/`.
4. **Chuẩn thư mục:** Luôn dùng `.agents/` (số nhiều).
5. **Dọn dẹp:** Bản backup cũ tại `tmp/ai-config-backup-2026-11-11/` có thể xóa khi hệ thống mới chạy ổn định.

---

## 6. Lệnh thường dùng
* Chạy kiểm thử: `npm test`
* Kiểm thử liên tục: `npm run test:watch`
* Đồng bộ cấu hình AI: `npm run sync`
