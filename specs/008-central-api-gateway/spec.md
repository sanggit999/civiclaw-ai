# BƯỚC 1: PRODUCT REVIEW — CỔNG TRUY CẬP TRUNG TÂM & TRUYỀN PHÁT DỮ LIỆU THỜI GIAN THỰC (CENTRAL API GATEWAY & STREAMING)

---

## 1. Vấn đề (Problem Statement)

### Đối tượng gặp vấn đề:
* **Ứng dụng Di động (Mobile App - React Native Expo):** Dành cho công dân tra cứu pháp luật và rà soát hợp đồng.
* **Cổng Quản trị Web (Web Admin - Next.js + Shadcn UI):** Dành cho chuyên gia pháp lý và quản trị viên quản lý văn bản luật.
* **Người dùng cuối (Công dân):** Cần nhận phản hồi câu hỏi pháp lý và tiến trình rà soát hợp đồng ngay lập tức, không thể chờ đợi 3–5 giây trong trạng thái màn hình bị "đơ" (loading spinner).

### Nỗi đau thực tế (Pain Points):
1. **Các dịch vụ lõi đang bị phân mảnh ở tầng nội bộ (In-process Classes):**
   * Các động cơ mạnh mẽ đã hoàn thành ở các spec trước:
     - `LegalSearchEngine` (Spec 002): Tìm kiếm kết hợp vector + từ khóa.
     - `GroundedRagPipeline` (Spec 004): Hỏi đáp căn cứ 100% không ảo giác.
     - `ContextualRagPipeline` (Spec 005): Tái tạo câu hỏi ngữ cảnh & bộ nhớ phiên hội thoại.
     - `ContractAuditorAgent` (Spec 006): Thẩm định rủi ro hợp đồng Đỏ/Vàng/Xanh.
     - `ContractLifecycleManager` (Spec 007): Bóc tách, quản lý phiên bản và đối soát lịch sử.
   * Hiện tại, toàn bộ các engine trên đều là các TypeScript class chạy độc lập trong mã nguồn, **chưa có giao diện mạng (Network Interface / HTTP REST / SSE)** để các ứng dụng Web/Mobile bên ngoài có thể gọi qua mạng internet.
2. **Trải nghiệm chờ đợi đứt gãy nếu chỉ dùng HTTP Request-Response thông thường:**
   * Một chu trình RAG hoặc Audit hợp đồng cần nhiều bước: Bóc tách $\rightarrow$ Tính SHA-256 $\rightarrow$ Gọi Gemini Embedding $\rightarrow$ Truy vấn Supabase $\rightarrow$ Chạy LLM suy luận.
   * Nếu chỉ trả về kết quả 1 lần sau khi hoàn tất (JSON truyền thống), người dùng trên Mobile sẽ phải nhìn màn hình loading 3–5 giây mà không biết hệ thống đang làm gì, dễ gây cảm giác ứng dụng bị treo.
3. **Thiếu Ranh giới Bảo vệ & Giám sát Hệ thống (Trust Boundary & Health Monitoring):**
   * Cần một cổng tập trung để:
     - Kiểm tra trạng thái hoạt động (Healthcheck `/api/v1/health`: DB kết nối tốt không, Gemini API sẵn sàng không).
     - Kiểm soát định dạng dữ liệu đầu vào (Input validation).
     - Thiết lập CORS an toàn cho Web Admin và Mobile App.

### Hậu quả nếu không làm:
* Toàn bộ hệ thống CivicLaw AI không thể kết nối tới người dùng thực tế; Web Admin và Mobile App không thể tích hợp; trải nghiệm người dùng kém do thiếu cơ chế truyền phát dữ liệu thời gian thực (Streaming).

---

## 2. Hành vi Mong muốn (Desired Behavior)

CivicLaw AI cung cấp một **Central HTTP API Gateway** hiệu năng cao, xây dựng trên thư viện chuẩn Node.js (`node:http`), không phụ thuộc thư viện cồng kềnh (tuân thủ Ponytail Rung 3), hỗ trợ đầy đủ các kênh giao tiếp:

1. **Endpoint Kiểm tra Sức khỏe Hệ thống (`GET /api/v1/health`):**
   * Kiểm tra tính sẵn sàng của Gateway, kiểm tra kết nối tới Supabase Cloud và Gemini API.
   * Trả về mã HTTP `200 OK` kèm thời gian hoạt động (`uptime`), phiên bản và trạng thái các dịch vụ phụ thuộc.

2. **Endpoint Tra cứu & Hỏi đáp Pháp lý Streaming (`POST /api/v1/chat/stream`):**
   * Tiếp nhận câu hỏi của công dân và `sessionId` (tùy chọn).
   * Sử dụng **Server-Sent Events (SSE)** để stream từng phần dữ liệu về client theo thời gian thực:
     - `event: query_condensed`: Phát câu hỏi độc lập sau khi tái tạo ngữ cảnh.
     - `event: citations`: Phát danh sách các điều luật trích dẫn nguồn.
     - `event: token`: Stream từng phần câu trả lời của AI.
     - `event: done`: Hoàn tất phiên trả lời kèm siêu dữ liệu đầy đủ.
   * Hỗ trợ Fallback sang REST thông thường (`POST /api/v1/chat`) cho các client không hỗ trợ SSE.

