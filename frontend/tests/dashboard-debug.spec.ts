import { test, expect } from './test-utils';

test.describe('Dashboard Debug', () => {
  test('检查仪表板实际内容', async ({ authenticatedPage }) => {
    // 截图
    await authenticatedPage.screenshot({ path: 'test-results/dashboard-actual.png', fullPage: true });
    
    // 输出页面信息
    console.log('Dashboard URL:', authenticatedPage.url());
    console.log('Page title:', await authenticatedPage.title());
    
    // 输出所有h1标签
    const h1Elements = authenticatedPage.locator('h1');
    const h1Count = await h1Elements.count();
    console.log('Number of h1 elements:', h1Count);
    
    for (let i = 0; i < h1Count; i++) {
      const h1Text = await h1Elements.nth(i).textContent();
      console.log(`H1 ${i}:`, h1Text);
    }
    
    // 输出所有标题元素
    const headings = authenticatedPage.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    console.log('Total heading count:', headingCount);
    
    for (let i = 0; i < Math.min(headingCount, 10); i++) {
      const headingText = await headings.nth(i).textContent();
      const tagName = await headings.nth(i).evaluate(el => el.tagName.toLowerCase());
      console.log(`${tagName.toUpperCase()}: ${headingText}`);
    }
    
    // 输出页面的主要内容
    const bodyText = await authenticatedPage.locator('body').textContent();
    console.log('Page content (first 500 chars):', bodyText?.substring(0, 500));
    
    // 检查是否有仪表板相关的文本
    const dashboardTexts = [
      'dashboard', 'Dashboard', 'DASHBOARD',
      '仪表板', '控制台', '主页', '首页',
      'portfolio', 'Portfolio',
      'overview', 'Overview',
      'summary', 'Summary'
    ];
    
    for (const text of dashboardTexts) {
      const count = await authenticatedPage.locator(`text=${text}`).count();
      if (count > 0) {
        console.log(`Found "${text}": ${count} occurrences`);
      }
    }
    
    // 检查是否有导航菜单
    const navElements = authenticatedPage.locator('nav, .nav, .navigation, .menu');
    const navCount = await navElements.count();
    console.log('Navigation elements:', navCount);
    
    if (navCount > 0) {
      const navText = await navElements.first().textContent();
      console.log('First navigation text:', navText?.substring(0, 200));
    }
    
    // 检查是否有表格、图表等内容
    const tables = await authenticatedPage.locator('table').count();
    const charts = await authenticatedPage.locator('.chart, canvas, svg').count();
    const cards = await authenticatedPage.locator('.card, .widget').count();
    
    console.log('Tables:', tables, 'Charts/SVG:', charts, 'Cards/Widgets:', cards);
  });
});