# CivicLaw AI 🏛️⚖️

> **Trợ lý AI Hỗ trợ Pháp lý & Dịch vụ Công cho Công dân**  
> Xây dựng theo tôn chỉ **Minh bạch, Chính xác và Có thể Kiểm chứng**.

---

## 🌟 Tính Năng Nổi Bật của Dự Án

* **Kiến trúc Cấu hình Đa AI (1 Bản Gốc - 2 Bản Sinh):** Một lần viết cấu hình trong `.claude/`, script tự động chuyển đổi định dạng và phân phối cho cả **Claude Code**, **OpenAI Codex** và **Google Antigravity**.
* **Quy chuẩn Spec-Driven Development (SDD):** *"5 phút viết spec thay vì 5 ngày ngồi sửa"*. Mọi nghiệp vụ đều tuân thủ luồng đóng gói:
  $$\text{spec} \longrightarrow \text{plan} \longrightarrow \text{tasks} \longrightarrow \text{tests} \longrightarrow \text{code}$$
* **Triết lý Lập trình Tối giản (Ponytail):** Áp dụng chiếc thang 7 bậc YAGNI, triệt tiêu over-engineering, không sinh code thừa và bảo vệ ranh giới an toàn hệ thống.
* **Kiểm thử TDD Tự động:** Tích hợp `Vitest` quét tự động các bộ test nghiệp vụ theo chuẩn BDD (*Given - When - Then*).
* **Kiến Trúc Đa Nền Tảng (Web Admin + Mobile App User):** Web Admin (Next.js + Shadcn UI) nạp & quản lý văn bản luật; Mobile App (React Native Expo) hỗ trợ công dân tra cứu, voice chat, camera OCR và rà soát hợp đồng qua Central RAG Backend (PostgreSQL `pgvector` + Gemini API).

---

## 🗺️ Lộ Trình Phát Triển 2 Giai Đoạn (Two-Phase Evolution)

Dự án được phân kỳ rạch ròi theo 2 giai đoạn phát triển:

| Giai đoạn | Mục tiêu & Bản chất | Các Module SDD tương ứng | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Giai đoạn 1: Core Foundation**<br>*(Grounded Legal Assistant)* | Xây dựng kho dữ liệu 5 bộ luật chính thống, tìm kiếm kết hợp Hybrid (`pgvector` + `tsvector`), luồng hỏi đáp trích dẫn nguồn 100% không ảo giác, và bộ nhớ phiên hội thoại đa lượt trên Supabase Cloud. | • `specs/001-legal-data-ingestion/`<br>• `specs/002-hybrid-search-fallback/`<br>• `specs/003-supabase-storage/`<br>• `specs/004-grounded-rag-citation/`<br>• `specs/005-chat-session-memory/` | ✅ **Hoàn thành 100%**<br>*(72/72 tests pass)* |
| **Giai đoạn 2: Agentic Evolution**<br>*(Autonomous AI Agent & Contract Auditor)* | Nâng cấp thành AI Agent tự chủ với hộp công cụ (Tool Calling / Function Calling), hệ thống rà soát rủi ro hợp đồng cá nhân (3 mức: Đỏ, Vàng, Xanh), dynamic policy từ DB, bóc tách tài liệu làm sạch nhiễu, quản lý phiên bản hợp đồng ($v_1 \rightarrow v_2 \rightarrow v_3$), đối soát lịch sử thẩm định (Audit Diff Engine), Cổng API Trung tâm Server-Sent Events (SSE) Streaming, Cổng Quản trị Web Admin (Astryx Design System) và Xác thực Bảo vệ Đường dẫn Quản trị viên (Next.js Middleware + Secure Cookies). | • `specs/006-contract-auditor-agent/`<br>• `specs/007-contract-parser-versioning/`<br>• `specs/008-central-api-gateway/`<br>• `specs/009-web-admin-astryx/`<br>• `specs/010-admin-authentication/` | 🚀 **Đang triển khai**<br>*(Đã xong Specs 006 - 010, 167/167 tests pass)* |

---

## 📂 Cấu Trúc Thư Mục Chuẩn

