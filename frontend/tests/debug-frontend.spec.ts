import { test, expect } from '@playwright/test';

test.describe('Frontend Debug', () => {
  test('检查首页内容', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 截图以便调试
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
    
    // 输出页面HTML以便调试
    const content = await page.content();
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());
    
    // 检查是否有任何表单元素
    const forms = await page.locator('form').count();
    console.log('Number of forms:', forms);
    
    const inputs = await page.locator('input').count();
    console.log('Number of inputs:', inputs);
    
    const emailInputs = await page.locator('input[type="email"]').count();
    console.log('Number of email inputs:', emailInputs);
    
    const buttons = await page.locator('button').count();
    console.log('Number of buttons:', buttons);
    
    // 输出所有可见的文本
    const bodyText = await page.locator('body').textContent();
    console.log('Page text content (first 500 chars):', bodyText?.substring(0, 500));
    
    // 检查是否有登录相关元素
    const loginElements = await page.locator('text=login, text=登录, text=Login').count();
    console.log('Login related elements:', loginElements);
    
    // 检查是否有注册相关元素
    const registerElements = await page.locator('text=register, text=注册, text=Register').count();
    console.log('Register related elements:', registerElements);
  });

  test('检查特定路径', async ({ page }) => {
    const paths = ['/login', '/register', '/auth/login', '/signin', '/dashboard'];
    
    for (const path of paths) {
      try {
        await page.goto(path);
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        console.log(`\n=== Path: ${path} ===`);
        console.log('Final URL:', page.url());
        console.log('Title:', await page.title());
        
        const forms = await page.locator('form').count();
        const emailInputs = await page.locator('input[type="email"]').count();
        const passwordInputs = await page.locator('input[type="password"]').count();
        
        console.log('Forms:', forms, 'Email inputs:', emailInputs, 'Password inputs:', passwordInputs);
        
        if (emailInputs > 0 || passwordInputs > 0) {
          await page.screenshot({ path: `test-results/${path.replace('/', '_')}.png` });
        }
      } catch (error) {
        console.log(`Path ${path} failed:`, error);
      }
    }
  });
});