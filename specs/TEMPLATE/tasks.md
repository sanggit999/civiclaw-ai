# Bước 4: Chia Lát Dọc (Vertical Slicing Tasks) — [Tên tính năng]

> **Nguyên tắc phân rã công việc:**
> - Tuyệt đối không chia theo tầng ngang (viết hết DB -> viết hết API -> viết hết UI).
> - Chia theo **Lát cắt dọc (Vertical Slices)**: Mỗi lát cắt hoàn thành trọn vẹn từ Input -> Logic -> Output và **bắt buộc có lệnh kiểm tra độc lập**.
> - **Chỉ đánh dấu `[x]` sau khi lệnh kiểm tra của lát cắt đó chạy XANH (Test Passed).**

---

### Lát cắt 1: Luồng cốt lõi tối thiểu (Core Happy Path Slice)
*Mục tiêu: Đưa dữ liệu hợp lệ đầu vào đi xuyên suốt hệ thống và trả về kết quả thành công đầu tiên.*
- [ ] `t1.1: Định nghĩa Types & Signatures cơ bản của Lát 1 (kèm Config/Options)`
- [ ] `t1.2: Viết Unit Test cho Happy Path (Xác nhận test ĐỎ, dùng mock fixtures độc lập trong tests/ nếu cần)`
- [ ] `t1.3: Cài đặt code tối thiểu (Ponytail) để test XANH`
*👉 Lệnh kiểm tra Lát 1:* `npm test -- <path-to-test-file> -t "Happy Path"`

---

### Lát cắt 2: Xử lý Ngoại lệ & Ranh giới Sự cố (Resilience & Fallback Slice)
*Mục tiêu: Xử lý an toàn khi thiếu dữ liệu, sai ngưỡng tin cậy hoặc gặp sự cố ranh giới.*
- [ ] `t2.1: Viết Unit Test cho kịch bản ngoại lệ / Fallback Guard (Test ĐỎ)`
- [ ] `t2.2: Cài đặt logic Fallback & Error Boundary để test XANH`
- [ ] `t2.3: Viết Unit Test kiểm chứng cấu hình tùy biến (không hardcode số ma thuật)`
*👉 Lệnh kiểm tra Lát 2:* `npm test -- <path-to-test-file> -t "Fallback"`

---

### Lát cắt 3: Khử trùng lặp & Tích hợp Mở rộng (Optimization & Integration Slice)
*Mục tiêu: Tối ưu hiệu năng, chống trùng rác dữ liệu và kiểm chứng trên dữ liệu thực tế.*
- [ ] `t3.1: Viết Integration Test trên dữ liệu thực tế (Test ĐỎ)`
- [ ] `t3.2: Cài đặt thuật toán khử trùng lặp / tối ưu hiệu năng để test XANH`
- [ ] `t3.3: Rà soát loại bỏ toàn bộ dữ liệu mock tạm thời khỏi src/, kết nối biến môi trường .env chuẩn`
- [ ] `t3.4: Chạy toàn bộ test suite, kiểm tra độ phủ và đối soát lại spec.md`
- [ ] `t3.5: Kích hoạt Code Review độc lập (/code-review chuẩn cho mọi máy, hoặc /requesting-code-review nếu có plugin Superpowers)`
*👉 Lệnh kiểm tra Lát 3:* `npm test`

---

## 📋 Checklist Nghiệm thu Chống Hardcode (Bắt buộc thỏa mãn trước khi Done)
- [ ] **Bí mật & Credentials:** Không hardcode API Key, Token, Password trong code (phải dùng `process.env`).
- [ ] **Endpoints:** Không hardcode URL backend, host DB, port (phải dùng biến môi trường hoặc config).
- [ ] **Số ma thuật (Magic Numbers):** Toàn bộ ngưỡng/giới hạn được định nghĩa qua Config/Options object và default constant.
- [ ] **Mock Isolation:** Mọi dữ liệu mock tạm thời chỉ nằm trong `tests/fixtures/`, tuyệt đối không lọt vào mã nguồn `src/`.
- [ ] **Paths:** Không dùng đường dẫn tuyệt đối dạng `C:\...` hay `D:\...`.

---

## 🛡️ Chốt chặn Thẩm định & Bảo mật (Code Review Gate)
- [ ] Kích hoạt Code Review độc lập:
  - **Mọi môi trường (Zero-setup):** Gõ `/code-review` (hoạt động ngay trên Claude Code và Antigravity nhờ skill đóng gói sẵn trong repo).
  - **Antigravity (Nâng cao):** Gõ `/requesting-code-review` nếu máy đã cài plugin Superpowers (`antigravity-plugins-partners/plugin/superpowers`).
  - **Codex:** Gõ `/review` hoặc dispatch `@code-reviewer`.
- [ ] Không còn bất kỳ phát hiện nào ở mức **Critical** hoặc **Important**.
- [ ] Reviewer xác nhận kết luận: **PASS (Ready to merge)**.
