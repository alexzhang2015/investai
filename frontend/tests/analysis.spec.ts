import { test, expect } from '@playwright/test';

const TEST_USER = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'Test123!',
  full_name: 'Test User'
};

test.describe('Stock Analysis', () => {
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

  test('should navigate to analysis page', async ({ page }) => {
    await page.click('text=股票分析');
    await expect(page).toHaveURL('/analyze');
    await expect(page.locator('text=股票分析')).toBeVisible();
  });

  test('should show analysis form with required fields', async ({ page }) => {
    await page.goto('/analyze');
    
    await expect(page.locator('input[name="symbol"]')).toBeVisible();
    await expect(page.locator('select[name="analysis_type"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should validate analysis form inputs', async ({ page }) => {
    await page.goto('/analyze');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=股票代码不能为空')).toBeVisible();
    await expect(page.locator('text=请选择分析类型')).toBeVisible();
  });

  test('should submit analysis form successfully', async ({ page }) => {
    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=正在分析中')).toBeVisible();
  });

  test('should display analysis results', async ({ page }) => {
    await page.goto('/analyze');
    
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=分析结果')).toBeVisible();
    await expect(page.locator('text=投资建议')).toBeVisible();
  });

  test('should navigate to history page', async ({ page }) => {
    await page.click('text=分析历史');
    await expect(page).toHaveURL('/history');
    await expect(page.locator('text=分析历史')).toBeVisible();
  });

  test('should display analysis history', async ({ page }) => {
    await page.goto('/history');
    
    await expect(page.locator('text=暂无分析记录')).toBeVisible();
  });

  test('should export analysis history as CSV', async ({ page }) => {
    await page.goto('/history');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=导出CSV');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('investai-analysis-history.csv');
  });
});

test.describe('Navigation', () => {
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

  test('should navigate between all main pages', async ({ page }) => {
    await expect(page.locator('text=投资分析仪表板')).toBeVisible();
    
    await page.click('text=股票分析');
    await expect(page).toHaveURL('/analyze');
    await expect(page.locator('text=股票分析')).toBeVisible();
    
    await page.click('text=分析历史');
    await expect(page).toHaveURL('/history');
    await expect(page.locator('text=分析历史')).toBeVisible();
    
    await page.click('text=个人资料');
    await expect(page).toHaveURL('/profile');
    await expect(page.locator('text=个人资料')).toBeVisible();
    
    await page.click('text=首页');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=投资分析仪表板')).toBeVisible();
  });

  test('should show active navigation state', async ({ page }) => {
    await expect(page.locator('a[href="/"]')).toHaveClass(/border-primary-500/);
    
    await page.click('text=股票分析');
    await expect(page.locator('a[href="/analyze"]')).toHaveClass(/border-primary-500/);
    
    await page.click('text=分析历史');
    await expect(page.locator('a[href="/history"]')).toHaveClass(/border-primary-500/);
    
    await page.click('text=个人资料');
    await expect(page.locator('a[href="/profile"]')).toHaveClass(/border-primary-500/);
  });
});