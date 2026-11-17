# Kế hoạch Kỹ thuật: [Tên tính năng]

## 1. Thế nào (Mục tiêu kiến trúc & Giải pháp)
- Tóm tắt cách tiếp cận kỹ thuật để hiện thực hóa các yêu cầu trong `spec.md`.

## 2. Mô hình Dữ liệu & Interfaces (Types)
```typescript
// Định nghĩa interface, input/output, cấu trúc dữ liệu cụ thể cho tính năng
```

## 3. Luồng xử lý (Data Flow / Algorithm)
1. Nhận input và validate dữ liệu tại ranh giới (trust boundary).
2. Xử lý logic nghiệp vụ chính theo yêu cầu.
3. Trả về kết quả hoặc ném lỗi có cấu trúc rõ ràng.

## 4. Xử lý Lỗi & Edge Cases
- Trường hợp dữ liệu không hợp lệ -> Báo lỗi cụ thể (Validation Error).
- Trường hợp không tìm thấy kết quả -> Xử lý an toàn (Not Found / Fallback).
