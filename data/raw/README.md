# Kho Dữ Liệu Văn Bản Luật Gốc (Raw Legal Documents)

> **Mục đích:** Lưu trữ bản gốc các văn bản quy phạm pháp luật làm căn cứ pháp lý và nguồn dữ liệu đầu vào cho hệ thống CivicLaw AI.  
> **Nguồn chính thống:** Cổng thông tin điện tử Chính phủ (`vanban.chinhphu.vn`).

---

## Danh Mục 5 Bộ Luật Cốt Lõi

| STT | Lĩnh Vực | Số Hiệu & Tên Văn Bản | Đường Dẫn Chính Thức | Bản PDF Gốc | Bản Toàn Văn Bổ Sung (HTML/Text) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Giao thông | **Nghị định 168/2024/NĐ-CP**<br>*(Xử phạt vi phạm giao thông & trừ điểm GPLX)* | [vanban.chinhphu.vn - docid=212167](https://vanban.chinhphu.vn/?pageid=27160&docid=212167) | `data/raw/168_2024_ND-CP.pdf` | `data/raw/168_2024_ND-CP.txt` |
| **2** | Giao thông | **Luật 36/2024/QH15**<br>*(Trật tự, an toàn giao thông đường bộ 2024)* | [vanban.chinhphu.vn - docid=211194](https://vanban.chinhphu.vn/?pageid=27160&docid=211194&classid=1) | `data/raw/36_2024_QH15.pdf` | `data/raw/36_2024_QH15.txt` |
| **3** | Lao động | **Bộ luật Lao động 2019** (`45/2019/QH14`) | [vanban.chinhphu.vn - docid=198540](https://vanban.chinhphu.vn/?pageid=27160&docid=198540) | `data/raw/45_2019_QH14.pdf` | `data/raw/45_2019_QH14.txt` |
| **4** | BHXH | **Luật Bảo hiểm xã hội 2024** (`41/2024/QH15`) | [vanban.chinhphu.vn - docid=211199](https://vanban.chinhphu.vn/?pageid=27160&docid=211199) | `data/raw/41_2024_QH15.pdf` | `data/raw/41_2024_QH15.txt` |
| **5** | Nhà ở | **Luật Nhà ở 2023** (`27/2023/QH15`) | [vanban.chinhphu.vn - docid=209627](https://vanban.chinhphu.vn/?pageid=27160&docid=209627) | `data/raw/27_2023_QH15.pdf` | `data/raw/27_2023_QH15.txt` |

---

## Chiến Lược Xử Lý 2 Nguồn Dữ Liệu
1. **Bản PDF Gốc (`.pdf`):** Đóng vai trò là tài liệu pháp lý đối chứng nguyên bản (Evidence of Record), có thể cung cấp cho công dân tải về kiểm tra khi cần xem văn bản có mộc đỏ.
2. **Bản Bổ Sung HTML/Text (`.txt`):** Lấy từ phần hiển thị toàn văn trên web của Cổng thông tin Chính phủ. Đây là nguồn dữ liệu chuẩn không bị lỗi OCR, không bị dính số trang/header rác, dùng trực tiếp cho bộ bóc tách `LegalHierarchyParser`.
