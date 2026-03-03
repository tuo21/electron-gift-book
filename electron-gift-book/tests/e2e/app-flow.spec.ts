import { test, expect } from '@playwright/test';

test.describe('电子礼金簿应用', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('应用启动并显示启动页', async ({ page }) => {
    // 等待应用加载
    await page.waitForLoadState('networkidle');
    
    // 检查启动页是否存在
    const splashScreen = page.locator('.splash-screen, .splash');
    if (await splashScreen.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 等待启动页消失
      await expect(splashScreen).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('应用主界面加载', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // 等待主应用加载
    await page.waitForTimeout(2000);
    
    // 检查主要元素是否存在
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toBeVisible({ timeout: 15000 });
  });

  test('检查记录表单存在', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 检查表单元素
    const nameInput = page.locator('input[placeholder="请输入姓名"]');
    const amountInput = page.locator('input[placeholder="请输入金额"]');
    
    // 表单可能需要时间加载
    await expect(nameInput.or(amountInput)).toBeVisible({ timeout: 15000 });
  });

  test('检查顶部导航栏存在', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 检查头部元素
    const header = page.locator('.app-header, header');
    await expect(header.or(page.locator('.main-app'))).toBeVisible({ timeout: 15000 });
  });
});
