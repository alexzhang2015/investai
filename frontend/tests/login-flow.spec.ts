import { test, expect } from '@playwright/test';

test.describe('Login Flow Debug', () => {
  test('检查登录流程', async ({ page }) => {
    // 1. 首先注册一个用户
    const randomString = Math.random().toString(36).substring(7);
    const testUser = {
      username: `testuser_${randomString}`,
      email: `test_${randomString}@example.com`,
      password: 'TestPassword123!'
    };

    // 访问注册页面
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `test-results/register-page.png`, fullPage: true });

    // 填写注册表单
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[name="username"], input[placeholder*="用户名"]', testUser.username);
    await page.fill('input[type="password"]', testUser.password);
    
    // 查找确认密码字段
    const confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="confirm_password"], input[placeholder*="确认密码"]');
    if (await confirmPasswordInput.count() > 0) {
      await confirmPasswordInput.fill(testUser.password);
    }

    // 提交注册
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `test-results/after-register.png`, fullPage: true });

    console.log('After registration URL:', page.url());

    // 2. 现在测试登录
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `test-results/login-page.png`, fullPage: true });

    // 输出登录页面的表单信息
    const forms = page.locator('form');
    const formCount = await forms.count();
    console.log('Login page forms:', formCount);

    if (formCount > 0) {
      const firstForm = forms.first();
      const formHTML = await firstForm.innerHTML();
      console.log('Form HTML:', formHTML.substring(0, 500));
    }

    // 查找所有输入字段
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log('Login page inputs:', inputCount);

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);
    }

    // 尝试填写登录表单
    console.log('Attempting to login with:', testUser.username);
    
    // 查找用户名字段
    const usernameInput = page.locator('input[name="username"], input[placeholder*="用户名"], input[placeholder*="Username"]');
    if (await usernameInput.count() > 0) {
      await usernameInput.fill(testUser.username);
      console.log('Filled username field');
    } else {
      console.log('No username field found, trying email field');
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.count() > 0) {
        await emailInput.fill(testUser.email);
        console.log('Filled email field');
      }
    }

    // 填写密码
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.count() > 0) {
      await passwordInput.fill(testUser.password);
      console.log('Filled password field');
    }

    await page.screenshot({ path: `test-results/before-login-submit.png`, fullPage: true });

    // 提交登录
    await page.click('button[type="submit"]');
    console.log('Clicked submit button');

    // 等待页面响应
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `test-results/after-login-submit.png`, fullPage: true });

    const finalURL = page.url();
    console.log('Final URL after login:', finalURL);

    // 检查页面内容
    const bodyText = await page.locator('body').textContent();
    console.log('Page content after login:', bodyText?.substring(0, 200));

    // 检查是否有错误消息
    const errorMessages = page.locator('.error, [role="alert"], .alert-error');
    const errorCount = await errorMessages.count();
    if (errorCount > 0) {
      const errorText = await errorMessages.first().textContent();
      console.log('Error message:', errorText);
    }

    // 检查本地存储中的令牌
    const token = await page.evaluate(() => {
      return localStorage.getItem('token') || localStorage.getItem('authToken') || sessionStorage.getItem('token');
    });
    console.log('Auth token in storage:', token ? 'Present' : 'Not found');

    // 如果登录成功，应该重定向到仪表板
    if (finalURL.includes('/dashboard')) {
      console.log('✅ Login successful - redirected to dashboard');
    } else if (finalURL.includes('/login')) {
      console.log('❌ Login failed - still on login page');
    } else {
      console.log('🤔 Unexpected redirect to:', finalURL);
    }
  });
});