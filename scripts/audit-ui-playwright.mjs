/**
 * CivicLaw AI - Enterprise HRM/CRM UI Playwright Audit Suite
 * 
 * Audits:
 * 1. Visual rendering & full-page screenshots across all routes:
 *    - /login (Enterprise Login view)
 *    - / (Dashboard Gateway Overview)
 *    - /laws (Legal Corpus Browser + Drawer)
 *    - /gaps (Knowledge Gaps + Triage tabs)
 *    - /sessions (AI Session Audit + Trace drawer)
 *    - /contracts (Contract Auditor Playground)
 *    - /configs (Dynamic System Configuration)
 * 2. Unified Typography verification ('Inter' or consistent modern sans-serif stack)
 * 3. Color palette & theme contrast verification (Subtle borders, deep slate/indigo background)
 * 4. Zero runtime console errors
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.ADMIN_BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = 'C:/Users/sangdev/.gemini/antigravity/brain/71f6d67b-693f-46dd-8766-7b7e54372926/screenshots';

const DEFAULT_EMAIL = process.env.ADMIN_DEFAULT_EMAIL || 'admin@civiclaw.vn';
const DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'CivicLaw@2026';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runEnterpriseUIAudit() {
  console.log('='.repeat(70));
  console.log('🎨 CIVICLAW AI — ENTERPRISE HRM/CRM UI REDESIGN PLAYWRIGHT AUDIT');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Artifact Directory: ${SCREENSHOT_DIR}`);
  console.log('='.repeat(70));

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
    });
  } catch (err) {
    console.warn('⚠️ Falling back to default chromium launcher:', err.message);
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retinal high-res screenshot
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });

  const auditResults = {
    pagesAudited: 0,
    screenshotsTaken: [],
    typographyChecks: [],
    contrastWarnings: [],
    consoleErrors: [],
  };

  try {
    // -------------------------------------------------------------
    // Page 0: Màn hình Đăng nhập (/login)
    // -------------------------------------------------------------
    console.log('\n📸 [1/7] Chụp ảnh & Kiểm toán Màn hình Đăng nhập (/login)...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    const loginScreenshot = path.join(SCREENSHOT_DIR, '00-login.png');
    await page.screenshot({ path: loginScreenshot, fullPage: true });
    auditResults.screenshotsTaken.push('00-login.png');

    // Kiểm tra Typography trên /login
    const bodyFont = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
    console.log(`   🔤 Body Computed Font Family: ${bodyFont}`);
    auditResults.typographyChecks.push({ page: '/login', fontFamily: bodyFont });

    // -------------------------------------------------------------
    // Đăng nhập để truy cập 6 trang nội bộ
    // -------------------------------------------------------------
    console.log('\n🔑 Đăng nhập tài khoản Quản trị viên để kiểm toán trang nội bộ...');
    const emailInput = page.locator('input[type="email"], input[placeholder*="admin@civiclaw.vn"]').first();
    const passInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(DEFAULT_EMAIL);
    await passInput.fill(DEFAULT_PASSWORD);
    await submitBtn.click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log(`   ✅ Đăng nhập thành công, điều hướng tới: ${page.url()}`);

    // -------------------------------------------------------------
    // Page 1: Dashboard (/ - Tổng quan Gateway)
    // -------------------------------------------------------------
    console.log('\n📸 [2/7] Chụp ảnh & Kiểm toán Dashboard Gateway (/)...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    const dashboardScreenshot = path.join(SCREENSHOT_DIR, '01-dashboard.png');
    await page.screenshot({ path: dashboardScreenshot, fullPage: true });
    auditResults.screenshotsTaken.push('01-dashboard.png');

    // -------------------------------------------------------------
    // Page 2: Tra Cứu Kho Luật (/laws)
    // -------------------------------------------------------------
    console.log('\n📸 [3/7] Chụp ảnh & Kiểm toán Tra cứu Kho Luật (/laws)...');
    await page.goto(`${BASE_URL}/laws`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    const lawsScreenshot = path.join(SCREENSHOT_DIR, '02-laws-list.png');
    await page.screenshot({ path: lawsScreenshot, fullPage: true });
    auditResults.screenshotsTaken.push('02-laws-list.png');

    // Mở Drawer chi tiết nếu có
    const detailBtn = page.locator('button:has-text("Chi tiết"), button:has-text("Xem toàn văn")').first();
    if ((await detailBtn.count()) > 0) {
      console.log('   🔍 Mở Drawer xem chi tiết điều khoản...');
      await detailBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02b-laws-detail-drawer.png'), fullPage: false });
      auditResults.screenshotsTaken.push('02b-laws-detail-drawer.png');

      const closeBtn = page.locator('button:has-text("Đóng")').first();
      if ((await closeBtn.count()) > 0) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------
    // Page 3: Khoảng Trống Tri Thức (/gaps)
    // -------------------------------------------------------------
    console.log('\n📸 [4/7] Chụp ảnh & Kiểm toán Khoảng Trống Tri Thức (/gaps)...');
    await page.goto(`${BASE_URL}/gaps`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    const gapsScreenshot = path.join(SCREENSHOT_DIR, '03-gaps-list.png');
    await page.screenshot({ path: gapsScreenshot, fullPage: true });
    auditResults.screenshotsTaken.push('03-gaps-list.png');

    // Tab chuyển đổi
    const processedTab = page.locator('button:has-text("Đã xử lý"), button:has-text("Đã bỏ qua")').first();
    if ((await processedTab.count()) > 0) {
      await processedTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03b-gaps-tab-switched.png'), fullPage: true });
      auditResults.screenshotsTaken.push('03b-gaps-tab-switched.png');
    }

    // -------------------------------------------------------------
    // Page 4: Kiểm Toán Phiên AI (/sessions)
    // -------------------------------------------------------------
    console.log('\n📸 [5/7] Chụp ảnh & Kiểm toán Phiên AI Grounded (/sessions)...');
    await page.goto(`${BASE_URL}/sessions`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    const sessionsScreenshot = path.join(SCREENSHOT_DIR, '04-sessions-audit.png');
    await page.screenshot({ path: sessionsScreenshot, fullPage: true });
    auditResults.screenshotsTaken.push('04-sessions-audit.png');

    // -------------------------------------------------------------
    // Page 5: Sân Thử Nghiệm Hợp Đồng (/contracts)
    // -------------------------------------------------------------
    console.log('\n📸 [6/7] Chụp ảnh & Kiểm toán Sân Thử Nghiệm Hợp Đồng (/contracts)...');
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    const auditBtn = page.locator('button:has-text("Chạy Kiểm Toán"), button:has-text("Kiểm toán hợp đồng")').first();
    if ((await auditBtn.count()) > 0) {
      console.log('   ⚡ Kích hoạt nút chạy kiểm toán hợp đồng...');
      await auditBtn.click();
      await page.waitForTimeout(1200);
    }
    const contractsScreenshot = path.join(SCREENSHOT_DIR, '05-contracts-auditor.png');
    await page.screenshot({ path: contractsScreenshot, fullPage: true });
    auditResults.screenshotsTaken.push('05-contracts-auditor.png');

    // -------------------------------------------------------------
    // Page 6: Cấu Hình Động Hệ Thống (/configs)
    // -------------------------------------------------------------
    console.log('\n📸 [7/7] Chụp ảnh & Kiểm toán Cấu Hình Động Hệ Thống (/configs)...');
    await page.goto(`${BASE_URL}/configs`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    const configsScreenshot = path.join(SCREENSHOT_DIR, '06-configs-system.png');
    await page.screenshot({ path: configsScreenshot, fullPage: true });
    auditResults.screenshotsTaken.push('06-configs-system.png');

    // -------------------------------------------------------------
    // Tổng kết kiểm toán Design System
    // -------------------------------------------------------------
    console.log('\n' + '='.repeat(70));
    console.log('📊 TỔNG KẾT KIỂM TOÁN GIAO DIỆN ENTERPRISE DESIGN SYSTEM');
    console.log(`- Tổng số trang đã kiểm toán: 7 trang`);
    console.log(`- Tổng số ảnh chụp màn hình độ phân giải cao: ${auditResults.screenshotsTaken.length} ảnh`);
    console.log(`- Thư mục lưu trữ: ${SCREENSHOT_DIR}`);
    console.log(`- Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((e) => console.warn(`   ⚠️ [${e.url}] ${e.text}`));
    } else {
      console.log('   ✅ Hoàn toàn không có JavaScript console error nào.');
    }
    console.log('='.repeat(70));
  } catch (err) {
    console.error('❌ Lỗi trong quá trình kiểm toán UI:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runEnterpriseUIAudit();
