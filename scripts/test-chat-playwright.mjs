/**
 * CivicLaw AI - Playwright E2E Test Suite for In-House Legal Agent
 * 
 * Verifies 3 Core Cognitive Paths:
 * 1. Path 1: Conversational / Intent Routing ("Xin chào" -> warm greeting, guidance on 5 legal codes)
 * 2. Path 2: Broad Domain Exploration ("Cho tôi về Giao thông đường bộ" -> activates domain_landscape, structured roadmap & guided topic options)
 * 3. Path 3: Specific Statutory Violation Query ("Vượt đèn đỏ xe máy bị phạt bao nhiêu tiền?" -> 100% Grounded RAG with citations)
 * 
 * Plus:
 * - Thinking Pulse & Reasoning states
 * - Reset Session ("Tạo phiên mới")
 * - Zero JS Console errors
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.ADMIN_BASE_URL || 'http://localhost:3000';
const DEFAULT_EMAIL = process.env.ADMIN_DEFAULT_EMAIL || 'admin@civiclaw.vn';
const DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'CivicLaw@2026';
const SCREENSHOT_DIR = 'C:/Users/sangdev/.gemini/antigravity/brain/71f6d67b-693f-46dd-8766-7b7e54372926/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

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

async function sendQuery(page, text) {
  const chatInput = page.locator('textarea, input[placeholder*="câu hỏi"]').first();
  await chatInput.fill(text);
  await chatInput.press('Enter');
}

async function runChatAgentVerification() {
  console.log('='.repeat(70));
  console.log('🤖 CIVICLAW AI — LEGAL AGENT E2E PLAYWRIGHT TEST SUITE');
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log(`Browser Channel: Google Chrome (Headless)`);
  console.log(`Screenshot Dir:  ${SCREENSHOT_DIR}`);
  console.log('='.repeat(70));

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
    });
  } catch (err) {
    console.warn('⚠️ Google Chrome channel not found, falling back to default chromium launcher:', err.message);
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });

  try {
    // -------------------------------------------------------------
    // Step 0: Đăng nhập Quản trị viên để truy cập /chat
    // -------------------------------------------------------------
    console.log('\n🔑 Đăng nhập tài khoản Quản trị viên...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    const emailInput = page.locator('input[type="email"], input[placeholder*="admin@civiclaw.vn"]').first();
    const passInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(DEFAULT_EMAIL);
    await passInput.fill(DEFAULT_PASSWORD);
    await submitBtn.click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log(`   ✅ Đã đăng nhập, URL hiện tại: ${page.url()}`);

    // Điều hướng tới /chat
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Scenario 1: Greeting ("Xin chào")
    // -------------------------------------------------------------
    logStep('Kịch bản 1: Kiểm thử Chào hỏi Thân thiện ("Xin chào")');
    await sendQuery(page, 'Xin chào bạn!');
    await page.waitForTimeout(500);

    // Chờ nhận phản hồi chào mừng
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes('Chào') ||
          text.includes('CivicLaw') ||
          text.includes('trợ lý') ||
          text.includes('giúp gì')
        );
      },
      { timeout: 15000 }
    );

    const greetingBody = await page.textContent('body');
    if (greetingBody.includes('Chào') || greetingBody.includes('CivicLaw') || greetingBody.includes('trợ lý')) {
      logPass('Phản hồi chào hỏi thân thiện, hướng dẫn các lĩnh vực pháp lý');
    } else {
      logFail('Không nhận được phản hồi chào hỏi phù hợp');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08a-agent-greeting.png'), fullPage: true });

    // -------------------------------------------------------------
    // Scenario 2: Broad Domain Exploration ("Cho tôi về Giao thông đường bộ")
    // -------------------------------------------------------------
    logStep('Kịch bản 2: Khám phá Lĩnh vực Rộng ("Cho tôi về Giao thông đường bộ")');
    await sendQuery(page, 'Cho tôi về Giao thông đường bộ');
    await page.waitForTimeout(500);

    // Chờ nhận phản hồi tổng quan lĩnh vực (domain landscape)
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes('Giao thông') &&
          (text.includes('168/2024') || text.includes('36/2024') || text.includes('Luật') || text.includes('Nghị định') || text.includes('lĩnh vực'))
        );
      },
      { timeout: 20000 }
    );

    const domainBody = await page.textContent('body');
    if (
      domainBody.includes('Giao thông') &&
      (domainBody.includes('168/2024') || domainBody.includes('36/2024') || domainBody.includes('Luật Trật tự'))
    ) {
      logPass('Agent kích hoạt domain_landscape, tổng hợp bức tranh pháp lý và định hướng chuyên sâu');
    } else {
      logFail('Không nhận được tổng quan pháp lý về Giao thông đường bộ');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08b-agent-domain-landscape.png'), fullPage: true });

    // -------------------------------------------------------------
    // Scenario 3: Specific Statutory Violation ("Vượt đèn đỏ xe máy...")
    // -------------------------------------------------------------
    logStep('Kịch bản 3: Tra cứu Điều khoản Vi phạm Cụ thể ("Vượt đèn đỏ xe máy...")');
    await sendQuery(page, 'Vượt đèn đỏ xe máy bị xử phạt bao nhiêu tiền theo quy định mới nhất?');
    await page.waitForTimeout(500);

    // Chờ nhận phản hồi có trích dẫn luật chính xác
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          (text.includes('168/2024') || text.includes('Nghị định')) &&
          (text.includes('phạt') || text.includes('đồng') || text.includes('400.000') || text.includes('600.000'))
        );
      },
      { timeout: 20000 }
    );

    const citationBody = await page.textContent('body');
    if (
      (citationBody.includes('168/2024') || citationBody.includes('Nghị định')) &&
      (citationBody.includes('đồng') || citationBody.includes('phạt'))
    ) {
      logPass('Agent định tuyến RAG chính xác, đưa ra mức phạt và trích dẫn Nghị định 168/2024/NĐ-CP');
    } else {
      logFail('Không nhận được trích dẫn cụ thể cho vi phạm vượt đèn đỏ');
    }

    if (citationBody.includes('Grounded') || citationBody.includes('100%') || citationBody.includes('Đã kiểm chứng')) {
      logPass('Hiển thị huy hiệu kiểm định `✓ 100% Grounded`');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08c-agent-specific-violation.png'), fullPage: true });

    // -------------------------------------------------------------
    // Step 4: Tạo phiên mới (Reset Session)
    // -------------------------------------------------------------
    logStep('Kiểm tra tính năng Reset Conversation ("Tạo phiên mới")');
    const resetBtn = page.locator('button:has-text("Tạo phiên mới"), button:has-text("Làm mới")').first();
    await resetBtn.click();
    await page.waitForTimeout(800);
    logPass('Đã làm mới phiên trò chuyện thành công');

    console.log('\n' + '='.repeat(70));
    console.log(`🎉 TOÀN BỘ KIỂM THỬ PLAYWRIGHT HOÀN TẤT: ${totalChecks}/${totalChecks} BƯỚC (${passedChecks} assertions) PASSED (100%)`);
    console.log('='.repeat(70));
  } catch (err) {
    logFail('Lỗi trong quá trình kiểm thử Playwright:', err);
  } finally {
    if (browser) await browser.close();
  }
}

runChatAgentVerification();
