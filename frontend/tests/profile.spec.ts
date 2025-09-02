import { test, expect } from '@playwright/test';

const TEST_USER = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'Test123!',
  full_name: 'Test User'
};

test.describe('User Profile', () => {
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

  test('should navigate to profile page', async ({ page }) => {
    await page.click('text=个人资料');
    await expect(page).toHaveURL('/profile');
    await expect(page.locator('text=个人资料')).toBeVisible();
  });

  test('should display user information', async ({ page }) => {
    await page.goto('/profile');
    
    await expect(page.locator(`text=${TEST_USER.username}`)).toBeVisible();
    await expect(page.locator(`text=${TEST_USER.full_name}`)).toBeVisible();
    await expect(page.locator(`text=${TEST_USER.email}`)).toBeVisible();
  });

  test('should update profile information', async ({ page }) => {
    await page.goto('/profile');
    
    const newName = 'Updated Test User';
    const newEmail = `updated_${Date.now()}@example.com`;
    
    await page.fill('input[name="full_name"]', newName);
    await page.fill('input[name="email"]', newEmail);
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=个人信息更新成功')).toBeVisible();
  });

  test('should switch to password tab', async ({ page }) => {
    await page.goto('/profile');
    
    await page.click('text=修改密码');
    await expect(page.locator('text=修改密码')).toBeVisible();
    await expect(page.locator('input[name="current_password"]')).toBeVisible();
  });

  test('should validate password change form', async ({ page }) => {
    await page.goto('/profile');
    await page.click('text=修改密码');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=当前密码至少6位')).toBeVisible();
    await expect(page.locator('text=新密码至少6位')).toBeVisible();
  });

  test('should change password successfully', async ({ page }) => {
    await page.goto('/profile');
    await page.click('text=修改密码');
    
    await page.fill('input[name="current_password"]', TEST_USER.password);
    await page.fill('input[name="new_password"]', 'NewPassword123!');
    await page.fill('input[name="confirm_password"]', 'NewPassword123!');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=密码修改成功')).toBeVisible();
  });

  test('should show account information section', async ({ page }) => {
    await page.goto('/profile');
    
    await expect(page.locator('text=账户信息')).toBeVisible();
    await expect(page.locator('text=用户ID')).toBeVisible();
    await expect(page.locator('text=注册时间')).toBeVisible();
    await expect(page.locator('text=账户状态')).toBeVisible();
  });

  test('should handle profile update errors', async ({ page }) => {
    await page.goto('/profile');
    
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=请输入有效的邮箱地址')).toBeVisible();
  });

  test('should handle password change errors', async ({ page }) => {
    await page.goto('/profile');
    await page.click('text=修改密码');
    
    await page.fill('input[name="current_password"]', 'wrongpassword');
    await page.fill('input[name="new_password"]', 'NewPassword123!');
    await page.fill('input[name="confirm_password"]', 'NewPassword123!');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=密码修改失败')).toBeVisible();
  });
});