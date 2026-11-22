import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/sangdev/.gemini/antigravity/brain/f59b6444-8b0f-4871-8704-9cf2602e2d70/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAudit() {
  console.log('🚀 Khởi động Playwright với Google Chrome...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    // 1. Dashboard
    console.log('📸 1. Chụp ảnh Dashboard (/)...');
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard.png'), fullPage: true });

    // 2. Laws Browser
    console.log('📸 2. Chụp ảnh Tra cứu Kho Luật (/laws)...');
    await page.goto('http://localhost:3000/laws', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-laws-list.png'), fullPage: true });

    // 2b. Mở Drawer xem toàn văn điều khoản
    console.log('📸 2b. Mở Drawer xem toàn văn điều khoản luật...');
    const detailBtn = page.locator('button:has-text("Chi tiết"), button:has-text("Xem toàn văn")').first();
    if (await detailBtn.count() > 0) {
      await detailBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02b-laws-modal-detail.png'), fullPage: false });
      // Đóng drawer
      const closeBtn = page.locator('button:has-text("Đóng")').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);
    }

    // 3. Knowledge Gaps
    console.log('📸 3. Chụp ảnh Khoảng Trống Tri Thức (/gaps)...');
    await page.goto('http://localhost:3000/gaps', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-gaps-list.png'), fullPage: true });

    // 3b. Kiểm tra EmptyState khi chọn Tab "Đã bỏ qua"
    console.log('📸 3b. Kiểm tra EmptyState của Tab Đã bỏ qua...');
    const ignoredTab = page.locator('button:has-text("Đã bỏ qua")').first();
    if (await ignoredTab.count() > 0) {
      await ignoredTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-gaps-empty-state.png'), fullPage: true });
    }

    // 4. Chat Sessions & Grounded Audit
    console.log('📸 4. Chụp ảnh Kiểm Toán Phiên AI (/sessions)...');
    await page.goto('http://localhost:3000/sessions', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-sessions-audit.png'), fullPage: true });

    // 5. Contract Auditor Playground
    console.log('📸 5. Chụp ảnh Sân Thử Nghiệm Hợp Đồng (/contracts)...');
    await page.goto('http://localhost:3000/contracts', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    // Bấm nút chạy kiểm toán
    const auditBtn = page.locator('button:has-text("Chạy Kiểm Toán Pháp Lý")').first();
    if (await auditBtn.count() > 0) {
      await auditBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-contracts-audit-result.png'), fullPage: true });

    console.log('✅ Hoàn thành chụp ảnh toàn bộ 5 trang!');
  } catch (err) {
    console.error('❌ Lỗi Playwright:', err);
  } finally {
    await browser.close();
  }
}

runAudit();
