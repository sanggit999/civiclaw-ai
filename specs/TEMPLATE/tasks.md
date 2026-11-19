# Bước 4: Chia Lát Dọc (Vertical Slicing Tasks) — [Tên tính năng]

> **Nguyên tắc phân rã công việc:**
> - Tuyệt đối không chia theo tầng ngang (viết hết DB -> viết hết API -> viết hết UI).
> - Chia theo **Lát cắt dọc (Vertical Slices)**: Mỗi lát cắt hoàn thành trọn vẹn từ Input -> Logic -> Output và **bắt buộc có lệnh kiểm tra độc lập**.
> - **Chỉ đánh dấu `[x]` sau khi lệnh kiểm tra của lát cắt đó chạy XANH (Test Passed).**

---

### Lát cắt 1: Luồng cốt lõi tối thiểu (Core Happy Path Slice)
*Mục tiêu: Đưa dữ liệu hợp lệ đầu vào đi xuyên suốt hệ thống và trả về kết quả thành công đầu tiên.*
- [ ] `t1.1: Định nghĩa Types & Signatures cơ bản của Lát 1`
- [ ] `t1.2: Viết Unit Test cho Happy Path (Xác nhận test ĐỎ)`
- [ ] `t1.3: Cài đặt code tối thiểu (Ponytail) để test XANH`
*👉 Lệnh kiểm tra Lát 1:* `npm test -- <path-to-test-file> -t "Happy Path"`

---

### Lát cắt 2: Xử lý Ngoại lệ & Ranh giới Sự cố (Resilience & Fallback Slice)
*Mục tiêu: Xử lý an toàn khi thiếu dữ liệu, sai ngưỡng tin cậy hoặc gặp sự cố ranh giới.*
- [ ] `t2.1: Viết Unit Test cho kịch bản ngoại lệ / Fallback Guard (Test ĐỎ)`
- [ ] `t2.2: Cài đặt logic Fallback & Error Boundary để test XANH`
*👉 Lệnh kiểm tra Lát 2:* `npm test -- <path-to-test-file> -t "Fallback"`

---

### Lát cắt 3: Khử trùng lặp & Tích hợp Mở rộng (Optimization & Integration Slice)
*Mục tiêu: Tối ưu hiệu năng, chống trùng rác dữ liệu và kiểm chứng trên dữ liệu thực tế.*
- [ ] `t3.1: Viết Integration Test trên dữ liệu thực tế (Test ĐỎ)`
- [ ] `t3.2: Cài đặt thuật toán khử trùng lặp / tối ưu hiệu năng để test XANH`
- [ ] `t3.3: Chạy toàn bộ test suite, kiểm tra độ phủ và đối soát lại spec.md`
*👉 Lệnh kiểm tra Lát 3:* `npm test`
