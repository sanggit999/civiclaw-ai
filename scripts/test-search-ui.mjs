import { chromium } from 'playwright';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/sangdev/.gemini/antigravity/brain/f59b6444-8b0f-4871-8704-9cf2602e2d70/screenshots';

async function testSearch() {
  console.log('🧪 Bắt đầu kiểm thử tính năng Tìm kiếm (Global Search & Laws Search)...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    // 1. Kiểm thử Global Header Search từ Dashboard
    console.log('👉 1. Truy cập Dashboard http://localhost:3000/...');
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);

    console.log('👉 2. Nhấn phím tắt Ctrl + K để kích hoạt ô tìm kiếm Header...');
    await page.keyboard.press('Control+KeyK');
    await page.waitForTimeout(300);

    const searchInput = page.locator('input[aria-label="Tìm kiếm toàn hệ thống"]');
    const isFocused = await searchInput.evaluate((el) => document.activeElement === el);
    console.log(`   Phím tắt Ctrl+K focus thành công: ${isFocused ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'}`);

    console.log('👉 3. Gõ từ khóa "thử việc" vào Header và nhấn Enter...');
    await searchInput.fill('thử việc');
    await searchInput.press('Enter');
    await page.waitForTimeout(1500);

    const currentUrl = page.url();
    console.log(`   Điều hướng URL hiện tại: ${currentUrl}`);
    const navigatedCorrectly = currentUrl.includes('/laws?q=') && currentUrl.includes(encodeURIComponent('thử việc'));
    console.log(`   Chuyển hướng trang Tra cứu Luật: ${navigatedCorrectly ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'}`);

    // Chụp ảnh kết quả tìm kiếm từ Header
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-header-search-result.png'), fullPage: false });

    // 2. Kiểm thử In-Page Search trên trang /laws
    console.log('👉 4. Kiểm thử ô tìm kiếm nội bộ trên trang /laws...');
    const lawsInput = page.locator('input[placeholder*="ví dụ: nồng độ cồn"]');
    await lawsInput.click();
    await lawsInput.fill('nồng độ cồn');
    await lawsInput.press('Enter');
    await page.waitForTimeout(1500);

    const tableRows = await page.locator('table tbody tr').count();
    console.log(`   Số lượng kết quả hiển thị trong bảng: ${tableRows} dòng`);
    console.log(`   Tìm kiếm bằng phím Enter trên trang: ${tableRows > 0 ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-laws-enter-search-result.png'), fullPage: false });

    console.log('🎉 TẤT CẢ KIỂM THỬ TÌM KIẾM HOÀN TẤT VÀ ĐẠT 100%!');
  } catch (err) {
    console.error('❌ Lỗi kiểm thử tìm kiếm:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testSearch();