3. **Endpoint Rà soát & Đối soát Hợp đồng (`POST /api/v1/contracts/audit`):**
   * Tiếp nhận văn bản hợp đồng tải lên (`text`, `fileType`, `title`, `category`, `documentId`).
   * Hỗ trợ Server-Sent Events (`POST /api/v1/contracts/audit/stream`) thông báo tiến trình 4 giai đoạn:
     - `phase: PARSING` (Đang bóc tách & làm sạch)
     - `phase: DEDUPLICATION` (Đang kiểm tra trùng lặp)
     - `phase: AUDITING` (Đang rà soát điều khoản vi phạm)
     - `phase: DIFFING` (Đang đối soát so sánh phiên bản cũ)
     - `phase: COMPLETE` (Hoàn tất, trả về hồ sơ + báo cáo đối soát)

4. **Endpoint Tra cứu Luật Nhanh (`POST /api/v1/search`):**
   * Tiếp nhận từ khóa tìm kiếm và tùy chọn lọc theo lĩnh vực (`domain`).
   * Trả về danh sách điều luật phù hợp nhất kèm điểm tương đồng (Confidence Score).

5. **Ranh giới An toàn & Tương thích Mạng (CORS & Error Handling):**
   * Cấu hình CORS Header cho phép Web Admin và Mobile App truy cập an toàn.
   * Định dạng lỗi chuẩn JSON (`{ error: { code, message, details } }`), mã HTTP chuẩn RESTful (`400`, `404`, `409`, `422`, `500`).

---

## 3. Bản Dựng Giao Diện & Luồng Tương Tác Mạng (Mock-up)

### 3.1. Sơ đồ Luồng Gọi Mạng (Architecture Diagram)
```mermaid
flowchart TD
    subgraph Clients ["Ứng Dụng Đầu Cuối (Clients)"]
        Mobile["📱 Mobile App (Công dân)\nReact Native Expo"]
        Web["💻 Web Admin (Chuyên gia)\nNext.js + Shadcn UI"]
    end

    subgraph Gateway ["CENTRAL API GATEWAY (node:http)"]
        Router["HTTP Request Router & CORS Middleware"]
        HealthH["/api/v1/health"]
        ChatH["/api/v1/chat/stream (SSE)"]
        AuditH["/api/v1/contracts/audit (SSE)"]
        SearchH["/api/v1/search (JSON)"]
    end

    subgraph CoreEngines ["Các Động Cơ Lõi Nghiệp Vụ (Core Engines)"]
        RAG["ContextualRagPipeline\n(Specs 004 & 005)"]
        Auditor["ContractLifecycleManager\n(Specs 006 & 007)"]
        SearchEng["LegalSearchEngine\n(Specs 002 & 003)"]
    end

    subgraph Cloud ["Hạ Tầng Cloud & AI"]
        Supa[("Supabase Cloud\nPostgreSQL + pgvector")]
        Gemini["Google Gemini API\nFlash 2.5 + Embedding"]
    end

    Mobile -->|POST /chat/stream (SSE)| Router
    Mobile -->|POST /contracts/audit| Router
    Web -->|GET /health| Router
    Web -->|POST /search| Router

    Router --> HealthH
    Router --> ChatH
    Router --> AuditH
    Router --> SearchH

    ChatH --> RAG
    AuditH --> Auditor
    SearchH --> SearchEng

    RAG --> Supa
    RAG --> Gemini
    Auditor --> Supa
    SearchEng --> Supa
```

### 3.2. Mẫu Luồng Truyền Phát Server-Sent Events (SSE Example)
```http
POST /api/v1/chat/stream HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Accept: text/event-stream

{
  "query": "Thế còn xe ô tô thì sao?",
  "sessionId": "c4a89b12-5f67-4e2a-8c3b-123456789abc"
}

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: progress
data: {"phase":"CONDENSING","message":"Đang phân tích ngữ cảnh câu hỏi..."}

event: query_condensed
data: {"standaloneQuery":"Hành vi vượt đèn đỏ đối với xe ô tô bị xử phạt bao nhiêu tiền?"}

event: citations
data: [{"docNumber":"168/2024/NĐ-CP","article":"Điều 6","clause":"Khoản 5","point":"Điểm a","fullReference":"Điểm a Khoản 5 Điều 6 Nghị định 168/2024/NĐ-CP"}]

event: token
data: {"chunk":"Phạt tiền từ 4.000.000 đồng đến 6.000.000 đồng "}

event: token
data: {"chunk":"đối với người điều khiển xe ô tô vượt đèn đỏ, "}

event: token
data: {"chunk":"đồng thời bị trừ 02 điểm trên giấy phép lái xe."}

event: done
data: {"sessionId":"c4a89b12-5f67-4e2a-8c3b-123456789abc","isGrounded":true,"safetyScore":100}
```

