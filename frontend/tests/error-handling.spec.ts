import { test, expect } from '@playwright/test';

const TEST_USER = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'Test123!',
  full_name: 'Test User'
};

test.describe('Error Handling and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should handle network connectivity issues', async ({ page }) => {
    // Simulate network failure
    await page.route('**/*', route => {
      route.abort();
    });

    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');

    // Should show network error message
    await expect(page.locator('text=网络连接失败|Network error|连接超时')).toBeVisible({ timeout: 10000 });
  });

  test('should handle API server errors', async ({ page }) => {
    // Mock server error responses
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        json: { detail: 'Internal Server Error', error: 'Database connection failed' }
      });
    });

    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=服务器错误|Server error|系统繁忙')).toBeVisible();
  });

  test('should handle unauthorized access errors', async ({ page }) => {
    // Mock unauthorized response
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        json: { detail: 'Token has expired' }
      });
    });

    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.click('button[type="submit"]');

    // Should redirect to login or show auth error
    await expect(page.locator('text=登录已过期|Session expired|请重新登录')).toBeVisible();
  });

  test('should handle rate limiting errors', async ({ page }) => {
    // Mock rate limiting response
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 429,
        json: { detail: 'Rate limit exceeded', retry_after: 60 }
      });
    });

    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=请求过于频繁|Rate limit|请稍后再试')).toBeVisible();
  });

  test('should handle malformed API responses', async ({ page }) => {
    // Mock malformed JSON response
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 200,
        body: 'This is not valid JSON{{'
      });
    });

    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=数据格式错误|Invalid response|解析失败')).toBeVisible();
  });

  test('should handle empty or null data responses', async ({ page }) => {
    // Mock empty data response
    await page.route('**/api/analyze/**', route => {
      route.fulfill({
        status: 200,
        json: { data: null, results: [] }
      });
    });

    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=暂无数据|No data available|数据为空')).toBeVisible();
  });

  test('should handle session timeout gracefully', async ({ page }) => {
    // Test long idle period
    await page.waitForTimeout(1000);
    
    // Mock expired session
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        json: { detail: 'Session timeout' }
      });
    });

    await page.click('text=股票分析');
    
    // Should redirect to login or show session expired message
    const currentUrl = await page.url();
    const hasLoginRedirect = currentUrl.includes('/login');
    const hasSessionMessage = await page.locator('text=会话超时|Session timeout').count() > 0;
    
    expect(hasLoginRedirect || hasSessionMessage).toBeTruthy();
  });

  test('should show appropriate loading states during failures', async ({ page }) => {
    // Mock slow failing response
    await page.route('**/api/analyze/**', route => {
      setTimeout(() => {
        route.fulfill({
          status: 500,
          json: { detail: 'Analysis service unavailable' }
        });
      }, 3000);
    });

    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.click('button[type="submit"]');

    // Should show loading state first
    await expect(page.locator('text=正在分析|Analyzing|Loading')).toBeVisible();
    
    // Then show error state
    await expect(page.locator('text=分析失败|Analysis failed')).toBeVisible({ timeout: 5000 });
  });

  test('should provide retry functionality after errors', async ({ page }) => {
    let failureCount = 0;
    
    await page.route('**/api/analyze/**', route => {
      failureCount++;
      if (failureCount < 2) {
        route.fulfill({
          status: 500,
          json: { detail: 'Temporary service error' }
        });
      } else {
        route.fulfill({
          status: 200,
          json: { 
            analysis: { recommendation: 'BUY' },
            technical_indicators: {},
            price_data: []
          }
        });
      }
    });

    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=分析失败|Analysis failed')).toBeVisible();
    
    // Click retry button
    const retryButton = page.locator('button:has-text("重试|Retry"), [data-testid="retry-button"]');
    await retryButton.click();
    
    // Should succeed on retry
    await expect(page.locator('text=分析结果|Analysis Results')).toBeVisible({ timeout: 10000 });
  });

  test('should handle form validation errors properly', async ({ page }) => {
    await page.goto('/analyze');
    
    // Test various invalid inputs
    const invalidInputs = [
      { symbol: '', type: 'technical', expectedError: '股票代码不能为空|Symbol required' },
      { symbol: '   ', type: 'technical', expectedError: '请输入有效的股票代码|Invalid symbol' },
      { symbol: '000001.SZ', type: '', expectedError: '请选择分析类型|Analysis type required' },
    ];

    for (const input of invalidInputs) {
      await page.fill('input[name="symbol"]', input.symbol);
      if (input.type) {
        await page.selectOption('select[name="analysis_type"]', input.type);
      }
      
      await page.click('button[type="submit"]');
      
      await expect(page.locator(`text=${input.expectedError}`)).toBeVisible();
      
      // Clear form for next test
      await page.fill('input[name="symbol"]', '');
    }
  });

  test('should handle browser offline/online events', async ({ page }) => {
    await page.goto('/analyze');
    
    // Simulate going offline
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Should show offline indicator
    const offlineIndicator = page.locator('text=离线|Offline|No connection');
    if (await offlineIndicator.count() > 0) {
      await expect(offlineIndicator).toBeVisible();
    }

    // Simulate going back online
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    // Offline indicator should disappear
    if (await offlineIndicator.count() > 0) {
      await expect(offlineIndicator).not.toBeVisible({ timeout: 5000 });
    }
  });
});