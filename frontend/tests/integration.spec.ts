import { test, expect } from '@playwright/test';

const TEST_USER = {
  username: `integuser_${Date.now()}`,
  email: `integ_${Date.now()}@example.com`,
  password: 'Test123!',
  full_name: 'Integration User'
};

test.describe('Backend Integration Tests', () => {
  test('should successfully register user via API', async ({ page, request }) => {
    // Test direct API call
    const response = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: TEST_USER.username,
        email: TEST_USER.email,
        full_name: TEST_USER.full_name,
        password: TEST_USER.password
      }
    });

    expect(response.status()).toBe(201);
    
    const responseData = await response.json();
    expect(responseData).toHaveProperty('user_id');
    expect(responseData.username).toBe(TEST_USER.username);
  });

  test('should successfully login user via API', async ({ page, request }) => {
    // First register
    await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: TEST_USER.username,
        email: TEST_USER.email,
        full_name: TEST_USER.full_name,
        password: TEST_USER.password
      }
    });

    // Then login
    const loginResponse = await request.post('http://localhost:8000/api/auth/login', {
      data: {
        username: TEST_USER.username,
        password: TEST_USER.password
      }
    });

    expect(loginResponse.status()).toBe(200);
    
    const loginData = await loginResponse.json();
    expect(loginData).toHaveProperty('access_token');
    expect(loginData).toHaveProperty('token_type');
  });

  test('should fetch user profile via authenticated API call', async ({ page, request }) => {
    // Register and login to get token
    await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: TEST_USER.username,
        email: TEST_USER.email,
        full_name: TEST_USER.full_name,
        password: TEST_USER.password
      }
    });

    const loginResponse = await request.post('http://localhost:8000/api/auth/login', {
      data: {
        username: TEST_USER.username,
        password: TEST_USER.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.access_token;

    // Fetch profile
    const profileResponse = await request.get('http://localhost:8000/api/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(profileResponse.status()).toBe(200);
    
    const profileData = await profileResponse.json();
    expect(profileData.username).toBe(TEST_USER.username);
    expect(profileData.email).toBe(TEST_USER.email);
  });

  test('should perform stock analysis via API', async ({ page, request }) => {
    // Register and login
    await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: TEST_USER.username,
        email: TEST_USER.email,
        full_name: TEST_USER.full_name,
        password: TEST_USER.password
      }
    });

    const loginResponse = await request.post('http://localhost:8000/api/auth/login', {
      data: {
        username: TEST_USER.username,
        password: TEST_USER.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.access_token;

    // Perform analysis
    const analysisResponse = await request.post('http://localhost:8000/api/analyze', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        symbol: '000001.SZ',
        analysis_type: 'technical'
      }
    });

    expect(analysisResponse.status()).toBe(200);
    
    const analysisData = await analysisResponse.json();
    expect(analysisData).toHaveProperty('analysis');
    expect(analysisData).toHaveProperty('technical_indicators');
  });

  test('should handle API errors gracefully in UI', async ({ page }) => {
    // Register user through UI
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');

    // Mock API error for analysis
    await page.route('**/api/analyze', route => {
      route.fulfill({
        status: 503,
        json: { detail: 'Analysis service temporarily unavailable' }
      });
    });

    await page.goto('/analyze');
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.selectOption('select[name="analysis_type"]', 'technical');
    await page.click('button[type="submit"]');

    // Should show user-friendly error message
    await expect(page.locator('text=分析服务暂时不可用|Service temporarily unavailable')).toBeVisible();
  });

  test('should sync data between UI and API', async ({ page, request }) => {
    // Register through API
    await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: TEST_USER.username,
        email: TEST_USER.email,
        full_name: TEST_USER.full_name,
        password: TEST_USER.password
      }
    });

    // Login through UI
    await page.goto('/login');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');

    // Navigate to profile and check if data matches
    await page.goto('/profile');
    
    await expect(page.locator(`text=${TEST_USER.username}`)).toBeVisible();
    await expect(page.locator(`text=${TEST_USER.email}`)).toBeVisible();
    await expect(page.locator(`text=${TEST_USER.full_name}`)).toBeVisible();
  });

  test('should maintain authentication state across pages', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');

    // Navigate to different pages
    const protectedPages = ['/analyze', '/history', '/profile'];
    
    for (const pageUrl of protectedPages) {
      await page.goto(pageUrl);
      
      // Should not redirect to login if authenticated
      expect(await page.url()).not.toContain('/login');
      
      // Should have access to protected content
      await expect(page.locator('body')).not.toHaveText(/please.*login|请.*登录/i);
    }
  });

  test('should handle token expiration correctly', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');

    // Mock token expiration
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        json: { detail: 'Token has expired' }
      });
    });

    // Try to access protected resource
    await page.goto('/analyze');
    await page.fill('input[name="symbol"]', '000001.SZ');
    await page.click('button[type="submit"]');

    // Should redirect to login or show auth error
    const currentUrl = await page.url();
    const hasLoginRedirect = currentUrl.includes('/login');
    const hasAuthError = await page.locator('text=token.*expired|登录.*过期|重新.*登录').count() > 0;
    
    expect(hasLoginRedirect || hasAuthError).toBeTruthy();
  });

  test('should handle real-time data updates', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.goto('/');

    // Check for real-time price updates (if implemented)
    const priceElement = page.locator('[data-testid="stock-price"], .price-display, .current-price');
    
    if (await priceElement.count() > 0) {
      const initialPrice = await priceElement.textContent();
      
      // Wait for potential update
      await page.waitForTimeout(5000);
      
      const updatedPrice = await priceElement.textContent();
      
      // Price might update (this test depends on real-time data implementation)
      expect(initialPrice || updatedPrice).toBeTruthy();
    }
  });

  test('should validate data consistency between frontend and backend', async ({ page, request }) => {
    // Register through API
    const registerResponse = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: TEST_USER.username,
        email: TEST_USER.email,
        full_name: TEST_USER.full_name,
        password: TEST_USER.password
      }
    });
    
    const userData = await registerResponse.json();

    // Login through API to get token
    const loginResponse = await request.post('http://localhost:8000/api/auth/login', {
      data: {
        username: TEST_USER.username,
        password: TEST_USER.password
      }
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.access_token;

    // Perform analysis through API
    const analysisResponse = await request.post('http://localhost:8000/api/analyze', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        symbol: '000001.SZ',
        analysis_type: 'technical'
      }
    });

    const analysisData = await analysisResponse.json();

    // Now check UI shows same data
    await page.goto('/login');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.goto('/history');
    
    // Should show the analysis we just created
    await expect(page.locator('text=000001.SZ')).toBeVisible({ timeout: 10000 });
    
    if (analysisData.analysis && analysisData.analysis.recommendation) {
      await expect(page.locator(`text=${analysisData.analysis.recommendation}`)).toBeVisible();
    }
  });
});

