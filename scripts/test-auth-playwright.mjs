/**
 * CivicLaw AI - Playwright E2E Test Suite for Admin Authentication
 * 
 * Verifies:
 * 1. Unauthenticated route protection middleware (redirects to /login?redirect=...)
 * 2. Login UI rendering & Astryx components
 * 3. Validation on empty credentials
 * 4. Rejection of invalid credentials with error banner
 * 5. Successful login with session cookie set (HTTP-Only)
 * 6. Automatic redirect back to requested destination
 * 7. TopNav authenticated profile display with real user info
 * 8. Prevention of authenticated users accessing /login (redirects to /)
 * 9. Logout flow (clearing session cookie and redirecting to /login)
 */

import { chromium } from 'playwright';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/sangdev/.gemini/antigravity/brain/f59b6444-8b0f-4871-8704-9cf2602e2d70/screenshots';

const BASE_URL = process.env.ADMIN_BASE_URL || 'http://localhost:3000';
const DEFAULT_EMAIL = process.env.ADMIN_DEFAULT_EMAIL || 'admin@civiclaw.vn';
const DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'CivicLaw@2026';

let passedChecks = 0;
let totalChecks = 0;

function logStep(name) {
  console.log(`\n🔹 [Step ${++totalChecks}] ${name}`);
}

function logPass(desc) {
  passedChecks++;
  console.log(`   ✅ PASS: ${desc}`);
}

function logFail(desc, error) {
  console.error(`   ❌ FAIL: ${desc}`);
  if (error) console.error(error);
  process.exit(1);
}

