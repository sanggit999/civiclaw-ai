# Phân Rã Nghiệp Vụ 05: Rà Soát Hợp Đồng Cá Nhân & Phát Hiện Rủi Ro (Contract Auditor)

> **Mã quy chuẩn SDD tương ứng:** `specs/006-contract-auditor/`  
> **Tài liệu tham chiếu:** [docs/00-master-architecture.md](file:///d:/civiclaw-ai/docs/00-master-architecture.md)

---

## 1. Mục Tiêu Nghiệp Vụ
Cho phép người dùng tải lên file hợp đồng (Hợp đồng thuê nhà trọ, Hợp đồng thử việc/lao động) dạng PDF hoặc DOCX; hệ thống tự động bóc tách điều khoản, đối chiếu với quy định luật hiện hành và đưa ra bảng đánh giá rủi ro trước khi ký.

## 2. Quy Trình Phân Tích Hợp Đồng (Contract Auditing Flow)

```mermaid
flowchart TD
    FILE["Người Dùng Tải Lên PDF/DOCX\n(VD: Hợp đồng thuê nhà trọ 2026)"] --> EXTRACT["Text Extraction & Clause Parsing\n(Bóc tách Điều 1, Điều 2, Điều 3...)"]
    
    EXTRACT --> IDENTIFY["Nhận Diện Điều Khoản Nhạy Cảm:\n1. Tiền đặt cọc & Trả cọc\n2. Phạt vi phạm & Bồi thường\n3. Đơn phương chấm dứt hợp đồng\n4. Chi phí điện nước & sửa chữa"]
    
    IDENTIFY --> CROSS["Đối Chiếu Với Kho Luật:\n- Luật Nhà ở 2023\n- Bộ luật Dân sự 2015\n- Bộ luật Lao động 2019"]
    
    CROSS --> CLASSIFY["Phân Loại 3 Mức Rủi Ro:"]
    CLASSIFY --> GREEN["🟢 HỢP PHÁP: Phù hợp quy định"]
    CLASSIFY --> YELLOW["🟡 BẤT LỢI: Hợp pháp nhưng người thuê chịu thiệt (Cần đàm phán lại)"]
    CLASSIFY --> RED["🔴 TRÁI LUẬT: Vi phạm điều cấm của luật (Điều khoản vô hiệu)"]
    
    CLASSIFY --> REPORT["Xuất Báo Cáo Rà Soát Kèm Khuyến Nghị Cụ Thể"]
```

## 3. Các Tình Huống Cảnh Báo Điển Hình
* **Trường hợp 1 (Trái luật - Đỏ):** Hợp đồng ghi: *"Chủ nhà có quyền khóa cửa, giữ đồ đạc của bên thuê nếu chậm trả tiền phòng 3 ngày mà không cần báo trước"*. $\rightarrow$ Cảnh báo: Trái quy định pháp luật về chiếm giữ tài sản bất hợp pháp.
* **Trường hợp 2 (Bất lợi - Vàng):** Hợp đồng ghi: *"Mức phạt vi phạm hợp đồng là 50% tổng giá trị hợp đồng"*. $\rightarrow$ Cảnh báo: Mức phạt quá cao so với thông lệ thị trường, cần đàm phán giảm xuống 8-10%.