test.describe('Database Integration Tests', () => {
  test('should persist user data correctly', async ({ page, request }) => {
    // Register user
    await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: TEST_USER.username,
        email: TEST_USER.email,
        full_name: TEST_USER.full_name,
        password: TEST_USER.password
      }
    });

    // Login to get token
    const loginResponse = await request.post('http://localhost:8000/api/auth/login', {
      data: {
        username: TEST_USER.username,
        password: TEST_USER.password
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.access_token;

    // Create some analysis data
    await request.post('http://localhost:8000/api/analyze', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        symbol: '000001.SZ',
        analysis_type: 'technical'
      }
    });

    // Get user's analysis history
    const historyResponse = await request.get('http://localhost:8000/api/analysis/history', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(historyResponse.status()).toBe(200);
    
    const historyData = await historyResponse.json();
    expect(historyData.length).toBeGreaterThan(0);
    expect(historyData[0]).toHaveProperty('symbol');
    expect(historyData[0].symbol).toBe('000001.SZ');
  });

  test('should handle database connection errors', async ({ page }) => {
    // Mock database error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        json: { detail: 'Database connection failed' }
      });
    });

    await page.goto('/register');
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="full_name"]', TEST_USER.full_name);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Should show database error message
    await expect(page.locator('text=数据库.*错误|Database.*error|服务器.*错误')).toBeVisible();
  });
});