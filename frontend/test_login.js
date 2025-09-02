import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to frontend...');
    await page.goto('http://localhost:3001');
    
    // Check if we can see the login form
    await page.waitForSelector('h1', { timeout: 5000 });
    const pageTitle = await page.textContent('h1');
    console.log('Page title:', pageTitle);
    
    // Check if it's the login page
    if (pageTitle.includes('登录')) {
      console.log('✅ Login page loaded successfully');
      
      // Fill in login form
      await page.fill('input[type="text"]', 'testuser');
      await page.fill('input[type="password"]', 'testpassword123');
      
      console.log('Submitting login form...');
      await page.click('button[type="submit"]');
      
      // Wait a moment to see what happens
      await page.waitForTimeout(3000);
      
      // Check current URL and page content
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      // Look for dashboard content
      const bodyContent = await page.textContent('body');
      console.log('Page contains dashboard:', bodyContent.includes('仪表板') || bodyContent.includes('Dashboard'));
      
      if (bodyContent.includes('仪表板') || bodyContent.includes('Dashboard')) {
        console.log('✅ Dashboard loaded successfully - no white screen!');
      } else if (bodyContent.trim().length < 50) {
        console.log('❌ Possible white screen detected - very little content');
      } else {
        console.log('⚠️ Unknown page state');
      }
      
    } else {
      console.log('Page loaded but not showing login form');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
  
  await page.waitForTimeout(5000); // Keep browser open for 5 seconds
  await browser.close();
})();