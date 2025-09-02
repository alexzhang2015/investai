import { test, expect } from '@playwright/test';

const TEST_USER = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'Test123!',
  full_name: 'Test User'
};

test.describe('Stock Search and Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await page.goto('/analyze');
  });

  test('should display stock search input', async ({ page }) => {
    await expect(page.locator('input[name="symbol"]')).toBeVisible();
    await expect(page.locator('input[name="symbol"]')).toHaveAttribute('placeholder', /股票代码|Stock Symbol/i);
  });

  test('should search for valid stock symbols', async ({ page }) => {
    const validStocks = ['000001.SZ', '600519.SH', 'AAPL', 'MSFT'];
    
    for (const stock of validStocks) {
      await page.fill('input[name="symbol"]', stock);
      await page.keyboard.press('Enter');
      
      // Should show loading state or results
      await expect(page.locator('text=正在搜索|Loading|Searching')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show search suggestions while typing', async ({ page }) => {
    await page.fill('input[name="symbol"]', '0000');
    
    // Wait for suggestions to appear
    await page.waitForSelector('[data-testid="search-suggestions"], .search-dropdown, .autocomplete-dropdown', { timeout: 5000 });
    
    const suggestions = await page.locator('[data-testid="search-suggestions"] li, .search-dropdown li, .autocomplete-dropdown li');
    await expect(suggestions.first()).toBeVisible();
  });

  test('should select stock from suggestions', async ({ page }) => {
    await page.fill('input[name="symbol"]', '0000');
    
    // Wait for and click first suggestion
    const firstSuggestion = page.locator('[data-testid="search-suggestions"] li:first-child, .search-dropdown li:first-child');
    await firstSuggestion.waitFor({ timeout: 5000 });
    await firstSuggestion.click();
    
    // Should populate the input field
    const inputValue = await page.locator('input[name="symbol"]').inputValue();
    expect(inputValue.length).toBeGreaterThan(0);
  });

  test('should handle invalid stock symbols', async ({ page }) => {
    await page.fill('input[name="symbol"]', 'INVALID123');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=股票代码不存在|Invalid stock symbol|Stock not found')).toBeVisible();
  });

  test('should validate stock symbol format', async ({ page }) => {
    const invalidFormats = ['', '   ', '12345', 'TEST'];
    
    for (const invalidFormat of invalidFormats) {
      await page.fill('input[name="symbol"]', invalidFormat);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=请输入有效的股票代码|Please enter valid stock symbol')).toBeVisible();
      
      // Clear for next test
      await page.fill('input[name="symbol"]', '');
    }
  });

  test('should show recent searches', async ({ page }) => {
    // Search for a few stocks first
    const stocks = ['000001.SZ', '600519.SH'];
    
    for (const stock of stocks) {
      await page.fill('input[name="symbol"]', stock);
      await page.selectOption('select[name="analysis_type"]', 'technical');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    
    // Should show recent searches
    await expect(page.locator('text=最近搜索|Recent Searches')).toBeVisible();
    
    for (const stock of stocks) {
      await expect(page.locator(`text=${stock}`)).toBeVisible();
    }
  });

  test('should clear search input', async ({ page }) => {
    await page.fill('input[name="symbol"]', '000001.SZ');
    
    // Look for clear button
    const clearButton = page.locator('button[aria-label="Clear"], .clear-button, [data-testid="clear-search"]');
    if (await clearButton.count() > 0) {
      await clearButton.click();
      await expect(page.locator('input[name="symbol"]')).toHaveValue('');
    }
  });
});