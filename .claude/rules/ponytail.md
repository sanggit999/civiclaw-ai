# Quy tắc Ponytail (Lập trình Tối giản & Thực dụng)

> **Triết lý cốt lõi:**
> *"The best code is the code you never wrote." (Dòng code tốt nhất là dòng code không bao giờ phải viết).*  
> Mỗi dòng code sinh ra đều là một rủi ro và nợ kỹ thuật cần bảo trì.

## 1. Chiếc thang quyết định 7 bậc (The 7-Rung Ladder)
Trước khi viết bất kỳ hàm mới nào, AI phải kiểm tra tuần tự và **dừng lại ở bậc đầu tiên** đáp ứng được yêu cầu:

1. **YAGNI (You Aren't Gonna Need It):** Tính năng này có thực sự cần thiết lúc này không? Nếu là suy đoán viển vông, bỏ qua.
2. **Tái sử dụng (Codebase Reuse):** Kiểm tra xem codebase hiện tại đã có helper, utility, type hoặc pattern tương tự chưa. Ưu tiên tái sử dụng, cấm viết lại hàm đã có.
3. **Thư viện chuẩn (Stdlib):** Tận dụng tối đa built-in methods của ngôn ngữ (VD: TypeScript/JavaScript built-ins, Node.js stdlib) thay vì viết custom code.
4. **Nền tảng gốc (Platform Native):** Dùng tính năng native của trình duyệt, HTML/CSS, OS hoặc ràng buộc của Database thay vì code JavaScript/logic ứng dụng.
5. **Dependency hiện có:** Chỉ dùng các thư viện đã được cài sẵn trong `package.json`. Tuyệt đối không cài thêm package bên ngoài chỉ vì một vài dòng logic đơn giản.
6. **One-liner:** Nếu biểu thức logic có thể viết gọn gàng, rõ nghĩa trong 1 dòng thì giữ nguyên 1 dòng.
7. **Code tối thiểu (Minimum Viable Code):** Chỉ viết code mới khi 6 bậc trên không đáp ứng, và chỉ viết lượng code vừa đủ để vượt qua các bộ test kiểm thử (pass test).

## 2. Sửa lỗi tận gốc (Root Cause, Not Symptoms)
- Không vá lỗi cục bộ tại từng nơi gọi hàm (callers).
- Tìm nguyên nhân gốc rễ: Thêm một điều kiện kiểm tra (guard) duy nhất ở hàm dùng chung thay vì sửa 5 chỗ gọi khác nhau.

## 3. Ranh giới bất khả xâm phạm (Non-Negotiable Red Lines)
Tuyệt đối KHÔNG cắt giảm:
- Xác thực dữ liệu đầu vào (Input validation) tại trust boundary.
- Xử lý lỗi (Error handling) và phòng chống mất mát dữ liệu (Data loss prevention).
- Tính bảo mật và khả năng tiếp cận (Accessibility - a11y).
