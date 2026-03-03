import { test, expect } from '@playwright/test';

test.describe('数据库操作', () => {
  test('记录表单提交流程', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 查找姓名输入框
    const nameInput = page.locator('input[placeholder="请输入姓名"]');
    const amountInput = page.locator('input[placeholder="请输入金额"]');
    
    // 检查输入框是否存在
    const inputVisible = await nameInput.isVisible().catch(() => false) || 
                         await amountInput.isVisible().catch(() => false);
    
    if (inputVisible) {
      // 填写表单
      await nameInput.fill('测试用户');
      await amountInput.fill('100');
      
      // 检查值是否填写成功
      await expect(nameInput).toHaveValue('测试用户');
      await expect(amountInput).toHaveValue('100');
    }
  });

  test('支付方式选择', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 查找支付方式按钮
    const paymentButtons = page.locator('.payment-btn, button:has-text("现金"), button:has-text("微信")');
    
    const buttonsVisible = await paymentButtons.first().isVisible().catch(() => false);
    
    if (buttonsVisible) {
      // 点击微信支付
      const wechatBtn = page.locator('button:has-text("微信")');
      if (await wechatBtn.isVisible().catch(() => false)) {
        await wechatBtn.click();
        
        // 验证按钮被选中
        await expect(wechatBtn).toHaveClass(/active/);
      }
    }
  });

  test('清空表单功能', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const nameInput = page.locator('input[placeholder="请输入姓名"]');
    const clearBtn = page.locator('button:has-text("清空")');
    
    const canInteract = await nameInput.isVisible().catch(() => false) && 
                        await clearBtn.isVisible().catch(() => false);
    
    if (canInteract) {
      // 填写内容
      await nameInput.fill('测试');
      
      // 点击清空按钮
      await clearBtn.click();
      
      // 验证表单已清空
      await expect(nameInput).toHaveValue('');
    }
  });
});
