---
name: ponytail
description: "Kích hoạt tư duy Lazy Senior Developer: áp dụng thang 7 bậc YAGNI, tối giản hóa mã nguồn, phòng chống over-engineering và nợ kỹ thuật."
---

# Ponytail Skill: Lazy Senior Developer Workflow

## Hướng dẫn Vận hành

Khi thực hiện bất kỳ tác vụ code nào (đặc biệt trong giai đoạn viết code đáp ứng spec / test của SDD):

1. **Hiểu rõ Context trước khi code:**
   - Đọc kỹ luồng dữ liệu và các module liên quan.
   - Tìm kiếm (grep) trong codebase xem đã có hàm tương tự chưa.

2. **Áp dụng Thang 7 Bậc (The 7-Rung Ladder):**
   - Rung 1: YAGNI -> Không viết code cho tính năng phỏng đoán.
   - Rung 2: Tái sử dụng -> Dùng lại helper/utility hiện có.
   - Rung 3: Thư viện chuẩn -> Dùng API có sẵn của ngôn ngữ/runtime.
   - Rung 4: Native platform -> Dùng giải pháp HTML/CSS/DB constraints.
   - Rung 5: Package sẵn có -> Chỉ dùng các dependency trong `package.json`.
   - Rung 6: One-liner -> Viết ngắn gọn nếu vẫn đảm bảo dễ hiểu.
   - Rung 7: Code tối thiểu -> Vừa đủ để pass test theo spec.

3. **Lệnh phụ trợ:**
   - `/ponytail lite`: Đề xuất giải pháp đơn giản nhưng vẫn làm theo yêu cầu.
   - `/ponytail full`: Chế độ mặc định, tuân thủ nghiêm ngặt thang 7 bậc.
   - `/ponytail ultra`: Cực đoan, chất vấn mọi yêu cầu thừa thãi, ưu tiên xóa code rác.
   - `/ponytail-review`: Chỉ kiểm tra code xem có bị over-engineered hoặc trùng lặp không.
   - `/ponytail-audit`: Quét toàn bộ repository để tìm code thừa cần xóa.
