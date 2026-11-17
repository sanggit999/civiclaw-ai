# CivicLaw AI — Product Requirements Document (PRD)

> **Tài liệu tham chiếu gốc:** [docs/references/raw_specification_and_tech_stack.md](file:///d:/civiclaw-ai/docs/references/raw_specification_and_tech_stack.md)  
> **Góc nhìn (Perspective):** Business Analyst (BA) & High-Level Architecture  
> **Nguyên tắc cốt lõi:** Tài liệu này chỉ cung cấp **Bối cảnh vĩ mô (Macro Context)** và **Yêu cầu sản phẩm**. Mọi thiết kế kỹ thuật chi tiết (Database Schema, Tables, APIs, Code) **bắt buộc phải nằm trong từng `specs/NNN-xxx/`** theo đúng quy chuẩn Spec-Driven Development (SDD).

---

## 1. Bối Cảnh & Mục Tiêu Nghiệp Vụ (Business Context)

### 1.1. Vấn Đề Của Người Dùng (Pain Points)
* **Khó tiếp cận văn bản gốc:** Văn bản luật dài, nhiều thuật ngữ chuyên ngành khiến người dân khó tự tra cứu nhanh trong các tình huống đời sống (bị xử phạt giao thông, nghỉ việc, hưởng BHXH, ký hợp đồng thuê nhà).
* **Rủi ro thông tin lỗi thời:** Tìm kiếm trên mạng dễ gặp các bài viết cũ trích dẫn nghị định/luật đã hết hiệu lực.
* **Hạn chế của AI thông thường (ChatGPT/Gemini thuần):** Dễ gặp tình trạng "ảo giác" (tự suy diễn mức phạt hoặc điều luật không có thật) và không đưa ra được căn cứ pháp lý chính xác.

### 1.2. Giá Trị Cốt Lõi Mang Lại (Value Proposition)
* Cung cấp kênh hỏi đáp bằng ngôn ngữ tự nhiên, trả lời ngắn gọn, dễ hiểu dựa **100% trên kho văn bản pháp luật chính thống** được nạp vào hệ thống.
* Mọi câu trả lời bắt buộc đính kèm trích dẫn cụ thể (*Điều, Khoản, Số hiệu văn bản*) và chỉ truy xuất các quy định đang còn hiệu lực thi hành.
* Hỗ trợ người dùng tải lên hợp đồng cá nhân (thuê trọ, lao động) để tự động rà soát các điều khoản bất lợi hoặc trái quy định hiện hành.

### 1.3. Đối Tượng Người Dùng Mục Tiêu (Target Personas)
1. **Người tham gia giao thông:** Cần tra cứu nhanh mức phạt vi phạm, hình thức xử phạt bổ sung và số điểm bị trừ trên GPLX.
2. **Người lao động:** Cần tìm hiểu quyền lợi hợp đồng lao động, quy định thử việc, tăng ca, trợ cấp thôi việc và chế độ BHXH.
3. **Người đi thuê nhà / Cá nhân giao dịch dân sự:** Cần kiểm tra tính hợp pháp của các điều khoản đặt cọc, phạt cọc, đơn phương chấm dứt hợp đồng trước khi đặt bút ký.

---

## 2. Phạm Vi & Lộ Trình 2 Giai Đoạn (Product Scope & Roadmap)

```mermaid
flowchart LR
    subgraph PHASE1 ["GIAI ĐOẠN 1: CORE MVP\n(Hỏi Đáp Pháp Luật Đời Sống)"]
        FR1["FR-01: Hỏi đáp có trích dẫn nguồn"]
        FR2["FR-02: Phân loại lĩnh vực & Lọc hiệu lực"]
        FR3["FR-03: Hội thoại nối tiếp (Chat Memory)"]
    end

    subgraph PHASE2 ["GIAI ĐOẠN 2: VALUE EXPANSION\n(Rà Soát Hợp Đồng & AI Agent)"]
        FR4["FR-04: Tải lên & Phân tích hợp đồng PDF/DOCX"]
        FR5["FR-05: Đối chiếu điều khoản & Cảnh báo rủi ro 3 mức"]
        AGENT["AI Agent Tool Calling & ReAct Loop"]
    end

    PHASE1 -->|Hoàn thiện nền tảng dữ liệu| PHASE2
```

### 2.1. Giai đoạn 1 — Core MVP (Hỏi đáp Pháp luật Đời sống)
* **FR-01 — Hỏi đáp có trích dẫn (Grounded Legal Q&A):** Người dùng đặt câu hỏi đời sống; hệ thống tìm kiếm các đoạn luật liên quan nhất và tổng hợp câu trả lời kèm nguồn trích dẫn chính xác (*Tên văn bản, Điều, Khoản*).
* **FR-02 — Phân loại & Lọc ngữ cảnh (Domain & Status Filtering):** Cho phép khoanh vùng lĩnh vực tra cứu (Giao thông, Lao động, BHXH, Nhà ở) và tự động loại bỏ các văn bản đã hết hiệu lực.
* **FR-03 — Hội thoại nối tiếp (Contextual Chat Memory):** Ghi nhớ ngữ cảnh trong phiên trò chuyện để hiểu các câu hỏi nối tiếp của người dùng.

### 2.2. Giai đoạn 2 — Mở rộng Giá trị (Contract Reviewer & AI Agent)
* **FR-04 — Tải lên & Phân tích Hợp đồng:** Cho phép người dùng tải lên file hợp đồng cá nhân (PDF/DOCX) và bóc tách thành từng điều khoản riêng lẻ.
* **FR-05 — Đối chiếu & Cảnh báo Rủi ro:** Tự động đối chiếu từng điều khoản với kho luật và đánh dấu 3 mức: Hợp pháp (Xanh), Bất lợi cần đàm phán (Vàng), Trái luật / Vô hiệu (Đỏ).
* **Agentic Capabilities:** Trang bị cơ chế Tool Calling và ReAct loop để trợ lý tự động lập kế hoạch tra cứu và hỏi lại công dân khi thiếu dữ kiện.

### 2.3. Yêu cầu Phi chức năng (Non-Functional Requirements)
* **Độ tin cậy (Groundedness):** Nếu thông tin không nằm trong kho dữ liệu luật, hệ thống phải từ chối trả lời thay vì tự suy đoán.
* **Trải nghiệm phản hồi (Responsiveness):** Hỗ trợ phản hồi dạng luồng chữ chạy dần (Streaming qua SSE).
* **Quyền riêng tư (Privacy):** Tài liệu hợp đồng cá nhân chỉ phục vụ phân tích trong phiên làm việc, không dùng để huấn luyện mô hình.

---

## 3. Nguồn Dữ Liệu Đầu Vào (Reference Data Sources)

Toàn bộ dữ liệu được tải từ **Cổng thông tin điện tử Chính phủ (`vanban.chinhphu.vn`)**:

| Lĩnh vực | Tên văn bản & Số hiệu | Vai trò trong sản phẩm |
| :--- | :--- | :--- |
| **Giao thông (Mức phạt)** | Nghị định 168/2024/NĐ-CP | Tra cứu mức phạt vi phạm giao thông & trừ điểm GPLX. |
| **Giao thông (Luật gốc)** | Luật Trật tự, an toàn giao thông đường bộ 2024 (`36/2024/QH15`) | Quy tắc tham gia giao thông đường bộ hiện hành. |
| **Lao động & Hợp đồng** | Bộ luật Lao động 2019 (`45/2019/QH14`) | Tra cứu quyền lợi người lao động & đối chiếu HĐLĐ. |
| **Bảo hiểm xã hội** | Luật Bảo hiểm xã hội 2024 (`41/2024/QH15`) | Tra cứu chế độ BHXH một lần, thai sản, hưu trí. |
| **Nhà ở & Thuê trọ** | Luật Nhà ở 2023 (`27/2023/QH15`) | Rà soát điều khoản đặt cọc, thuê nhà ở trong hợp đồng. |

---

## 4. Định Hướng Kiến Trúc Đa Nền Tảng (Multi-Client Architecture)

Hệ thống được thiết kế theo mô hình **Central Headless Backend** phục vụ đồng thời cho 2 ứng dụng chuyên biệt:

```mermaid
flowchart TD
    subgraph CLIENTS ["TẦNG GIAO DIỆN (CLIENT APPLICATIONS)"]
        WEB_ADMIN["WEB ADMIN (Dành cho Quản trị viên)\n- Framework: Next.js + Tailwind CSS + Shadcn UI\n- Nhiệm vụ: Nạp văn bản luật (PDF/DOCX), quản lý hiệu lực, giám sát chunking & vector, xem dashboard thống kê"]
        MOBILE_APP["MOBILE APP (Dành cho Công dân / User)\n- Framework: React Native (Expo) + TypeScript\n- Ưu thế Gen AI: Vercel AI SDK, Google Gen AI SDK, streaming SSE mượt mà\n- Tính năng: Tra cứu phạt giao thông, hỏi đáp có trích dẫn, chụp biên bản (Camera OCR), quét hợp đồng rà soát rủi ro"]
    end

    subgraph BACKEND ["TẦNG LÕI & TRÍ TUỆ NHÂN TẠO (CENTRAL AI BACKEND)"]
        API["Central Backend API (TypeScript / Fastify / Node.js)\n- Cung cấp REST API & Server-Sent Events (SSE) Streaming chung"]
        DB[("Cơ sở dữ liệu: PostgreSQL 17 + pgvector (Docker)\n- Lưu trữ hợp nhất: Dữ liệu quan hệ, lịch sử chat & vector embedding")]
        LLM["Mô hình AI: Google Gemini API (gemini-2.5-flash + gemini-embedding-001)\n- Chi phí 0đ, context 1M tokens, xử lý tiếng Việt pháp luật vượt trội"]
        
        API <--> DB
        API <--> LLM
    end

    WEB_ADMIN -->|Quản trị dữ liệu & cấu hình RAG| API
    MOBILE_APP -->|Truy vấn tìm kiếm & nhận streaming phản hồi| API
```

### 4.1. Web Admin Portal (Dành cho Quản trị viên)
* **Framework đề xuất:** **Next.js (React) + Tailwind CSS + Shadcn UI**.
* **Lý do lựa chọn:**
  * Thao tác nạp các tập văn bản luật dài hàng trăm trang, kiểm tra các đoạn phân đoạn (chunking), duyệt ngày hết hiệu lực và xem biểu đồ thống kê **bắt buộc phải thực hiện trên máy tính (Desktop Web)** với chuột và bàn phím.
  * **Shadcn UI** cung cấp sẵn các bộ UI components tối ưu cho Admin: Bảng dữ liệu (`DataTable`), Hộp thoại (`Modals`), Vùng kéo thả file (`Dropzone`), Tabs quản lý trạng thái.

### 4.2. Mobile App (Dành cho Công dân / End-User)
* **Framework đề xuất:** **React Native (Expo) + TypeScript**.
* **Lý do lựa chọn (Ưu tiên hỗ trợ Gen AI tốt nhất):**
  * **Hệ sinh thái Gen AI vượt trội:** Tận dụng trực tiếp các SDK AI hiện đại nhất của JavaScript/TypeScript (`@ai-sdk/react` của Vercel, `@google/genai`). Hook `useChat` hỗ trợ nhận luồng chữ chạy (Streaming qua SSE) mượt mà không làm đơ giao diện điện thoại.
  * **Tận dụng phần cứng thiết bị:** Hỗ trợ `expo-camera` để chụp ảnh biên bản vi phạm giao thông, `expo-document-picker` để chọn file PDF hợp đồng, và nhận diện giọng nói (Voice-to-Text) để hỏi luật rảnh tay khi đang đi đường.
  * **Chia sẻ mã nguồn (Code Sharing):** Dùng chung 100% Type definitions (`LegalDocument`, `ChatMessage`, `AuditResult`) giữa Mobile App, Web Admin và Backend.

### 4.3. Central AI Backend & Storage
* **Nền tảng CSDL cốt lõi:** **PostgreSQL 17 + `pgvector`** (chạy Docker). 1 hệ CSDL duy nhất giải quyết trọn vẹn cả dữ liệu nghiệp vụ quan hệ lẫn vector embeddings, tránh phân mảnh hạ tầng.
* **Mô hình AI:** **Google Gemini API** (`gemini-2.5-flash` + `gemini-embedding-001`) — Gói miễn phí hào phóng, tốc độ nhanh, ngữ cảnh 1M tokens tối ưu cho văn bản luật và hợp đồng dài.

---

## 5. Quy Chuẩn Liên Kết Sang Spec-Driven Development (`specs/`)

> [!IMPORTANT]
> **Nguyên tắc bất biến:** Tài liệu PRD này KHÔNG can thiệp vào việc thiết kế cấu trúc bảng Database hay viết code.  
> Khi bắt đầu thực hiện bất kỳ tính năng nào từ PRD:
> 1. Sử dụng template tại `specs/TEMPLATE/` để tạo thư mục tính năng mới: `specs/NNN-<tên-tính-năng>/`.
> 2. `spec.md`: Định nghĩa yêu cầu chi tiết, làm rõ câu hỏi (Clarify) và tiêu chí BDD (Given-When-Then).
> 3. `plan.md`: **Tại đây mới thiết kế kỹ thuật chi tiết**, gồm cấu trúc bảng CSDL (Tables, Columns), thuật toán xử lý và API contracts.
> 4. `tasks.md`: Chia nhỏ danh sách công việc.
> 5. `tests/`: Viết kiểm thử trước, sau đó mới viết mã thực thi (`src/`).
