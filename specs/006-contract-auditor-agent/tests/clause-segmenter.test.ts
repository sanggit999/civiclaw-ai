import { describe, it, expect } from 'vitest';
import { ClauseSegmenter } from '../../../src/contract/clause-segmenter.js';

describe('ClauseSegmenter (Lát 1: Phân đoạn Hợp đồng & Nhận diện Điều khoản)', () => {
  const sampleLaborContract = `
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

HỢP ĐỒNG LAO ĐỘNG
Số: 01/2026/HĐLĐ

Hôm nay, ngày 01 tháng 01 năm 2026, tại Hà Nội, chúng tôi gồm:
Bên A (Người sử dụng lao động): Công ty TNHH Công nghệ XYZ.
Bên B (Người lao động): Nguyễn Văn A.

Hai bên thỏa thuận ký kết hợp đồng lao động với các điều khoản sau:

Điều 1: Công việc, địa điểm làm việc và thời hạn hợp đồng
- Vị trí: Lập trình viên Backend.
- Địa điểm: Tầng 5, Tòa nhà ABC, Cầu Giấy, Hà Nội.
- Thời hạn: 12 tháng kể từ ngày 01/01/2026 đến ngày 31/12/2026.

Điều 2: Thời gian thử việc và chế độ lương
- Thời gian thử việc là 120 ngày kể từ ngày ký.
- Mức lương thử việc bằng 85% lương chính thức.

Điều 3: Tiền lương và phụ cấp
- Lương chính thức: 20.000.000 VNĐ / tháng.
- Hình thức trả lương: Chuyển khoản vào ngày 05 hàng tháng.

Điều 4: Nghĩa vụ nộp giấy tờ tùy thân và bằng cấp
- Người lao động phải nộp giữ bản chính Bằng tốt nghiệp Đại học cho Công ty để làm tin trong suốt thời gian làm việc.

Điều 5: Đơn phương chấm dứt hợp đồng và bồi thường
- Nếu người lao động tự ý nghỉ việc trước thời hạn phải bồi thường 06 tháng tiền lương cho Công ty.
`;

  it('tự động nhận diện chính xác danh mục hợp đồng lao động (labor)', () => {
    const category = ClauseSegmenter.detectCategory(sampleLaborContract);
    expect(category).toBe('labor');
  });

  it('phân tách chính xác 5 điều khoản từ hợp đồng lao động', () => {
    const clauses = ClauseSegmenter.segment(sampleLaborContract);
    expect(clauses).toHaveLength(5);

    expect(clauses[0].id).toBe('dieu-1');
    expect(clauses[0].title).toContain('Điều 1');
    expect(clauses[0].text).toContain('Vị trí: Lập trình viên Backend');
    expect(clauses[0].orderIndex).toBe(0);

    expect(clauses[1].id).toBe('dieu-2');
    expect(clauses[1].title).toContain('Điều 2');
    expect(clauses[1].text).toContain('Thời gian thử việc là 120 ngày');
    expect(clauses[1].category).toBe('PROBATION');

    expect(clauses[2].id).toBe('dieu-3');
    expect(clauses[2].category).toBe('COMPENSATION_SALARY');

    expect(clauses[3].id).toBe('dieu-4');
    expect(clauses[3].text).toContain('nộp giữ bản chính Bằng tốt nghiệp Đại học');

    expect(clauses[4].id).toBe('dieu-5');
    expect(clauses[4].category).toBe('TERMINATION');
  });

  it('nhận diện chính xác hợp đồng thuê nhà (rental)', () => {
    const rentalContract = `
HỢP ĐỒNG THUÊ NHÀ Ở / PHÒNG TRỌ
Bên cho thuê: Ông Trần Văn B.
Bên thuê: Bà Lê Thị C.

Điều 1: Đối tượng thuê và giá thuê
- Cho thuê phòng trọ số 302 tại ngõ 123 đường Cầu Giấy, Hà Nội.
- Giá thuê nhà: 3.500.000 VNĐ / tháng.

Điều 2: Tiền đặt cọc
- Bên thuê đặt cọc 1 tháng tiền nhà là 3.500.000 VNĐ.
`;
    const category = ClauseSegmenter.detectCategory(rentalContract);
    expect(category).toBe('rental');

    const clauses = ClauseSegmenter.segment(rentalContract);
    expect(clauses).toHaveLength(2);
    expect(clauses[0].category).toBe('RENTAL_PRICE');
    expect(clauses[1].category).toBe('DEPOSIT');
  });

  it('xử lý an toàn khi văn bản rỗng hoặc không có cấu trúc Điều rõ ràng', () => {
    const emptyClauses = ClauseSegmenter.segment('');
    expect(emptyClauses).toEqual([]);

    const plainText = 'Đây là thỏa thuận viết tay không có chữ Điều. Đoạn 1.\n\nĐoạn 2 thỏa thuận về tiền vay.';
    const clauses = ClauseSegmenter.segment(plainText);
    expect(clauses.length).toBeGreaterThanOrEqual(1);
    expect(clauses[0].id).toBeDefined();
  });

  it('phân tách chính xác hợp đồng đánh số điều bằng chữ số La Mã (Minor M1)', () => {
    const romanContract = `
HỢP ĐỒNG THUÊ NHÀ
Điều I: Đối tượng và mục đích thuê
Thuê căn hộ chung cư mini tại Hà Nội.

Điều II: Thời hạn thuê và tiền cọc
Thời hạn thuê là 12 tháng, đặt cọc 5.000.000 VNĐ.

Điều III: Giá thuê và thanh toán
Giá thuê 5.000.000 VNĐ/tháng.
`;

    const clauses = ClauseSegmenter.segment(romanContract);
    expect(clauses).toHaveLength(3);
    expect(clauses[0].id).toBe('dieu-i');
    expect(clauses[0].title).toContain('Điều I');
    expect(clauses[1].id).toBe('dieu-ii');
    expect(clauses[2].id).toBe('dieu-iii');
  });
});
