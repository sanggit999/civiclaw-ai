/**
 * Làm sạch văn bản luật thô, loại bỏ các dòng rác tiêu ngữ, số trang, khoảng trắng dư thừa
 * 
 * @param rawText Văn bản luật thô tải về từ PDF/HTML
 * @returns Văn bản đã được làm sạch
 */
export function cleanLegalText(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText;

  // 0. Giải mã các thực thể HTML (HTML entities) và loại bỏ ký tự vô hình (Zero-width chars, BOM)
  cleaned = cleaned
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Khử zero-width space gây lỗi nhận diện Điều/Khoản
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // 1. Loại bỏ Quốc hiệu, Tiêu ngữ
  cleaned = cleaned.replace(
    /CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\s*[\r\n]+\s*Độc lập\s*-\s*Tự do\s*-\s*Hạnh phúc/gi,
    ''
  );

  // 2. Loại bỏ các dòng đánh số trang dạng "Trang X/Y" hoặc "Trang X"
  cleaned = cleaned.replace(/Trang\s+\d+(\s*\/\s*\d+)?/gi, '');

  // 3. Loại bỏ các dòng chỉ chứa số trang đứng riêng lẻ (ví dụ: dòng chỉ có "25")
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');

  // 4. Chuẩn hóa khoảng trắng dư thừa nhưng vẫn giữ cấu trúc dòng
  cleaned = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line, idx, arr) => {
      // Giữ tối đa 1 dòng trống liên tiếp
      if (line === '' && arr[idx - 1] === '') return false;
      return true;
    })
    .join('\n');

  return cleaned.trim();
}