```
civiclaw-ai/
├── CLAUDE.md                            # Tóm tắt dự án cho Claude Code
├── AGENTS.md                            # Tóm tắt dự án cho Codex + Antigravity
├── GEMINI.md                            # Đồng bộ quy chuẩn cho Gemini CLI
├── README.md                            # Hướng dẫn tổng quan dự án
├── package.json                         # Dependencies & Scripts điều khiển
├── vitest.config.ts                     # Cấu hình kiểm thử tự động
│
├── admin/                               # 🖥️ CỔNG QUẢN TRỊ WEB ADMIN (ASTRYX & NEXT.JS 15)
│   ├── app/                             # Next.js App Router (Dashboard, Laws, Gaps, Configs)
│   ├── components/                      # Astryx Components (AdminShell, StatCard - Zero <div>)
│   ├── lib/                             # Central API Client & Proxy
│   └── astryx-themes.ts                 # Cấu hình theme trung tính @astryxdesign/theme-neutral
│
├── docs/                                # 📖 TÀI LIỆU ĐẶC TẢ SẢN PHẨM (BA PERSPECTIVE)
│   ├── PRD.md                           # Tổng quan bài toán, mục tiêu, 2 giai đoạn phát triển
│   └── references/                      # Văn bản đặc tả gốc lưu trữ
│
├── .claude/                             # 🌟 BẢN GỐC (MASTER SOURCE OF TRUTH)
│   ├── rules/                           # Quy tắc dự án (SDD, Ponytail, Gotchas)
│   ├── skills/                          # Kỹ năng mở rộng của Agent
│   ├── commands/                        # Lệnh slash command
│   ├── agents/                          # Định nghĩa Subagent chuyên biệt
│   └── settings.json                    # Cấu hình Claude Code
│
├── .agents/                             # 🤖 TỰ SINH (Cho Codex + Antigravity)
│   ├── rules/                           # Rules có trigger: always_on cho Antigravity
│   └── skills/                          # Skills dùng chung cho cả 2 AI
│
├── .codex/                              # 🤖 TỰ SINH & CẤU HÌNH CHO CODEX
│   ├── config.toml                      # Cấu hình Codex (viết tay, không bị ghi đè)
│   └── agents/                          # Subagents định dạng TOML cho Codex
│
├── scripts/                             # ⚙️ BỘ TOOL ĐỒNG BỘ CẤU HÌNH
│   ├── sync-ai-config.py                # Script đồng bộ bằng Python chuẩn
│   └── sync-ai-config.mjs               # Script đồng bộ bằng Node.js (npm run sync)
│
├── specs/                               # 📦 QUẢN LÝ TÍNH NĂNG ĐÓNG GÓI (SDD)
│   ├── TEMPLATE/                        # Khung mẫu nhân bản tính năng mới
│   │   ├── spec.md                      # [Cái gì & Vì sao & Clarify & BDD criteria]
│   │   ├── plan.md                      # [Thế nào & Kiến trúc kỹ thuật]
│   │   ├── tasks.md                     # [Chia nhỏ việc & Review mới tích]
│   │   └── tests/feature.test.ts        # [Kiểm thử viết trước]
│   │
│   └── (Khởi tạo tính năng mới theo quy chuẩn specs/NNN-<tên-tính-năng>/)
│
└── src/                                 # 💻 MÃ NGUỒN THỰC THI (Code chạy theo spec & tests)
```

---

## 🔄 Cơ Chế Đồng Bộ 1 Bản Gốc - 2 Bản Sinh

Mọi chỉnh sửa về rule, skill, command hoặc agent **chỉ thực hiện trong thư mục `.claude/`**.

```mermaid
flowchart TD
    MASTER[".claude/ (Bản Gốc Duy Nhất)"] --> SYNC["npm run sync\n(hoặc: python3 -I scripts/sync-ai-config.py)"]
    SYNC -->|Copy Skills & Chuyển Commands| SKILLS[".agents/skills/\n(Codex + Antigravity)"]
    SYNC -->|Thêm trigger: always_on| RULES[".agents/rules/\n(Antigravity)"]
    SYNC -->|Biên dịch sang TOML| AGENTS[".codex/agents/*.toml\n(Codex)"]
    
    CODEX_CFG[".codex/config.toml (Viết tay)"] -. Bảo toàn, không ghi đè .-> SYNC
```

---

## ⚡ Bắt Đầu Nhanh (Quick Start)

### 1. Cài đặt môi trường
Yêu cầu Node.js $\ge$ 18 (hoặc Python $\ge$ 3.10):
```bash
npm install
```

### 2. Kiểm thử toàn bộ hệ thống
Chạy test suite tự động bằng Vitest (167 tests):
```bash
npm test
# hoặc kiểm thử liên tục khi code:
npm run test:watch
```

### 3. Khởi chạy Central API Gateway (Port 3000)
```bash
npm run start:api
```
Kiểm tra sức khỏe hệ thống:
```bash
curl http://localhost:3000/api/v1/health
```

### 4. Khởi chạy Cổng Quản Trị Web Admin (Port 3001)
Ứng dụng Web Admin xây dựng trên **Next.js 15** và hệ thống thiết kế **Astryx Design System**:
```bash
cd admin
npm run dev
# Truy cập tại: http://localhost:3001
```

### 5. Đồng bộ cấu hình AI
Sau khi thêm/sửa bất kỳ file nào trong `.claude/`:
```bash
npm run sync
```

---

## 📋 Triết Lý Ponytail: Chiếc Thang 7 Bậc YAGNI

Khi triển khai code thực thi, mọi lập trình viên và AI đều phải dừng lại ở bậc đầu tiên thỏa mãn:

1. **YAGNI:** Tính năng có cần ngay lúc này không? Không phỏng đoán tương lai.
2. **Reuse:** Codebase đã có hàm/type tương tự chưa? Tái sử dụng trước.
3. **Stdlib:** Dùng tính năng built-in của TypeScript/Node.js.
4. **Platform Native:** Dùng HTML5/CSS, OS primitives, hoặc DB constraints.
5. **Installed Dependencies:** Chỉ dùng package đã có trong `package.json`.
6. **One-liner:** Viết 1 dòng ngắn gọn nếu rõ nghĩa, dễ đọc.
7. **Minimum Viable Code:** Chỉ viết lượng code vừa đủ để pass test theo spec.

---

## ⚠️ Lưu Ý Vận Hành Quan Trọng (Gotchas)

1. **Luôn mở workspace tại thư mục gốc:** Không mở terminal/IDE trong thư mục con để tránh việc AI bị mất gốc `AGENTS.md`.
2. **Trust dự án trong Codex:** Khai báo dự án trong `~/.codex/config.toml`:
   ```toml
   [projects."D:/civiclaw-ai"]
   trust = true
   ```
3. **Vị trí Skills:** Codex đọc skills tại `.agents/skills/`, không đọc từ `.codex/skills/`.
4. **Chuẩn thư mục:** Luôn dùng `.agents/` (số nhiều).
