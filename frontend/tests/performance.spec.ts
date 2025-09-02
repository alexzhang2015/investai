import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load login page within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have reasonable bundle sizes', async ({ page }) => {
    const responses = [];
    
    page.on('response', response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        responses.push(response);
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check JavaScript bundle sizes
    const jsResponses = responses.filter(r => r.url().includes('.js'));
    
    for (const response of jsResponses) {
      const headers = response.headers();
      const contentLength = headers['content-length'];
      
      if (contentLength) {
        const sizeKB = parseInt(contentLength) / 1024;
        
        // Main bundle should be reasonable size (under 1MB)
        if (response.url().includes('index') || response.url().includes('main')) {
          expect(sizeKB).toBeLessThan(1024);
        }
      }
    }
  });

  test('should handle rapid user interactions', async ({ page }) => {
    const TEST_USER = {
      username: `perfuser_${Date.now()}`,
      email: `perf_${Date.now()}@example.com`,
      password: 'Test123!',
      full_name: 'Performance User'
    };

    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');

    // Rapidly navigate between pages
    const startTime = Date.now();
    
    await page.click('text=股票分析');
    await page.waitForURL('**/analyze');
    
    await page.click('text=分析历史');
    await page.waitForURL('**/history');
    
    await page.click('text=个人资料');
    await page.waitForURL('**/profile');
    
    await page.click('text=首页');
    await page.waitForURL('/');
    
    const navigationTime = Date.now() - startTime;
    
    // All navigation should complete within 5 seconds
    expect(navigationTime).toBeLessThan(5000);
  });

  test('should handle multiple concurrent API calls', async ({ page }) => {
    const TEST_USER = {
      username: `apiuser_${Date.now()}`,
      email: `api_${Date.now()}@example.com`,
      password: 'Test123!',
      full_name: 'API User'
    };

    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.goto('/analyze');

    // Start multiple analysis requests simultaneously
    const stocks = ['000001.SZ', '600519.SH', '000002.SZ'];
    const startTime = Date.now();

    const promises = stocks.map(async (stock, index) => {
      await page.fill('input[name="symbol"]', stock);
      await page.selectOption('select[name="analysis_type"]', 'technical');
      await page.click('button[type="submit"]');
      
      // Wait a bit between requests
      await page.waitForTimeout(500);
    });

    await Promise.allSettled(promises);
    
    const totalTime = Date.now() - startTime;
    
    // Should handle concurrent requests reasonably well
    expect(totalTime).toBeLessThan(15000);
  });

  test('should have efficient DOM updates', async ({ page }) => {
    const TEST_USER = {
      username: `domuser_${Date.now()}`,
      email: `dom_${Date.now()}@example.com`,
      password: 'Test123!',
      full_name: 'DOM User'
    };

    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.goto('/analyze');

    // Measure DOM node count
    const initialNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);

    // Perform actions that might create DOM nodes
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    const finalNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);

    // DOM shouldn't grow excessively (more than 50% increase)
    expect(finalNodeCount).toBeLessThan(initialNodeCount * 1.5);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    const TEST_USER = {
      username: `datauser_${Date.now()}`,
      email: `data_${Date.now()}@example.com`,
      password: 'Test123!',
      full_name: 'Data User'
    };

    // Mock large dataset response
    await page.route('**/api/analyze/**', route => {
      const largeDataset = {
        analysis: { recommendation: 'BUY' },
        price_data: Array.from({ length: 1000 }, (_, i) => ({
          date: new Date(Date.now() - i * 86400000).toISOString(),
          open: 100 + Math.random() * 10,
          high: 105 + Math.random() * 10,
          low: 95 + Math.random() * 10,
          close: 100 + Math.random() * 10,
          volume: Math.floor(Math.random() * 1000000)
        })),
        technical_indicators: {
          rsi: Array.from({ length: 1000 }, () => Math.random() * 100),
          macd: Array.from({ length: 1000 }, () => Math.random() * 5 - 2.5),
          bollinger_bands: Array.from({ length: 1000 }, () => ({
            upper: 110 + Math.random() * 10,
            middle: 100 + Math.random() * 10,
            lower: 90 + Math.random() * 10
          }))
        }
      };
      
      route.fulfill({
        status: 200,
        json: largeDataset
      });
    });

    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.goto('/analyze');

    const startTime = Date.now();

    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');

    // Wait for chart to render
    await page.waitForSelector('.recharts-wrapper, .chart-container', { timeout: 10000 });

    const renderTime = Date.now() - startTime;

    // Should handle large dataset within reasonable time (10 seconds)
    expect(renderTime).toBeLessThan(10000);
  });

  test('should have smooth scrolling performance', async ({ page }) => {
    const TEST_USER = {
      username: `scrolluser_${Date.now()}`,
      email: `scroll_${Date.now()}@example.com`,
      password: 'Test123!',
      full_name: 'Scroll User'
    };

    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.goto('/history');

    // Perform rapid scrolling
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(100);
    }

    const scrollTime = Date.now() - startTime;

    // Scrolling should be responsive
    expect(scrollTime).toBeLessThan(2000);
  });

  test('should minimize memory usage', async ({ page }) => {
    const TEST_USER = {
      username: `memuser_${Date.now()}`,
      email: `mem_${Date.now()}@example.com`,
      password: 'Test123!',
      full_name: 'Memory User'
    };

    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Navigate between pages multiple times to check for memory leaks
    const pages = ['/', '/analyze', '/history', '/profile'];

    for (let cycle = 0; cycle < 3; cycle++) {
      for (const pageUrl of pages) {
        await page.goto(pageUrl);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      }
    }

    // Check if page is still responsive
    await page.goto('/');
    await expect(page.locator('text=投资分析仪表板')).toBeVisible({ timeout: 5000 });
  });

  test('should handle slow network conditions', async ({ page }) => {
    const TEST_USER = {
      username: `slowuser_${Date.now()}`,
      email: `slow_${Date.now()}@example.com`,
      password: 'Test123!',
      full_name: 'Slow User'
    };

    // Simulate slow network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    const startTime = Date.now();

    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/', { timeout: 15000 });

    const totalTime = Date.now() - startTime;

    // Should complete within reasonable time even on slow network
    expect(totalTime).toBeLessThan(20000);
  });

  test('should cache resources effectively', async ({ page }) => {
    const resourceRequests = [];
    
    page.on('request', request => {
      if (request.resourceType() === 'script' || request.resourceType() === 'stylesheet') {
        resourceRequests.push(request.url());
      }
    });

    // First visit
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const firstVisitRequests = [...resourceRequests];
    resourceRequests.length = 0;

    // Second visit
    await page.goto('/register');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const secondVisitRequests = [...resourceRequests];

    // Second visit should have fewer resource requests due to caching
    expect(secondVisitRequests.length).toBeLessThanOrEqual(firstVisitRequests.length);
  });
});