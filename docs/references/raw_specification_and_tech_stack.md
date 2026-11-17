# CivicLaw AI — Tài liệu Đặc tả Tổng quan Dự án & Lựa chọn Công nghệ

* **Vai trò tài liệu:** Project Overview & High-Level Requirements (BA Perspective)
* **Tên sản phẩm:** CivicLaw AI (Trợ lý Tra cứu Pháp luật Đời sống & Rà soát Hợp đồng Cá nhân)
* **Mục tiêu cốt lõi:** Xây dựng sản phẩm ứng dụng kiến trúc **RAG (Retrieval-Augmented Generation)** trên nền tảng **PostgreSQL (`pgvector`)** nhằm giải quyết nhu cầu tra cứu pháp luật thiết yếu hàng ngày và kiểm tra rủi ro hợp đồng cá nhân.

---

## 1. Bối cảnh & Mục tiêu Nghiệp vụ (Business Context)

### 1.1. Vấn đề của người dùng (Pain Points)
* **Khó tiếp cận văn bản gốc:** Văn bản luật dài, nhiều thuật ngữ chuyên ngành khiến người dân khó tự tra cứu nhanh trong các tình huống đời sống (bị xử phạt giao thông, nghỉ việc, hưởng BHXH, ký hợp đồng thuê nhà).
* **Rủi ro thông tin lỗi thời:** Tìm kiếm trên mạng dễ gặp các bài viết cũ trích dẫn nghị định/luật đã hết hiệu lực.
* **Hạn chế của AI thông thường (ChatGPT/Gemini thuần):** Dễ gặp tình trạng "ảo giác" (tự suy diễn mức phạt hoặc điều luật không có thật) và không đưa ra được căn cứ pháp lý chính xác.

### 1.2. Giải pháp & Giá trị mang lại (Value Proposition)
* Cung cấp kênh hỏi đáp bằng ngôn ngữ tự nhiên, trả lời ngắn gọn, dễ hiểu dựa **100% trên kho văn bản pháp luật chính thống** được nạp vào hệ thống.
* Mọi câu trả lời đều bắt buộc đính kèm trích dẫn cụ thể (*Điều, Khoản, Số hiệu văn bản*) và chỉ truy xuất các quy định đang còn hiệu lực.
* Hỗ trợ người dùng tải lên hợp đồng cá nhân (thuê trọ, lao động) để tự động rà soát các điều khoản bất lợi hoặc trái quy định hiện hành.

### 1.3. Đối tượng người dùng mục tiêu (Target Personas)
1. **Người tham gia giao thông:** Cần tra cứu nhanh mức phạt vi phạm, hình thức xử phạt bổ sung và số điểm bị trừ trên GPLX.
2. **Người lao động:** Cần tìm hiểu quyền lợi hợp đồng lao động, quy định thử việc, tăng ca, trợ cấp thôi việc và chế độ BHXH.
3. **Người đi thuê nhà / Cá nhân giao dịch dân sự:** Cần kiểm tra tính hợp pháp của các điều khoản đặt cọc, phạt cọc, đơn phương chấm dứt hợp đồng trước khi đặt bút ký.

---

## 2. Phạm vi & Yêu cầu Sản phẩm (Product Scope)

### 2.1. Yêu cầu Chức năng (Functional Requirements)

#### Giai đoạn 1 — Core MVP (Hỏi đáp Pháp luật Đời sống)
* **FR-01 — Hỏi đáp có trích dẫn (Grounded Legal Q&A):** Người dùng đặt câu hỏi đời sống; hệ thống tìm kiếm các đoạn luật liên quan nhất và tổng hợp câu trả lời kèm nguồn trích dẫn chính xác.
* **FR-02 — Phân loại & Lọc ngữ cảnh (Domain & Status Filtering):** Cho phép khoanh vùng lĩnh vực tra cứu (Giao thông, Lao động, BHXH, Nhà ở) và tự động loại bỏ các văn bản đã hết hiệu lực.
* **FR-03 — Hội thoại nối tiếp (Contextual Chat Memory):** Hệ thống ghi nhớ ngữ cảnh trong phiên trò chuyện để hiểu các câu hỏi nối tiếp của người dùng (ví dụ: *"Nếu vi phạm lỗi đó mà không mang bằng lái thì phạt thêm bao nhiêu?"*).

#### Giai đoạn 2 — Mở rộng Giá trị (Contract Reviewer)
* **FR-04 — Tải lên & Phân tích Hợp đồng:** Cho phép người dùng tải lên file hợp đồng cá nhân (PDF/DOCX).
* **FR-05 — Đối chiếu & Cảnh báo Rủi ro:** Tự động tách các điều khoản trong hợp đồng, đối chiếu với kho luật và đánh dấu các điều khoản bất lợi hoặc vi phạm quy định pháp luật hiện hành.

