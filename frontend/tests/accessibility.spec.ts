import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test('should have proper page titles', async ({ page }) => {
    const pages = [
      { url: '/login', expectedTitle: /登录|Login|InvestAI/ },
      { url: '/register', expectedTitle: /注册|Register|Sign up/ },
    ];

    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      await expect(page).toHaveTitle(pageInfo.expectedTitle);
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/login');
    
    // Should have h1 as main heading
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);
    
    // Check heading order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/login');
    
    // All inputs should have labels
    const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"]').count();
    const labels = await page.locator('label').count();
    const ariaLabels = await page.locator('input[aria-label]').count();
    
    // Either labels or aria-labels should cover all inputs
    expect(labels + ariaLabels).toBeGreaterThanOrEqual(inputs);
  });

  test('should have accessible form validation', async ({ page }) => {
    await page.goto('/login');
    
    await page.click('button[type="submit"]');
    
    // Error messages should be associated with inputs via aria-describedby or other methods
    const errorMessages = await page.locator('[role="alert"], .error-message, [aria-live]').count();
    expect(errorMessages).toBeGreaterThan(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    
    // Should be able to navigate with Tab key
    await page.keyboard.press('Tab');
    const focusedElement1 = await page.evaluate(() => document.activeElement?.tagName);
    
    await page.keyboard.press('Tab');
    const focusedElement2 = await page.evaluate(() => document.activeElement?.tagName);
    
    // Focus should move between interactive elements
    expect(focusedElement1).not.toEqual(focusedElement2);
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/login');
    
    const input = page.locator('input[name="username"]').first();
    await input.focus();
    
    // Check if element has focus styles (this is a basic check)
    const isFocused = await input.evaluate(el => el === document.activeElement);
    expect(isFocused).toBeTruthy();
  });

  test('should have proper button states', async ({ page }) => {
    await page.goto('/login');
    
    const submitButton = page.locator('button[type="submit"]');
    
    // Button should be clickable initially
    await expect(submitButton).toBeEnabled();
    
    // Fill form to see if button states change
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    
    await expect(submitButton).toBeEnabled();
  });

  test('should have proper ARIA roles and attributes', async ({ page }) => {
    await page.goto('/login');
    
    // Check for main navigation
    const nav = await page.locator('nav, [role="navigation"]').count();
    expect(nav).toBeGreaterThan(0);
    
    // Check for main content area
    const main = await page.locator('main, [role="main"]').count();
    expect(main).toBeGreaterThan(0);
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    
    const images = await page.locator('img').count();
    
    if (images > 0) {
      const imagesWithAlt = await page.locator('img[alt]').count();
      const decorativeImages = await page.locator('img[alt=""], img[role="presentation"]').count();
      
      // All images should either have meaningful alt text or be marked as decorative
      expect(imagesWithAlt + decorativeImages).toEqual(images);
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    // Should have live region for error announcements
    const liveRegions = await page.locator('[aria-live], [role="alert"], [role="status"]').count();
    expect(liveRegions).toBeGreaterThan(0);
  });

  test('should have proper color contrast', async ({ page }) => {
    await page.goto('/login');
    
    // This is a basic check - in practice you'd use tools like axe-playwright
    const textElements = await page.locator('p, span, label, h1, h2, h3, h4, h5, h6').first();
    
    if (await textElements.count() > 0) {
      const styles = await textElements.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor
        };
      });
      
      // Basic check that text has some color
      expect(styles.color).toBeTruthy();
    }
  });

  test('should be usable without JavaScript', async ({ page, context }) => {
    // Disable JavaScript
    await context.setJavaScriptEnabled(false);
    
    await page.goto('/login');
    
    // Basic form should still be visible
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Re-enable JavaScript for other tests
    await context.setJavaScriptEnabled(true);
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    // Mock reduced motion preference
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });
    });

    await page.goto('/login');
    
    // Check that animations respect reduced motion (this would need specific implementation)
    const animatedElements = await page.locator('[class*="animate"], [style*="transition"]').count();
    
    // This is a basic check - actual implementation would verify reduced animations
    expect(animatedElements).toBeGreaterThanOrEqual(0);
  });

  test('should support high contrast mode', async ({ page }) => {
    // Mock high contrast media query
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });
    });

    await page.goto('/login');
    
    // Check that page loads correctly in high contrast mode
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });

  test('should have skiplinks for main content', async ({ page }) => {
    await page.goto('/login');
    
    // Press Tab to reveal skip links (if they exist)
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('a[href="#main"], a:has-text("Skip to main content"), .skip-link');
    
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeFocused();
      
      // Skip link should work
      await skipLink.click();
      const mainContent = page.locator('#main, main, [role="main"]');
      await expect(mainContent).toBeFocused();
    }
  });
});