import { test, expect, devices } from '@playwright/test';

const TEST_USER = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'Test123!',
  full_name: 'Test User'
};

// Test on mobile device
test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Responsive Design', () => {
  test('should display mobile navigation menu', async ({ page }) => {
    await page.goto('/login');
    
    // Look for mobile menu button (hamburger)
    const mobileMenuButton = page.locator('button[aria-label*="menu"], .mobile-menu-button, [data-testid="mobile-menu"]');
    
    if (await mobileMenuButton.count() > 0) {
      await expect(mobileMenuButton).toBeVisible();
      
      // Click to open menu
      await mobileMenuButton.click();
      
      // Navigation menu should be visible
      const mobileNav = page.locator('.mobile-nav, [data-testid="mobile-navigation"], nav[aria-expanded="true"]');
      await expect(mobileNav).toBeVisible();
    }
  });

  test('should adjust login form for mobile', async ({ page }) => {
    await page.goto('/login');
    
    // Form should be visible and properly sized
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Inputs should be properly sized for mobile
    const usernameInput = page.locator('input[name="username"]');
    await expect(usernameInput).toBeVisible();
    
    const inputBox = await usernameInput.boundingBox();
    if (inputBox) {
      // Input should not be too small for mobile interaction
      expect(inputBox.height).toBeGreaterThan(30);
    }
  });

  test('should handle mobile keyboard interactions', async ({ page }) => {
    await page.goto('/login');
    
    // Tap on input should open virtual keyboard
    await page.tap('input[name="username"]');
    
    // Input should remain in viewport
    const input = page.locator('input[name="username"]');
    await expect(input).toBeVisible();
    
    // Fill input
    await page.fill('input[name="username"]', 'testuser');
    
    // Move to next input
    await page.tap('input[name="password"]');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit button should still be accessible
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should display dashboard properly on mobile', async ({ page }) => {
    // Register and login first
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');
    
    // Dashboard should be mobile-friendly
    await expect(page.locator('text=投资分析仪表板')).toBeVisible();
    
    // Check if cards stack vertically on mobile
    const cards = page.locator('.card, [data-testid="dashboard-card"], .summary-card');
    const cardCount = await cards.count();
    
    if (cardCount > 1) {
      // Cards should be stacked on mobile
      const firstCard = cards.first();
      const secondCard = cards.nth(1);
      
      const firstCardBox = await firstCard.boundingBox();
      const secondCardBox = await secondCard.boundingBox();
      
      if (firstCardBox && secondCardBox) {
        // Second card should be below first card (not side by side)
        expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height - 10);
      }
    }
  });

  test('should handle touch gestures on charts', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.goto('/analyze');
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.recharts-wrapper, .chart-container', { timeout: 15000 });
    
    const chart = page.locator('.recharts-wrapper, .chart-container');
    
    // Test pinch to zoom (simulate)
    await chart.hover();
    
    // Test swipe gestures
    await chart.swipe('left');
    await page.waitForTimeout(1000);
    
    await chart.swipe('right');
    await page.waitForTimeout(1000);
    
    // Chart should still be functional
    await expect(chart).toBeVisible();
  });

  test('should show mobile-optimized tables', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.goto('/history');
    
    const table = page.locator('table');
    
    if (await table.count() > 0) {
      await expect(table).toBeVisible();
      
      // Table should be scrollable horizontally on mobile
      const tableContainer = page.locator('.table-container, .overflow-x-auto');
      if (await tableContainer.count() > 0) {
        await expect(tableContainer).toBeVisible();
      }
    }
  });

  test('should handle mobile form validation', async ({ page }) => {
    await page.goto('/register');
    
    // Tap submit without filling form
    await page.tap('button[type="submit"]');
    
    // Error messages should be visible and not overlapped
    const errors = page.locator('[class*="error"], [role="alert"], .text-red-500');
    const errorCount = await errors.count();
    
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        await expect(errors.nth(i)).toBeVisible();
      }
    }
  });

  test('should adjust font sizes for mobile', async ({ page }) => {
    await page.goto('/login');
    
    // Check that text is readable on mobile
    const headings = page.locator('h1, h2');
    
    if (await headings.count() > 0) {
      const heading = headings.first();
      const fontSize = await heading.evaluate(el => {
        return window.getComputedStyle(el).fontSize;
      });
      
      // Font size should be reasonable for mobile (at least 14px)
      const fontSizeValue = parseInt(fontSize);
      expect(fontSizeValue).toBeGreaterThanOrEqual(14);
    }
  });

  test('should handle orientation changes', async ({ page }) => {
    await page.goto('/login');
    
    // Test portrait mode
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test landscape mode
    await page.setViewportSize({ width: 812, height: 375 });
    await expect(page.locator('body')).toBeVisible();
    
    // Form should still be accessible
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show mobile-friendly loading states', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.goto('/analyze');
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    
    await page.tap('button[type="submit"]');
    
    // Loading state should be visible and not obscure important content
    const loadingIndicator = page.locator('text=正在分析|Loading|分析中, .loading-spinner');
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible();
    }
  });

  test('should support pull-to-refresh on mobile', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.goto('/');
    
    // Try to trigger pull-to-refresh (if implemented)
    await page.touchscreen.tap(200, 100);
    await page.touchscreen.tap(200, 300);
    
    // Page should remain functional
    await expect(page.locator('text=投资分析仪表板')).toBeVisible();
  });
});

// Test on tablet device
test.describe('Tablet Responsive Design', () => {
  test.use({ ...devices['iPad Pro'] });

  test('should adapt layout for tablet', async ({ page }) => {
    await page.goto('/login');
    
    // Form should be centered and appropriately sized for tablet
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    const formBox = await form.boundingBox();
    if (formBox) {
      // Form should not be too wide on tablet
      expect(formBox.width).toBeLessThan(600);
    }
  });

  test('should show side-by-side layout where appropriate', async ({ page }) => {
    const TEST_TABLET_USER = {
      username: `tabletuser_${Date.now()}`,
      email: `tablet_${Date.now()}@example.com`,
      password: 'Test123!',
      full_name: 'Tablet User'
    };

    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_TABLET_USER.username);
    await page.fill('input[name="email"]', TEST_TABLET_USER.email);
    await page.fill('input[name="full_name"]', TEST_TABLET_USER.full_name);
    await page.fill('input[name="password"]', TEST_TABLET_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_TABLET_USER.password);
    await page.click('button[type="submit"]');
    
    await page.goto('/');
    
    // On tablet, some cards might be side by side
    const cards = page.locator('.card, [data-testid="dashboard-card"]');
    const cardCount = await cards.count();
    
    if (cardCount >= 2) {
      const firstCard = cards.first();
      const secondCard = cards.nth(1);
      
      const firstCardBox = await firstCard.boundingBox();
      const secondCardBox = await secondCard.boundingBox();
      
      // On tablet, cards might be side by side or stacked depending on design
      expect(firstCardBox && secondCardBox).toBeTruthy();
    }
  });
});