### 2.2. Yêu cầu Phi chức năng (Non-Functional Requirements)
* **Độ tin cậy (Groundedness):** Nếu thông tin không nằm trong kho dữ liệu luật, hệ thống phải từ chối trả lời thay vì tự suy đoán.
* **Trải nghiệm phản hồi (Responsiveness):** Hỗ trợ phản hồi dạng luồng chữ chạy dần (Streaming) để giảm cảm giác chờ đợi khi AI tổng hợp câu trả lời dài.
* **Quyền riêng tư (Privacy):** Tài liệu hợp đồng cá nhân người dùng tải lên chỉ phục vụ phân tích trong phiên làm việc, không dùng để huấn luyện công khai.

---

## 3. Nguồn Dữ liệu Đầu vào (Reference Data Sources)

Bộ dữ liệu chuẩn tải miễn phí từ **Cổng thông tin điện tử Chính phủ (`vanban.chinhphu.vn`)** (tại mục *Tài liệu đính kèm* ở đầu trang):

| Lĩnh vực | Tên văn bản & Số hiệu | Link trang chính thức | Vai trò trong sản phẩm |
| :--- | :--- | :--- | :--- |
| **Giao thông (Mức phạt)** | Nghị định 168/2024/NĐ-CP | [Mở trang văn bản](https://vanban.chinhphu.vn/?pageid=27160&docid=212167) | Tra cứu mức phạt vi phạm giao thông & trừ điểm GPLX. |
| **Giao thông (Luật gốc)** | Luật Trật tự, an toàn giao thông đường bộ 2024 (`36/2024/QH15`) | [Mở trang văn bản](https://vanban.chinhphu.vn/?pageid=27160&docid=211194&classid=1) | Quy tắc tham gia giao thông đường bộ hiện hành. |
| **Lao động & Hợp đồng** | Bộ luật Lao động 2019 (`45/2019/QH14`) | [Mở trang văn bản](https://vanban.chinhphu.vn/?pageid=27160&docid=198540) | Tra cứu quyền lợi người lao động & đối chiếu HĐLĐ. |
| **Bảo hiểm xã hội** | Luật Bảo hiểm xã hội 2024 (`41/2024/QH15`) | [Mở trang văn bản](https://vanban.chinhphu.vn/?pageid=27160&docid=211199) | Tra cứu chế độ BHXH một lần, thai sản, hưu trí. |
| **Nhà ở & Thuê trọ** | Luật Nhà ở 2023 (`27/2023/QH15`) | [Mở trang văn bản](https://vanban.chinhphu.vn/?pageid=27160&docid=209627) | Rà soát điều khoản đặt cọc, thuê nhà ở trong hợp đồng. |

---

## 4. Đề xuất Kiến trúc & Tech Stack (Kèm Các Options Lựa Chọn)

### 4.1. Nền tảng Lưu trữ Cốt lõi (Core Database — Cố định)
* **PostgreSQL + `pgvector`:** Lưu trữ hợp nhất cả dữ liệu quan hệ (metadata văn bản, trạng thái hiệu lực, lịch sử hội thoại) và dữ liệu vector embedding trên cùng một hệ quản trị cơ sở dữ liệu. Kết hợp tìm kiếm ngữ nghĩa (Vector Search) và tìm kiếm từ khóa chính xác (Full-Text Search).

### 4.2. Lựa chọn Backend & AI Orchestration (Chọn 1 trong 3 Options)

| Phương án | Công nghệ đề xuất | Ưu điểm & Đối tượng phù hợp |
| :--- | :--- | :--- |
| **Option 1: Hệ sinh thái Python** *(Khuyên dùng cho tốc độ làm nhanh)* | **FastAPI** + `pypdf`/`pdfplumber` + **LangChain** (hoặc SDK gốc) | Hệ sinh thái thư viện xử lý văn bản PDF và AI phong phú nhất, code gọn, rất dễ mở rộng sang xử lý OCR sau này. |
| **Option 2: Hệ sinh thái Node.js / TS** *(Phù hợp Fullstack Web)* | **NestJS** (hoặc Express) + **TypeScript** + **Vercel AI SDK** (hoặc LangChain.js) | Phù hợp nếu bạn định hướng vị trí Fullstack/Backend JS/TS; hỗ trợ cơ chế Streaming phản hồi ra Frontend cực kỳ mượt mà. |
| **Option 3: Hệ sinh thái Java / Kotlin** *(Điểm cộng lớn cho Enterprise)* | **Spring Boot** + **Spring AI** | Rất nổi bật khi ứng tuyển vào các công ty lớn, ngân hàng hoặc hệ thống doanh nghiệp yêu cầu chặt chẽ về kiến trúc. |

### 4.3. Lựa chọn Mô hình AI — LLM & Embedding (Chọn 1 trong 3 Options)

| Phương án | Model đề xuất | Ưu điểm & Chi phí |
| :--- | :--- | :--- |
| **Option 1: Google Gemini API** *(Khuyên dùng để tối ưu chi phí)* | `gemini-2.5-flash` (Chat) + `gemini-embedding-001` (Embedding) | Gói miễn phí (Free Tier) hào phóng, hỗ trợ tiếng Việt xuất sắc và cửa sổ ngữ cảnh lớn (đọc hợp đồng dài rất tốt). |
| **Option 2: OpenAI API** *(Phổ biến nhất trên thị trường)* | `gpt-4o-mini` (Chat) + `text-embedding-3-small` (Embedding) | Tiêu chuẩn phổ biến trong hầu hết các mô tả công việc (JD), chi phí nạp thử nghiệm thấp ($5 dùng được rất lâu). |
| **Option 3: Local / Self-hosted** *(Không phụ thuộc Cloud API)* | **Ollama** + `Qwen2.5` (Chat) + `bge-m3` (Embedding) | Chạy hoàn toàn miễn phí trên máy cá nhân (nếu máy có GPU/RAM tốt), ghi điểm về khả năng tự vận hành mô hình mở. |

### 4.4. Lựa chọn Giao diện Người dùng — Frontend (Chọn 1 trong 2 Options)

| Phương án | Công nghệ đề xuất | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Option 1: Web App Chuyên nghiệp** | **Next.js / React** + **Tailwind CSS** | Giao diện Chat hiện đại, có khung hiển thị trích dẫn luật bên cạnh, hỗ trợ kéo thả file PDF hợp đồng để kiểm tra. |
| **Option 2: Giao diện Dựng nhanh (Rapid UI)** | **Chainlit** hoặc **Streamlit** *(Nếu chọn Python)* | Tạo giao diện chatbot hoàn chỉnh chỉ với vài chục dòng code, giúp bạn dồn 90% thời gian vào Backend và tối ưu `pgvector`. |

### 4.5. Hạ tầng & Đóng gói (Infrastructure)
* **Docker & Docker Compose:** Đóng gói PostgreSQL (`pgvector/pgvector:pg17`) cùng dịch vụ Backend để có thể khởi chạy toàn bộ hệ thống chỉ bằng một câu lệnh duy nhất.

---

## 5. Lộ trình Bàn giao Sản phẩm (Delivery Milestones)

* **Milestone 1 — Khởi tạo Hạ tầng & Nạp dữ liệu:** Dựng Docker PostgreSQL tích hợp `pgvector`, chọn Tech Stack và nạp thành công 5 văn bản luật gốc vào hệ thống.
* **Milestone 2 — Hoàn thiện MVP Hỏi đáp Luật:** Xây dựng luồng hỏi đáp có lọc theo lĩnh vực/hiệu lực, trả lời kèm trích dẫn điều khoản và lưu ngữ cảnh hội thoại.
* **Milestone 3 — Tích hợp Rà soát Hợp đồng:** Bổ sung tính năng tải lên file hợp đồng cá nhân và đối chiếu tự động với kho văn bản luật.
* **Milestone 4 — Hoàn thiện Tài liệu & Đưa lên CV:** Viết file `README.md` kèm sơ đồ kiến trúc hệ thống, ảnh chụp màn hình demo thực tế trên GitHub và cập nhật vào CV.

---

## 6. Mẫu Nội dung Mô tả Dự án trong CV

### Phiên bản Tiếng Anh (Khuyên dùng cho CV IT)
> **CivicLaw AI — Legal & Contract RAG Assistant** | *PostgreSQL (`pgvector`), \[Tech Stack bạn chọn\], LLM API*
> * Built an end-to-end Retrieval-Augmented Generation (RAG) assistant for daily legal queries (traffic penalties, labor law, social insurance) and personal contract auditing with strict source citations.
> * Designed a domain-specific document processing workflow that segments Vietnamese legal texts by structural hierarchy (*Articles/Clauses*) and stores relational metadata alongside dense vectors in **PostgreSQL (`pgvector`)**.
> * Combined metadata filtering (active legal status & domain) with hybrid search (semantic similarity and keyword matching) to maximize retrieval accuracy on exact fine amounts and legal terminology.

### Phiên bản Tiếng Việt
> **CivicLaw AI — Trợ lý Tra cứu Pháp luật & Kiểm tra Hợp đồng Cá nhân** | *PostgreSQL (`pgvector`), \[Tech Stack bạn chọn\], LLM API*
> * Xây dựng hệ thống hỏi đáp pháp luật đời sống và rà soát hợp đồng cá nhân theo kiến trúc **RAG**, hỗ trợ tra cứu nhanh mức phạt giao thông, chế độ BHXH và phát hiện điều khoản bất lợi kèm trích dẫn chính xác tới từng Điều/Khoản.
> * Xây dựng quy trình xử lý văn bản pháp luật theo cấu trúc điều khoản và lưu trữ đồng nhất dữ liệu quan hệ kết hợp vector trên **PostgreSQL (`pgvector`)**.
> * Kết hợp bộ lọc trạng thái hiệu lực văn bản với tìm kiếm ngữ nghĩa và từ khóa, nâng cao độ chính xác khi truy vấn các quy định có con số và thuật ngữ pháp lý đặc thù.