---

## 4. Làm Rõ & Ràng Buộc Nghiệp Vụ (Clarify - Cấm Đoán Mò)

- [x] **Q1: Tại sao ưu tiên thư viện chuẩn `node:http` thay vì cài thêm Express/Fastify?**
  - *Trả lời:* Tuân thủ triệt để chiếc thang 7 bậc **Ponytail (Rung 3: Stdlib & Rung 5: Installed Dependencies)**:
    - Thư viện `node:http` có sẵn 100% trong Node.js runtime, zero overhead, thời gian khởi động 10ms, không thêm bất kỳ package bên ngoài nào vào `package.json`.
    - `node:http` hỗ trợ Server-Sent Events (SSE) gốc hoàn hảo bằng cách ghi trực tiếp ra `ServerResponse` stream (`res.write()`).
    - Kiến trúc được module hóa theo `HttpHandler` và `Router`, dễ dàng đóng gói thành Docker container hoặc chuyển đổi sang Fastify trong tương lai nếu cần plugin phức tạp.
- [x] **Q2: Cơ chế Server-Sent Events (SSE) xử lý lỗi mạng giữa chừng như thế nào?**
  - *Trả lời:* 
    - Khi có lỗi phát sinh trong lúc stream (ví dụ LLM 429 hoặc mất kết nối DB), Gateway sẽ gửi sự kiện `event: error` kèm JSON mã lỗi và gọi `res.end()`.
    - Client nhận được sự kiện lỗi và hiển thị thông báo thân thiện hoặc tự động kích hoạt cơ chế Extractive Fallback.
- [x] **Q3: Cơ chế xác thực (Auth Boundary) được tổ chức ra sao?**
  - *Trả lời:*
    - Hỗ trợ cả 2 chế độ:
      1. Khách vãng lai (Anonymous / Guest): Không cần header `Authorization`, hệ thống phục vụ bình thường với `userId = null`.
      2. Người dùng đã đăng nhập (Authenticated): Truyền header `Authorization: Bearer <supabase_jwt_token>`. Gateway giải mã token để trích xuất `userId` và truyền xuống các tầng lưu trữ.

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria / BDD Scenarios)

### Kịch bản 1: Kiểm tra trạng thái hệ thống thành công (Happy Path Healthcheck)
- **Given:** Central API Gateway đang chạy tại cổng cấu hình.
- **When:** Client gửi yêu cầu `GET /api/v1/health`.
- **Then:** Gateway phản hồi HTTP `200 OK`, trả về JSON chứa `status: "ok"`, `timestamp`, `uptime`, và trạng thái kết nối các dịch vụ phụ trợ.

### Kịch bản 2: Hỏi đáp pháp lý truyền phát thời gian thực (Chat SSE Streaming)
- **Given:** Client muốn đặt câu hỏi pháp luật có ngữ cảnh qua stream.
- **When:** Client gửi yêu cầu `POST /api/v1/chat/stream` kèm `{ query: "Vượt đèn đỏ xe máy phạt bao nhiêu?" }`.
- **Then:** 
  - Gateway trả về header `Content-Type: text/event-stream`.
  - Client nhận tuần tự các event: `progress` $\rightarrow$ `citations` $\rightarrow$ `token` (nhiều chunks) $\rightarrow$ `done`.
  - Phản hồi chứa đầy đủ trích dẫn Nghị định 168/2024/NĐ-CP và căn cứ pháp lý.

### Kịch bản 3: Tải lên và thẩm định vòng đời hợp đồng (Contract Audit API)
- **Given:** Người dùng gửi văn bản hợp đồng lao động mới lần 1.
- **When:** Client gửi `POST /api/v1/contracts/audit` với `{ title: "HĐLĐ Thử nghiệm", category: "labor", content: "..." }`.
- **Then:**
  - Gateway trả về HTTP `200 OK` (hoặc `201 Created`).
  - Phản hồi chứa đối tượng `document` ($v_1$), bản ghi `version`, và kết quả thẩm định rủi ro Đỏ/Vàng/Xanh.

### Kịch bản 4: Xử lý ngoại lệ và mã lỗi chuẩn RESTful (Error Boundary)
- **Given:** Client gửi request thiếu trường bắt buộc hoặc upload file trùng mã hash SHA-256 đã có trên cùng một hợp đồng.
- **When:** Gateway tiếp nhận request.
- **Then:**
  - Với request sai định dạng: Gateway trả về HTTP `400 Bad Request` hoặc `422 Unprocessable Entity` kèm mô tả lỗi rõ ràng.
  - Với request trùng nội dung hợp đồng: Gateway trả về HTTP `409 Conflict` (tương ứng `DuplicateContentError`).
