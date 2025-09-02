import { test, expect } from '@playwright/test';

function createTestUser() {
  const randomId = Math.random().toString(36).substring(2, 8);
  return {
    username: `user${randomId}`,
    email: `test${randomId}@example.com`,
    password: 'Test123!',
    full_name: 'Test User'
  };
}

test.describe('Authentication', () => {
  test('should register a new user', async ({ page }) => {
    const testUser = createTestUser();
    
    await page.goto('/register');
    
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="full_name"]', testUser.full_name);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    await page.click('button[type="submit"]');
    
    // Wait for navigation or show error message
    try {
      await expect(page).toHaveURL('/', { timeout: 10000 });
      await expect(page.locator('text=投资分析仪表板')).toBeVisible();
    } catch (error) {
      // Check if there's an error message
      const errorElement = page.locator('[class*="bg-red-50"], [class*="text-red-600"]');
      if (await errorElement.count() > 0) {
        const errorText = await errorElement.textContent();
        console.log('Registration error:', errorText);
      }
      throw error;
    }
  });

  test('should login with existing user', async ({ page }) => {
    // First register a user
    const testUser = createTestUser();
    
    await page.goto('/register');
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="full_name"]', testUser.full_name);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard after registration
    await expect(page).toHaveURL('/');
    
    // Now logout and test login
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    });
    
    await page.waitForURL('/login');
    
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=投资分析仪表板')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // First register and login
    const testUser = createTestUser();
    
    await page.goto('/register');
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="full_name"]', testUser.full_name);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');
    
    // Find and click logout button
    await page.click('text=退出');
    
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=登录 InvestAI')).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="username"]', 'invaliduser');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=用户名或密码错误')).toBeVisible();
  });

  test('should redirect to login when accessing protected routes without authentication', async ({ page }) => {
    await page.goto('/analyze');
    await expect(page).toHaveURL('/login');
    
    await page.goto('/history');
    await expect(page).toHaveURL('/login');
    
    await page.goto('/profile');
    await expect(page).toHaveURL('/login');
  });
});