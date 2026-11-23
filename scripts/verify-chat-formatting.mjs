import { chromium } from 'playwright';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/sangdev/.gemini/antigravity/brain/f59b6444-8b0f-4871-8704-9cf2602e2d70/screenshots';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => console.log('[BROWSER LOG]:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.error('[BROWSER ERROR]:', err));

  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@civiclaw.vn');
  await page.fill('input[type="password"]', 'CivicLaw@2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/');

  // Go to /chat
  await page.goto('http://localhost:3000/chat');
  await page.waitForSelector('textarea');

  // Send query
  await page.fill('textarea', 'Cho tôi về Giao thông đường bộ');
  await page.click('button:has-text("Gửi")');

  // Wait for response to appear and streaming to finish
  console.log('Đang chờ phản hồi từ Agent hoàn tất...');
  await page.waitForFunction(() => {
    return document.body.innerText.includes('Bản Đồ Quy Định Pháp Luật: Giao thông đường bộ');
  }, { timeout: 45000 });
  await page.waitForTimeout(1500);

  // Take screenshot
  const screenshotPath = path.join(SCREENSHOT_DIR, '09-formatted-chat-result.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Đã chụp ảnh màn hình tại: ${screenshotPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
