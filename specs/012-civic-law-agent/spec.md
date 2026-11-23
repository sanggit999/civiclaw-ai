# Đặc Tả Tính Năng: Trợ Lý AI Pháp Luật CivicLaw (CivicLaw Legal Agent)

## 1. Vấn Đề (Problem Statement)
Khi công dân tiếp cận trợ lý pháp lý số:
- **Câu hỏi khám phá / định hướng (Broad Exploratory Inquiry):** Công dân thường bắt đầu bằng câu hỏi mở (ví dụ: *"Cho Tôi về Giao thông đường bộ"*, *"Quy định về Lao động"*). Các hệ thống RAG truyền thống thường bối rối do không có từ khóa hành vi cụ thể, dẫn đến trích xuất rời rạc hoặc hallucination.
- **Câu hỏi tra cứu vi phạm cụ thể (Specific Legal Inquiry):** Khi hỏi mức phạt hoặc hành vi cụ thể (ví dụ: *"Vượt đèn đỏ xe máy phạt bao nhiêu?"*), hệ thống cần trích dẫn chính xác 100% căn cứ điều khoản từ cơ sở dữ liệu luật.
- **Câu hỏi ngoài phạm vi (Out of DB Scope):** Khi hỏi các lĩnh vực chưa có trong cơ sở dữ liệu (ví dụ: Hình sự, Thuế, Hải quan), hệ thống cần từ chối trung thực (Honest Fallback), tuyệt đối không suy đoán bịa đặt.

## 2. Hành Vi Mong Muốn (Desired Behavior & BDD Criteria)

### Kịch bản 1: Khám phá toàn cảnh lĩnh vực (Domain Landscape)
- **Given:** Người dùng gửi câu hỏi mở về 1 trong 5 lĩnh vực cốt lõi (TRAFFIC, LABOR, INSURANCE, HOUSING, CIVIL).
- **When:** Hệ thống nhận diện đây là câu hỏi định hướng (`isExploratory: true`).
- **Then:** Kích hoạt công cụ `domain_landscape` để tổng hợp:
  - Bản đồ quy định pháp luật cùng các văn bản chính thống trong DB.
  - 4 trụ cột quy định trọng tâm.
  - Đưa ra danh sách gợi ý chủ đề tương tác kèm câu hỏi mẫu (Guided Topics).
  - Độ tin cậy cao, 100% trích dẫn căn cứ chính thống.

### Kịch bản 2: Tra cứu điều khoản vi phạm cụ thể (Search Legal Code)
- **Given:** Người dùng hỏi hành vi vi phạm hoặc tình huống cụ thể (ví dụ: *"Vượt đèn đỏ xe máy..."*).
- **When:** Hệ thống nhận diện câu hỏi vi phạm chi tiết.
- **Then:** Định tuyến sang công cụ `search_legal_code` kết nối RAG Pipeline để truy xuất trích dẫn chính xác (`Nghị định 168/2024/NĐ-CP`, `Điều 6`).

### Kịch bản 3: Phản hồi trung thực khi ngoài phạm vi (Honest Fallback)
- **Given:** Người dùng hỏi về lĩnh vực ngoài 5 bộ luật (ví dụ: Hình sự, Thuế).
- **When:** Hệ thống kiểm tra trust boundary của cơ sở dữ liệu.
- **Then:** Kích hoạt công cụ `honest_fallback`, từ chối trả lời ảo giác và hướng dẫn công dân tra cứu tại cổng thông tin chính thức của Chính phủ.

## 3. Mock-up Giao Diện & Tương Tác
```text
User: "Cho Tôi về Giao thông đường bộ"

Assistant:
### 🚦 Bản Đồ Quy Định Pháp Luật: Giao thông đường bộ

Hệ thống quy chuẩn an toàn giao thông đường bộ, chế tài xử phạt vi phạm hành chính và cơ chế trừ điểm Giấy phép lái xe (GPLX) mới nhất áp dụng từ năm 2025.

---
#### 📚 Văn Bản Pháp Quy Chính Thống Đang Áp Dụng
- 📜 Nghị định 168/2024/NĐ-CP (Hiệu lực: 2025-01-01)
- 📜 Luật Trật tự, an toàn giao thông đường bộ 2024 (Luật số 36/2024/QH15)

---
#### 🧭 4 Trọng Tâm Quy Định Cốt Lõi
1. Cơ chế Trừ điểm & Phục hồi điểm GPLX (12 điểm/năm)
2. Chế tài Xử phạt Quy tắc Giao thông Đô thị (Vượt đèn đỏ, đi ngược chiều...)
3. Kiểm soát Nồng độ cồn & Chất kích thích
4. Quy chuẩn Tốc độ & Thiết bị An toàn

---
#### 💡 Gợi Ý Chủ Đề Tra Cứu Nhanh
- 🔍 Mức phạt và trừ điểm GPLX lỗi vượt đèn đỏ xe máy / ô tô
  👉 Hỏi ngay mẫu: "Vượt đèn đỏ xe máy phạt bao nhiêu?"
- 🔍 Quy chế trừ điểm Giấy phép lái xe và điều kiện phục hồi điểm
  👉 Hỏi ngay mẫu: "Quy định trừ điểm bằng lái xe theo Nghị định 168"
```
