// 负页面测试脚本 — iOS 风格前端
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5173';
const SHOTS = path.resolve('test_screenshots');

// 模拟 iPhone 14 Pro 视口
const VIEWPORT = { width: 390, height: 844 };

function log(...args) {
  console.log(`[${new Date().toISOString().slice(11,19)}]`, ...args);
}

async function shot(page, name) {
  const p = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  log(`  截图已保存: ${name}.png`);
}

async function runTest(name, fn) {
  log(`\n=== ${name} ===`);
  try {
    await fn();
    log(`  ✓ 通过`);
  } catch (e) {
    log(`  ✗ 失败: ${e.message}`);
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 3 });
  const page = await ctx.newPage();

  // ==============================================
  // 1. 登录页 — 负场景测试
  // ==============================================
  await runTest('登录页 — 空表单提交', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await shot(page, '01-login-empty');

    // 查找按钮并点击第一个
    const buttons = page.locator('button');
    const count = await buttons.count();
    log(`  页面按钮数: ${count}`);

    if (count > 0) {
      await buttons.first().click();
      await page.waitForTimeout(500);
      await shot(page, '02-login-empty-submit');
    }
  });

  await runTest('登录页 — 只有密码没有用户名', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    // 尝试填充用户名/密码框
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    log(`  输入框数量: ${inputCount}`);

    if (inputCount >= 2) {
      await inputs.nth(0).fill(''); // 用户名留空
      await inputs.nth(1).fill('password123');
      await page.waitForTimeout(300);
      await shot(page, '03-login-password-only');

      // 点击登录按钮
      const btns = page.locator('button');
      await btns.first().click();
      await page.waitForTimeout(500);
      await shot(page, '04-login-password-only-submit');
    } else if (inputCount === 1) {
      await inputs.first().fill('testuser');
      // 看看是否有其他输入方式
      await shot(page, '03-login-single-input');
    }
  });

  await runTest('登录页 — 用户名密码都填（模拟表单）', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const inputs = page.locator('input');
    const ic = await inputs.count();

    // 按顺序填充所有输入框
    for (let i = 0; i < ic; i++) {
      const placeholder = await inputs.nth(i).getAttribute('placeholder') || '';
      const type = await inputs.nth(i).getAttribute('type') || '';
      log(`  input[${i}]: type=${type} placeholder="${placeholder}"`);
    }

    // 全部填测试数据再提交
    if (ic >= 2) {
      await inputs.nth(0).fill('test@example.com');
      await inputs.nth(1).fill('password123');
      await page.waitForTimeout(200);
      await shot(page, '05-login-filled');

      const btns = page.locator('button');
      const bc = await btns.count();
      for (let i = 0; i < bc; i++) {
        const txt = (await btns.nth(i).textContent())?.trim() || '';
        log(`  button[${i}]: "${txt}"`);
      }
    } else if (ic === 1) {
      await inputs.first().fill('testuser');
      await shot(page, '05-login-filled');
    }
  });

  // ==============================================
  // 2. 404 / 不存在的页面
  // ==============================================
  await runTest('不存在的路由 /nonexistent', async () => {
    const resp = await page.goto(`${BASE}/nonexistent`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const url = page.url();
    log(`  当前 URL: ${url}`);

    // 检查是否显示了 TabBar
    const tabBar = page.locator('[class*="tab"], [class*="TabBar"], nav, [class*="bottom"]');
    const tbCount = await tabBar.count();
    log(`  可能存在的导航元素数: ${tbCount}`);
    await shot(page, '06-404-unknown-route');
  });

  // ==============================================
  // 3. 首页 — 确保能正常加载
  // ==============================================
  await runTest('首页加载', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, '07-home-page');
  });

  // ==============================================
  // 4. 游戏页 — 无状态测试
  // ==============================================
  await runTest('游戏页加载', async () => {
    await page.goto(`${BASE}/game`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, '08-game-page');

    // 检查页面文本内容
    const bodyText = await page.locator('body').textContent();
    log(`  页面文本长度: ${bodyText.length} 字符`);
  });

  // ==============================================
  // 5. 农场页 — 无数据测试
  // ==============================================
  await runTest('农场页加载', async () => {
    await page.goto(`${BASE}/farm`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, '09-farm-page');
  });

  // ==============================================
  // 6. 多媒体页 — 无媒体数据
  // ==============================================
  await runTest('多媒体页加载', async () => {
    await page.goto(`${BASE}/media`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, '10-media-page');
  });

  // ==============================================
  // 7. 监控页 — 无管理员权限
  // ==============================================
  await runTest('监控页加载', async () => {
    await page.goto(`${BASE}/monitor`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, '11-monitor-page');
  });

  // ==============================================
  // 8. 设置页
  // ==============================================
  await runTest('设置页加载', async () => {
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, '12-settings-page');
  });

  // ==============================================
  // 9. TabBar 导航测试
  // ==============================================
  await runTest('TabBar 导航 — 逐个点击', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // 点击所有 TabBar 底部按钮
    const tabs = page.locator('[class*="tab"], button, a');
    const tabCount = await tabs.count();
    log(`  页面可点击元素数: ${tabCount}`);

    // 尝试通过页面底部的标签进行导航
    // 先看看是否有 TabBar 文本
    const bodyText = await page.locator('body').textContent();
    const tabNames = ['首页', '游戏', '农场', '多媒体', '设置', 'Home', 'Game', 'Farm', 'Media', 'Settings'];
    for (const name of tabNames) {
      if (bodyText.includes(name)) {
        log(`  页面包含 "${name}" 文本`);
      }
    }

    await shot(page, '13-tabbar-view');
  });

  // ==============================================
  // 10. 多页面切换 — 路由稳定性
  // ==============================================
  await runTest('多页面快速切换', async () => {
    const routes = ['/', '/game', '/farm', '/media', '/settings', '/monitor'];
    for (const route of routes) {
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.waitForTimeout(300);
        log(`  ${route} → ${page.url()} (${await page.title() || 'no title'})`);
      } catch (e) {
        log(`  ${route} → 加载异常: ${e.message.substring(0, 60)}`);
      }
    }
    await shot(page, '14-routing-test');
  });

  await browser.close();
  log('\n=== 全部测试完成 ===');

  // 列出截图
  const files = fs.readdirSync(SHOTS).filter(f => f.endsWith('.png')).sort();
  log(`共生成 ${files.length} 张截图:`);
  files.forEach(f => log(`  ${f}`));
})();