# AGENTS.md - Tóm tắt Dự án cho Codex & Antigravity

## 1. Giới thiệu Dự án
**CivicLaw AI** là hệ thống trợ lý AI hỗ trợ công dân và cơ quan pháp lý, phát triển theo tôn chỉ minh bạch, chính xác và có thể kiểm chứng.

### 📌 Lộ Trình 2 Giai Đoạn (Two-Phase Evolution)
* **Giai đoạn 1 (Core Foundation - Grounded Legal Assistant):** Tập trung vào kho dữ liệu 5 bộ luật chính thống trên PostgreSQL `pgvector`, tìm kiếm Hybrid (`vector + tsvector`) và luồng hỏi đáp trích dẫn 100% nguồn luật (`specs/002` đến `specs/005`).
* **Giai đoạn 2 (Agentic Evolution - AI Agent & Contract Auditor):** Nâng cấp thành AI Agent tự chủ với cơ chế Tool Calling, vòng lặp ReAct và rà soát hợp đồng cá nhân (`specs/006`).
> **Nguyên tắc phân kỳ:** Bắt buộc hoàn thiện vững chắc Giai đoạn 1 trước khi mở rộng sang Giai đoạn 2. Không làm tắt.

---

## 2. Quy chuẩn Cốt lõi: Spec-Driven Development (SDD)
Mọi tính năng hoặc logic mới **BẮT BUỘC** tuân thủ luồng:
`spec -> plan -> tasks -> tests & code -> review`

* **Cấu trúc đóng gói (`specs/NNN-<tên-tính-năng>/`):**
  - `spec.md`: Cái gì & Vì sao & Clarify (không đoán mò) & BDD criteria (Given-When-Then).
  - `plan.md`: Thế nào (Kiến trúc, Data models, Luồng dữ liệu, Config Interfaces).
  - `tasks.md`: Chia nhỏ việc theo lát cắt dọc (`- [ ] t1`), chỉ review và test pass mới tích (`- [x]`).
  - `tests/<tên>.test.ts`: Viết kiểm thử trước khi viết mã (TDD).
* **Nguyên tắc vàng:** *"5 phút viết spec thay vì 5 ngày ngồi sửa"*. Tuyệt đối không sửa spec để hợp thức hóa code sai.
* **Chốt chặn Code Review bắt buộc (Code Review Gate):**
  - Khi hoàn thành tất cả tasks của spec và `npm test` đã XANH:
    - **Antigravity:** Chạy `/code-review` (zero-setup, có sẵn trong repo tại `.agents/skills/code-review/`) hoặc `/requesting-code-review` (nâng cao, nếu máy đã cài plugin Superpowers).
    - **Claude Code:** Chạy `/code-review` (tự động nạp từ `.claude/commands/code-review.md` trong repo, không cần plugin).
    - **Codex:** Chạy `/review` (lệnh built-in của Codex CLI) hoặc dispatch `@code-reviewer` (tự sinh tại `.codex/agents/code-reviewer.toml`).
  - Chỉ được đóng spec và merge khi reviewer xác nhận **PASS** và xử lý triệt để các phát hiện Critical/Important.

---

## 3. Triết lý Lập trình Tối giản: Ponytail (The 7-Rung Ladder)
> *"The best code is the code you never wrote."*  
> Code sinh ra phải phục vụ Spec, tối giản tối đa để giảm thiểu nợ kỹ thuật. Codex và Antigravity **BẮT BUỘC** dừng lại ở bậc đầu tiên thỏa mãn:

1. **YAGNI:** Tính năng có cần lúc này không? Không đoán mò nhu cầu tương lai.
2. **Reuse:** Codebase đã có helper/util tương tự chưa? Ưu tiên tái sử dụng.
3. **Stdlib:** Tận dụng tối đa API/methods có sẵn của TypeScript/JavaScript và Node.js.
4. **Platform Native:** Dùng HTML5/CSS, OS primitives, hoặc DB constraints thay vì custom JS.
5. **Installed Dependencies:** Chỉ dùng thư viện trong `package.json`. Không cài thêm package mới.
6. **One-liner:** Viết 1 dòng ngắn gọn nếu rõ nghĩa, dễ đọc.
7. **Minimum Viable Code:** Chỉ viết lượng code vừa đủ để pass test theo spec.

* **Sửa bug:** Sửa nguyên nhân gốc (root cause) ở hàm dùng chung, không vá tại callers.
* **Red Lines:** Không bao giờ cắt giảm validation, xử lý lỗi, bảo mật và an toàn dữ liệu.
* **Chính sách Không Hardcode (Anti-Hardcode):**
  - **Tuyệt đối cấm:** API keys, secrets, DB URLs, đường dẫn tuyệt đối máy cá nhân, số ma thuật/chuỗi ma thuật trong code production `src/` (bắt buộc dùng `.env` hoặc Config/Options object).
  - **Tạm thời cho phép (cô lập):** Dữ liệu mẫu minh họa trong Mock-up (`spec.md`) và Test Fixtures/Mocks trong thư mục `tests/` để phục vụ test offline độc lập. Tuyệt đối không để lọt vào mã nguồn production.

---

## 4. Kiến trúc Cấu hình AI: 1 Bản Gốc - 2 Bản Sinh
- **Bản gốc (Master Source of Truth):** Thư mục `.claude/`. Mọi chỉnh sửa về skills, rules, agents **chỉ thực hiện ở đây**.
- **Bản tự sinh (Auto-generated):**
  - `.agents/skills/`: Cho Codex + Antigravity.
  - `.agents/rules/`: Cho Antigravity.
  - `.codex/agents/`: Cho Codex.
  - `.codex/config.toml`: Cấu hình riêng cho Codex (viết tay, không bị ghi đè).
- **Đồng bộ:** Sau khi sửa `.claude/`, chạy `npm run sync` (hoặc `python3 scripts/sync-ai-config.py`). Không sửa tay trong thư mục tự sinh.

---

## 5. Lưu ý Vận hành Quan trọng (Gotchas)
1. **Mở đúng thư mục gốc:** Luôn mở IDE/terminal tại thư mục gốc dự án để không mất gốc `AGENTS.md`.
2. **Trust Codex:** Đảm bảo dự án được trust trong `~/.codex/config.toml` để nạp `.codex/`.
3. **Vị trí Skills:** Skills của Codex nằm tại `.agents/skills/`, không nằm trong `.codex/skills/`.
4. **Chuẩn thư mục:** Luôn dùng `.agents/` (số nhiều).
5. **Dọn dẹp:** Bản backup cũ tại `tmp/ai-config-backup-2026-11-11/` có thể xóa khi ổn định.

---

## 6. Lệnh thường dùng
* Chạy kiểm thử: `npm test`
* Kiểm thử liên tục: `npm run test:watch`
* Đồng bộ cấu hình AI: `npm run sync`
