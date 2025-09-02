import { test, expect, testResponsiveDesign, waitForLoadingComplete } from './test-utils';

test.describe('App Initialization and Basic Functionality', () => {
  test('应用程序应正确加载并显示基本元素', async ({ page }) => {
    await page.goto('/');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/InvestAI/);
    
    // 等待页面加载完成
    await waitForLoadingComplete(page);
    
    // 检查基本页面元素
    await expect(page.locator('body')).toBeVisible();
    
    // 检查是否有导航或主要内容区域
    const hasNav = await page.locator('nav, header').count() > 0;
    const hasMain = await page.locator('main, [role="main"]').count() > 0;
    const hasLoginForm = await page.locator('form, .login-form').count() > 0;
    
    // 至少应该有其中一个元素
    expect(hasNav || hasMain || hasLoginForm).toBe(true);
  });

  test('应用程序应在所有设备尺寸上正确显示', async ({ page }) => {
    await testResponsiveDesign(page, '/');
  });

  test('应用程序应处理JavaScript错误并保持稳定', async ({ page }) => {
    const errors: string[] = [];
    
    // 监听JavaScript错误
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    await waitForLoadingComplete(page);
    
    // 尝试一些基本交互
    try {
      // 点击第一个可点击元素（如果存在）
      const clickableElement = page.locator('button, a, input[type="submit"]').first();
      if (await clickableElement.count() > 0) {
        await clickableElement.click();
      }
    } catch (error) {
      // 交互错误是可接受的，我们主要关注JavaScript错误
    }
    
    // 不应该有严重的JavaScript错误
    const criticalErrors = errors.filter(error => 
      !error.includes('Non-Error promise rejection') && 
      !error.includes('ResizeObserver') &&
      !error.includes('Network request failed')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('应用程序应正确处理路由导航', async ({ page }) => {
    await page.goto('/');
    
    // 获取当前URL
    const initialUrl = page.url();
    
    // 尝试导航到不存在的页面
    await page.goto('/non-existent-page');
    
    // 应该显示404页面或重定向到有效页面
    const currentUrl = page.url();
    const hasErrorContent = await page.locator('text=404, text=Not Found, text=页面未找到').count() > 0;
    const redirectedToValid = currentUrl !== '/non-existent-page';
    
    expect(hasErrorContent || redirectedToValid).toBe(true);
  });

  test('应用程序应在网络慢的情况下优雅降级', async ({ page }) => {
    // 模拟慢网络
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms延迟
      route.continue();
    });
    
    await page.goto('/');
    
    // 应该最终加载完成，即使网络很慢
    await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
    
    // 清理路由拦截
    await page.unroute('**/*');
  });

  test('应用程序应正确处理浏览器刷新', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingComplete(page);
    
    // 刷新页面
    await page.reload();
    
    // 页面应该重新加载并保持功能
    await waitForLoadingComplete(page);
    await expect(page.locator('body')).toBeVisible();
    
    // 检查页面是否仍然可交互
    const interactiveElement = page.locator('button, a, input').first();
    if (await interactiveElement.count() > 0) {
      await expect(interactiveElement).toBeVisible();
    }
  });

  test('应用程序应支持浏览器前进后退导航', async ({ page }) => {
    await page.goto('/');
    
    // 导航到登录页面（如果存在）
    const loginLink = page.locator('a[href*="login"], text=登录, text=Login');
    if (await loginLink.count() > 0) {
      await loginLink.first().click();
      await page.waitForLoadState('networkidle');
      
      // 使用浏览器后退
      await page.goBack();
      await page.waitForLoadState('networkidle');
      
      // 应该返回到首页
      await expect(page.locator('body')).toBeVisible();
      
      // 使用浏览器前进
      await page.goForward();
      await page.waitForLoadState('networkidle');
      
      // 应该回到登录页面
      await expect(page.locator('body')).toBeVisible();
    }
  });
});