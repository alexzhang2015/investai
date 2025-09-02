import { test, expect } from '@playwright/test';

const TEST_USER = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'Test123!',
  full_name: 'Test User'
};

test.describe('Charts and Data Visualization', () => {
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

  test('should display dashboard charts', async ({ page }) => {
    await page.goto('/');
    
    // Check for chart containers
    await expect(page.locator('.recharts-wrapper, [data-testid="chart"], .chart-container')).toBeVisible();
    
    // Check for specific chart elements
    await expect(page.locator('.recharts-line, .recharts-area, .recharts-bar')).toBeVisible();
  });

  test('should show loading state for charts', async ({ page }) => {
    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');
    
    // Should show loading spinner or skeleton
    await expect(page.locator('text=正在加载图表|Loading chart|加载中, .loading-spinner, .chart-skeleton')).toBeVisible();
  });

  test('should display technical analysis charts', async ({ page }) => {
    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');
    
    // Wait for charts to load
    await page.waitForSelector('.recharts-wrapper, [data-testid="price-chart"]', { timeout: 15000 });
    
    // Should show price chart
    await expect(page.locator('text=价格走势|Price Chart')).toBeVisible();
    
    // Should show technical indicators
    const indicators = ['RSI', 'MACD', '布林带|Bollinger', '移动平均线|Moving Average'];
    for (const indicator of indicators) {
      await expect(page.locator(`text=${indicator}`)).toBeVisible();
    }
  });

  test('should allow chart time period selection', async ({ page }) => {
    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.chart-container, .recharts-wrapper', { timeout: 15000 });
    
    // Check for time period buttons
    const timePeriods = ['1D', '1W', '1M', '3M', '6M', '1Y'];
    
    for (const period of timePeriods) {
      const periodButton = page.locator(`button:has-text("${period}"), [data-period="${period}"]`);
      if (await periodButton.count() > 0) {
        await periodButton.click();
        await page.waitForTimeout(1000);
        
        // Chart should update
        await expect(page.locator('.recharts-wrapper')).toBeVisible();
      }
    }
  });

  test('should show chart tooltips on hover', async ({ page }) => {
    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.recharts-wrapper', { timeout: 15000 });
    
    // Hover over chart area
    const chartArea = page.locator('.recharts-wrapper .recharts-cartesian-grid, .chart-area');
    await chartArea.hover();
    
    // Should show tooltip with data
    await expect(page.locator('.recharts-tooltip, .chart-tooltip')).toBeVisible();
  });

  test('should display fundamental analysis data', async ({ page }) => {
    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'fundamental');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('[data-testid="fundamental-data"], .fundamental-metrics', { timeout: 15000 });
    
    // Should show key financial metrics
    const metrics = ['市盈率|P/E Ratio', '市净率|P/B Ratio', '营收|Revenue', '净利润|Net Income', 'ROE', 'ROA'];
    
    for (const metric of metrics) {
      await expect(page.locator(`text=${metric}`)).toBeVisible();
    }
  });

  test('should handle chart data loading errors', async ({ page }) => {
    // Mock API error
    await page.route('**/api/analyze/**', route => {
      route.fulfill({
        status: 500,
        json: { detail: 'Data service unavailable' }
      });
    });
    
    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=数据加载失败|Failed to load data|Error loading chart')).toBeVisible();
    
    // Should show retry button
    const retryButton = page.locator('button:has-text("重试|Retry")');
    if (await retryButton.count() > 0) {
      await expect(retryButton).toBeVisible();
    }
  });

  test('should export chart data', async ({ page }) => {
    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.chart-container', { timeout: 15000 });
    
    // Look for export button
    const exportButton = page.locator('button:has-text("导出|Export"), [data-testid="export-chart"]');
    
    if (await exportButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(png|pdf|csv|xlsx)$/);
    }
  });

  test('should zoom and pan charts', async ({ page }) => {
    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.recharts-wrapper', { timeout: 15000 });
    
    const chartArea = page.locator('.recharts-wrapper');
    
    // Test mouse wheel zoom (if supported)
    await chartArea.hover();
    await page.mouse.wheel(0, -100);
    
    // Test drag to pan (if supported)
    await chartArea.dragTo(chartArea, { 
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 150, y: 100 }
    });
    
    // Chart should still be visible after interactions
    await expect(chartArea).toBeVisible();
  });
});