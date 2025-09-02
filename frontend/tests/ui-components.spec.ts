import { test, expect } from '@playwright/test';

// UI Components tests
test('should load login page correctly', async ({ page }) => {
  await page.goto('/login');
  
  await expect(page.locator('text=登录 InvestAI')).toBeVisible();
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  await expect(page.locator('text=还没有账号？')).toBeVisible();
});

test('should load register page correctly', async ({ page }) => {
  await page.goto('/register');
  
  await expect(page.locator('text=注册 InvestAI')).toBeVisible();
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="full_name"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  await expect(page.locator('text=已有账号？')).toBeVisible();
});

test('should validate login form', async ({ page }) => {
  await page.goto('/login');
  
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=用户名不能为空')).toBeVisible();
  await expect(page.locator('text=密码至少6位')).toBeVisible();
});

test('should validate register form', async ({ page }) => {
  await page.goto('/register');
  
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=用户名至少3位')).toBeVisible();
  await expect(page.locator('text=请输入有效的邮箱地址')).toBeVisible();
  await expect(page.locator('text=姓名不能为空')).toBeVisible();
  await expect(page.locator('text=密码至少6位')).toBeVisible();
});

test('should navigate between login and register', async ({ page }) => {
  await page.goto('/login');
  await page.click('text=立即注册');
  await expect(page).toHaveURL('/register');
  
  await page.click('text=立即登录');
  await expect(page).toHaveURL('/login');
});

test('should show loading states', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'password123');
  
  // Mock a slow response to see loading state
  await page.route('**/auth/login', async route => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 401,
      json: { detail: 'Invalid credentials' }
    });
  });
  
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=登录中...')).toBeVisible();
});

// Navigation tests
test('should show protected route redirect', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');
  
  await page.goto('/analyze');
  await expect(page).toHaveURL('/login');
  
  await page.goto('/history');
  await expect(page).toHaveURL('/login');
  
  await page.goto('/profile');
  await expect(page).toHaveURL('/login');
});

test('should show error messages', async ({ page }) => {
  await page.goto('/login');
  
  // Mock an error response
  await page.route('**/auth/login', async route => {
    await route.fulfill({
      status: 401,
      json: { detail: 'Invalid username or password' }
    });
  });
  
  await page.fill('input[name="username"]', 'wronguser');
  await page.fill('input[name="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=用户名或密码错误')).toBeVisible();
});