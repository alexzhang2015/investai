/**
 * 测试工具函数 - 统一的测试设置和清理
 */
import { test as base, expect, Page } from '@playwright/test';
import { randomBytes } from 'crypto';

// 扩展测试上下文
export const test = base.extend<{
  authenticatedPage: Page;
  testUser: { email: string; password: string; username: string; userId?: string };
}>({
  // 自动创建测试用户并登录
  authenticatedPage: async ({ page }, use) => {
    const testUser = await createTestUser();
    
    // 通过API登录获取令牌
    const loginResponse = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: testUser.username,
        password: testUser.password,
      }),
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    
    // 设置认证状态到浏览器
    await page.goto('/');
    await page.evaluate((authToken) => {
      localStorage.setItem('token', authToken);
      localStorage.setItem('authToken', authToken);
    }, token);
    
    // 导航到仪表板
    await page.goto('/dashboard');
    
    // 验证认证状态 - 如果被重定向到登录页说明认证失败
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error('Authentication failed - redirected to login page');
    }
    
    await use(page);
    
    // 清理：删除测试用户（如果需要）
    await cleanupTestUser(testUser);
  },
  
  // 提供测试用户信息
  testUser: async ({}, use) => {
    const testUser = await createTestUser();
    await use(testUser);
    await cleanupTestUser(testUser);
  }
});

// 创建测试用户
async function createTestUser(): Promise<{ email: string; password: string; username: string; userId?: string }> {
  const timestamp = Date.now();
  const randomString = randomBytes(4).toString('hex');
  
  const testUser = {
    email: `test_${timestamp}_${randomString}@example.com`,
    password: 'TestPassword123!',
    username: `testuser_${randomString}`,
  };
  
  try {
    // 通过 API 创建用户
    const response = await fetch('http://localhost:8000/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        full_name: `Test User ${randomString}`,
      }),
    });
    
    if (response.ok) {
      const userData = await response.json();
      return { ...testUser, userId: userData.user_id };
    } else {
      console.warn(`Failed to create test user via API: ${response.status}`);
      return testUser;
    }
  } catch (error) {
    console.warn('Failed to create test user via API, using local registration:', error);
    return testUser;
  }
}

// 清理测试用户
async function cleanupTestUser(testUser: { email: string; password: string; username: string; userId?: string }) {
  if (!testUser.userId) {
    return;
  }
  
  try {
    // 如果有用户ID，尝试通过API删除用户
    const response = await fetch(`http://localhost:8000/users/${testUser.userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`Failed to cleanup test user: ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to cleanup test user:', error);
  }
}

// 等待API响应的辅助函数
export async function waitForApiResponse(page: Page, url: string, timeout: number = 10000) {
  return page.waitForResponse(response => 
    response.url().includes(url) && response.status() === 200, 
    { timeout }
  );
}

// 等待元素可见的辅助函数
export async function waitForElementVisible(page: Page, selector: string, timeout: number = 10000) {
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

// 等待加载状态完成的辅助函数
export async function waitForLoadingComplete(page: Page, timeout: number = 15000) {
  // 等待任何加载指示器消失
  const loadingSelectors = [
    '.loading',
    '[data-loading="true"]',
    '.spinner',
    '[aria-busy="true"]'
  ];
  
  for (const selector of loadingSelectors) {
    try {
      await page.waitForSelector(selector, { state: 'hidden', timeout: timeout / loadingSelectors.length });
    } catch {
      // 如果元素不存在，继续下一个
    }
  }
}

// 模拟网络错误的辅助函数
export async function simulateNetworkError(page: Page) {
  await page.route('**/api/**', route => {
    route.abort('internetdisconnected');
  });
}

// 恢复网络连接的辅助函数
export async function restoreNetworkConnection(page: Page) {
  await page.unroute('**/api/**');
}

// 验证表单错误的辅助函数
export async function expectFormError(page: Page, errorMessage: string) {
  await expect(page.locator('.error, [role="alert"], .text-red-500')).toContainText(errorMessage);
}

// 验证成功消息的辅助函数
export async function expectSuccessMessage(page: Page, successMessage: string) {
  await expect(page.locator('.success, [role="status"], .text-green-500')).toContainText(successMessage);
}

// 等待图表加载完成的辅助函数
export async function waitForChartsLoaded(page: Page, timeout: number = 15000) {
  // 等待图表容器可见
  await expect(page.locator('[data-testid="chart"], .recharts-wrapper, canvas')).toBeVisible({ timeout });
  
  // 等待一小段时间确保图表渲染完成
  await page.waitForTimeout(1000);
}

// 验证表格数据的辅助函数
export async function expectTableHasData(page: Page, tableSelector: string = 'table') {
  const table = page.locator(tableSelector);
  await expect(table).toBeVisible();
  
  // 确保表格有数据行（不只是表头）
  const rows = table.locator('tbody tr, tr:not(:first-child)');
  await expect(rows.first()).toBeVisible();
}

// 检查响应式设计的辅助函数
export async function testResponsiveDesign(page: Page, url: string) {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1200, height: 800 }
  ];
  
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    // 确保页面在不同尺寸下都能正常显示
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  }
}

// 导出 expect 以便在测试文件中使用
export { expect };