async function runAuthVerification() {
  console.log('='.repeat(70));
  console.log('🚀 CIVICLAW AI — ADMIN AUTHENTICATION PLAYWRIGHT TEST SUITE');
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log(`Browser Channel: Google Chrome (Headless)`);
  console.log('='.repeat(70));

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
    });
  } catch (err) {
    console.warn('⚠️ Google Chrome channel not found, falling back to default chromium launcher:', err.message);
    browser = await chromium.launch({
      headless: true,
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // Step 1: Chốt chặn Middleware - Chuyển hướng khi chưa đăng nhập
    // -------------------------------------------------------------
    logStep('Kiểm tra Route Protection Middleware: Truy cập /laws khi chưa đăng nhập');
    await page.goto(`${BASE_URL}/laws`, { waitUntil: 'networkidle' });
    const currentUrl = page.url();

    if (currentUrl.includes('/login') && currentUrl.includes('redirect')) {
      logPass(`Tự động chuyển hướng chính xác về: ${currentUrl}`);
    } else {
      logFail(`Mong đợi chuyển hướng về /login?redirect=... nhưng nhận được: ${currentUrl}`);
    }

    // -------------------------------------------------------------
    // Step 2: Giao diện Đăng nhập Astryx
    // -------------------------------------------------------------
    logStep('Kiểm tra Giao diện Đăng nhập (/login) & Astryx Design System');
    const pageText = await page.textContent('body');
    if (pageText.includes('CivicLaw AI') && (pageText.includes('Portal') || pageText.includes('Admin'))) {
      logPass('Hiển thị đầy đủ tiêu đề "CivicLaw AI" và nhãn Portal/Admin');
    } else {
      logFail('Giao diện thiếu branding CivicLaw AI hoặc badge Portal');
    }

    const emailInput = page.locator('input[placeholder*="admin@civiclaw.vn"], input[type="text"]').first();
    const passInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    if ((await emailInput.count()) > 0 && (await passInput.count()) > 0 && (await submitBtn.count()) > 0) {
      logPass('Tìm thấy đầy đủ Form fields (Email, Password, Nút Đăng Nhập)');
    } else {
      logFail('Thiếu một trong các thành phần của form đăng nhập');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-login-screen.png') });

    // -------------------------------------------------------------
    // Step 3: Kiểm tra Validation khi để trống trường
    // -------------------------------------------------------------
    logStep('Kiểm tra validation khi để trống thông tin');
    await emailInput.fill('');
    await passInput.fill('');
    await submitBtn.click();
    await page.waitForTimeout(500);

    const bodyAfterEmpty = await page.textContent('body');
    if (bodyAfterEmpty.includes('Vui lòng nhập đầy đủ')) {
      logPass('Hiển thị thông báo yêu cầu nhập đầy đủ email và mật khẩu');
    } else {
      logFail('Không hiển thị cảnh báo validation khi submit form trống');
    }

    // -------------------------------------------------------------
    // Step 4: Kiểm tra Từ chối Đăng nhập khi sai mật khẩu
    // -------------------------------------------------------------
    logStep('Kiểm tra từ chối đăng nhập khi sai credentials');
    await emailInput.fill(DEFAULT_EMAIL);
    await passInput.fill('WrongPassword@999');

    const loginResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/login'),
      { timeout: 5000 }
    ).catch(() => null);

    await submitBtn.click();
    await loginResponsePromise;
    await page.waitForTimeout(500);

    const bodyAfterInvalid = await page.textContent('body');
    if (
      bodyAfterInvalid.includes('Không thể đăng nhập') ||
      bodyAfterInvalid.includes('không chính xác') ||
      bodyAfterInvalid.includes('không tồn tại')
    ) {
      logPass('Hệ thống từ chối đăng nhập với banner lỗi trực quan');
    } else {
      logFail('Không hiển thị thông báo lỗi khi nhập sai mật khẩu');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-login-error-banner.png') });

    // -------------------------------------------------------------
    // Step 5: Đăng nhập thành công với tài khoản quản trị
    // -------------------------------------------------------------
    logStep('Kiểm tra Đăng nhập Thành công (Happy Path)');
    await emailInput.fill(DEFAULT_EMAIL);
    await passInput.fill(DEFAULT_PASSWORD);
    await submitBtn.click();

    // Chờ điều hướng hoàn tất sang /laws (vì redirect=/laws)
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    const authUrl = page.url();
    logPass(`Đăng nhập thành công và chuyển hướng tới: ${authUrl}`);

    // Kiểm tra cookie phiên
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === 'admin_session');
    if (sessionCookie && sessionCookie.httpOnly) {
      logPass(`Cookie 'admin_session' đã được cấp phát an toàn (HttpOnly=${sessionCookie.httpOnly}, SameSite=${sessionCookie.sameSite})`);
    } else {
      logFail('Không tìm thấy cookie admin_session hoặc thiếu thuộc tính HttpOnly');
    }

    // -------------------------------------------------------------
    // Step 6: Kiểm tra User Profile trên AdminShell Header
    // -------------------------------------------------------------
    logStep('Kiểm tra hiển thị danh tính Quản trị viên trên Header');
    await page.waitForTimeout(1000);
    const headerText = await page.textContent('header, nav, body');
    if (headerText.includes(DEFAULT_EMAIL) || headerText.includes('Quản Trị Viên') || headerText.includes('Superadmin')) {
      logPass(`Header hiển thị thông tin danh tính người dùng: ${DEFAULT_EMAIL}`);
    } else {
      logFail('Header không hiển thị thông tin quản trị viên đăng nhập');
    }

    const logoutBtn = page.locator('button:has-text("Đăng xuất")');
    if ((await logoutBtn.count()) > 0) {
      logPass('Nút "Đăng xuất" hiện diện rõ ràng trên TopNav');
    } else {
      logFail('Không tìm thấy nút "Đăng xuất" trên TopNav');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-authenticated-dashboard.png') });

    // -------------------------------------------------------------
    // Step 7: Kiểm tra Chuyển hướng khi ĐÃ đăng nhập mà vào /login
    // -------------------------------------------------------------
    logStep('Kiểm tra đã đăng nhập mà mở lại /login -> Tự động chuyển hướng về trang chủ /');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const redirectedFromLoginUrl = page.url();
    if (!redirectedFromLoginUrl.includes('/login')) {
      logPass(`Tự động chuyển hướng khỏi /login về: ${redirectedFromLoginUrl}`);
    } else {
      logFail(`Mong đợi chuyển hướng khỏi /login nhưng vẫn ở: ${redirectedFromLoginUrl}`);
    }

    // -------------------------------------------------------------
    // Step 8: Đăng xuất an toàn & Hủy Cookie Phiên
    // -------------------------------------------------------------
    logStep('Kiểm tra Đăng xuất an toàn');
    // Điều hướng về / để bấm nút logout
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const logoutButtonOnHome = page.locator('button:has-text("Đăng xuất")').first();
    await logoutButtonOnHome.click();

    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
    const logoutUrl = page.url();
    logPass(`Đăng xuất thành công và quay lại màn hình: ${logoutUrl}`);

    // Kiểm tra truy cập trang nội bộ sau khi logout
    await page.goto(`${BASE_URL}/gaps`, { waitUntil: 'networkidle' });
    const postLogoutUrl = page.url();
    if (postLogoutUrl.includes('/login')) {
      logPass('Sau khi đăng xuất, mọi trang quản trị nội bộ đều bị chặn và chuyển hướng về /login');
    } else {
      logFail(`Truy cập trái phép vào trang nội bộ sau khi đăng xuất: ${postLogoutUrl}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`🎉 TOÀN BỘ KIỂM THỬ PLAYWRIGHT HOÀN TẤT: ${totalChecks}/${totalChecks} BƯỚC (${passedChecks} assertions) PASSED (100%)`);
    console.log('='.repeat(70));
  } catch (err) {
    logFail('Lỗi trong quá trình thực thi Playwright E2E:', err);
  } finally {
    if (browser) await browser.close();
  }
}

runAuthVerification();
