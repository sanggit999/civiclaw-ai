---
name: code-review
description: Thẩm định mã nguồn và tài liệu sau khi hoàn thành spec, kiểm tra bảo mật, chống hardcode và đối soát BDD criteria.
---

# Lệnh Thẩm định Mã nguồn & Bảo mật (/code-review)

Lệnh này được sử dụng trong **Claude Code** sau khi hoàn thành các nhiệm vụ của một spec (hoặc trước khi merge code vào nhánh chính) để rà soát toàn diện chất lượng, độ ổn định và an toàn bảo mật.

## 1. Mục tiêu Thẩm định
Rà soát khách quan các thay đổi git (git diff) so với tài liệu đặc tả `spec.md`, triết lý Ponytail và tiêu chuẩn bảo mật của dự án CivicLaw AI.

## 2. Quy trình Thực hiện

### Bước 1: Thu thập ngữ cảnh kiểm tra
```bash
# Xác định phạm vi commit cần review
BASE_SHA=$(git merge-base origin/main HEAD 2>/dev/null || git rev-parse HEAD~1)
HEAD_SHA=$(git rev-parse HEAD)

# Xem tổng quan các file thay đổi
git diff --stat $BASE_SHA..$HEAD_SHA
git diff $BASE_SHA..$HEAD_SHA
```

### Bước 2: Kiểm tra theo Checklist 5 Trọng điểm

1. **Khớp Spec & Tiêu chí BDD (Spec Alignment):**
   - Đọc `specs/NNN-<tên-tính-năng>/spec.md` và `plan.md`.
   - Kiểm tra xem mọi kịch bản Given-When-Then trong `spec.md` đã có unit test tương ứng chưa.
   - Các task trong `tasks.md` đã hoàn thành trọn vẹn chưa.

2. **An toàn Bảo mật & Chống Hardcode (Security & Anti-Hardcode):**
   - 🔴 **Tuyệt đối cấm:** Không có API Key, Secret, Service Role Key, Database URL, hoặc mật khẩu nằm trong code.
   - 🔴 **Zero Magic Values:** Không có số ma thuật hoặc chuỗi ma thuật rải rác; các ngưỡng phải cấu hình qua Options object kèm default constant.
   - 🔴 **Chống SQL Injection & RLS Bypass:** Các truy vấn DB hoặc Supabase call phải tuân thủ RLS policies, input validation tại trust boundary.
   - 🟡 **Cô lập Mock:** Dữ liệu mock phục vụ kiểm thử phải nằm trong `tests/fixtures/`, tuyệt đối không lọt vào code production `src/`.

3. **Triết lý Ponytail (Simplicity & Minimal Viable Code):**
   - Code có bị over-engineering, trừu tượng hóa quá sớm không?
   - Đã tận dụng stdlib, platform native và các hàm có sẵn trong codebase chưa?
   - Hàm có viết gọn gàng, đúng trách nhiệm không?

4. **Chất lượng Kiểm thử (Test Quality & Integrity):**
   - Chạy lệnh: `npm test`
   - Test có kiểm tra logic thực tế (assertions có ý nghĩa) hay chỉ test hình thức?
   - Có bao phủ kịch bản ngoại lệ (Fallback guard, input rác, mất kết nối) không?

5. **Tính ổn định & Sẵn sàng Vận hành (Production Readiness):**
   - Xử lý lỗi (try-catch, fallback) có an toàn và không làm sập ứng dụng không?
   - Kiểu dữ liệu TypeScript có chặt chẽ không (`no any`)?

## 3. Báo cáo Kết quả (Format Chuẩn)

Người thẩm định phân loại vấn đề theo 3 cấp độ:
- 🔴 **Critical (Bắt buộc sửa ngay):** Lỗ hổng bảo mật, rò rỉ credential, sai lệch logic cốt lõi của spec, test fail.
- 🟡 **Important (Phải sửa trước khi Done):** Số ma thuật chưa trích xuất, thiếu validation ranh giới, thiếu xử lý lỗi ngoại lệ.
- 🟢 **Minor (Góp ý cải thiện):** Đặt tên biến rõ hơn, tối ưu comment, refactor nhỏ.

👉 **Đánh giá chung (Verdict):** `PASS (Ready to merge)` hoặc `REJECT (Requires fixes before proceeding)`.
