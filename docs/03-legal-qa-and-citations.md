# Phân Rã Nghiệp Vụ 03: Hỏi Đáp Pháp Luật Có Trích Dẫn & Streaming (Grounded Q&A)

> **Mã quy chuẩn SDD tương ứng:** `specs/004-legal-qa-citations/`  
> **Tài liệu tham chiếu:** [docs/00-master-architecture.md](file:///d:/civiclaw-ai/docs/00-master-architecture.md)

---

## 1. Mục Tiêu Nghiệp Vụ
Sử dụng LLM để tổng hợp câu trả lời từ các đoạn luật do Khối 02 cung cấp, đảm bảo:
* Ngôn ngữ bình dị, dễ hiểu cho công dân bình thường.
* **100% không bịa đặt:** Bắt buộc trích dẫn số hiệu điều luật cụ thể.
* Trả lời dạng luồng ký tự (Streaming qua SSE).

## 2. Thiết Kế System Prompt Pháp Lý Nghiêm Cẩn

```markdown
Bạn là CivicLaw AI - Trợ lý pháp lý thông minh và chuẩn mực cho công dân Việt Nam.

NGUYÊN TẮC BẤT KHẢ XÂM PHẠM:
1. Bạn CHỈ ĐƯỢC PHÉP trả lời dựa trên các ĐOẠN LUẬT THAM CHIẾU được cung cấp dưới đây.
2. Tuyệt đối KHÔNG tự suy diễn, không bịa đặt số tiền phạt, mức án hoặc quy định không có trong tài liệu.
3. Mọi khẳng định về quyền lợi hoặc nghĩa vụ đều phải kèm trích dẫn trong ngoặc vuông, ví dụ: [Khoản 2 Điều 6 Nghị định 168/2024/NĐ-CP].
4. Nếu tài liệu tham chiếu KHÔNG có thông tin để trả lời câu hỏi: Hãy thông báo lịch sự:
   "Rất tiếc, kho dữ liệu hiện tại của CivicLaw chưa có văn bản quy định cụ thể về vấn đề này."
```

## 3. Cấu Trúc Phản Hồi Trả Về Client

```json
{
  "answer": "Hành vi điều khiển xe máy vượt đèn đỏ sẽ bị phạt tiền từ 800.000 đồng đến 1.000.000 đồng và bị trừ 2 điểm trên Giấy phép lái xe [Điểm a Khoản 4 và Điểm b Khoản 10 Điều 6 Nghị định 168/2024/NĐ-CP].",
  "citations": [
    {
      "reference": "Điểm a Khoản 4 Điều 6 Nghị định 168/2024/NĐ-CP",
      "text": "Phạt tiền từ 800.000 đồng đến 1.000.000 đồng đối với người điều khiển xe mô tô, xe gắn máy không chấp hành hiệu lệnh của đèn tín hiệu giao thông...",
      "source_url": "https://vanban.chinhphu.vn/?pageid=27160&docid=212167"
    }
  ],
  "confidence_score": 0.95
}
```
