import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('测试交易功能...');
    
    // 1. 导航到前端
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(2000);
    
    // 2. 检查是否显示登录页面
    const pageTitle = await page.textContent('h1');
    console.log('当前页面标题:', pageTitle);
    
    if (pageTitle.includes('登录')) {
      console.log('✅ 登录页面加载成功');
      
      // 3. 尝试登录 (使用测试账户)
      await page.fill('input[type="text"]', 'testuser');
      await page.fill('input[type="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      
      // 等待登录响应
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      console.log('登录后URL:', currentUrl);
      
      // 4. 检查导航菜单是否包含交易功能
      try {
        const navItems = await page.$$eval('nav a', links => 
          links.map(link => link.textContent?.trim()).filter(Boolean)
        );
        console.log('导航菜单项:', navItems);
        
        const hasTrading = navItems.some(item => 
          item.includes('投资组合') || item.includes('股票交易') || item.includes('交易历史')
        );
        
        if (hasTrading) {
          console.log('✅ 交易功能已集成到导航菜单');
          
          // 5. 测试投资组合页面
          try {
            await page.click('a[href="/portfolio"]');
            await page.waitForTimeout(2000);
            console.log('✅ 投资组合页面可访问');
          } catch (error) {
            console.log('⚠️ 投资组合页面访问失败:', error.message);
          }
          
          // 6. 测试交易页面
          try {
            await page.click('a[href="/trading"]');
            await page.waitForTimeout(2000);
            console.log('✅ 股票交易页面可访问');
          } catch (error) {
            console.log('⚠️ 股票交易页面访问失败:', error.message);
          }
          
          // 7. 测试交易历史页面
          try {
            await page.click('a[href="/trade-history"]');
            await page.waitForTimeout(2000);
            console.log('✅ 交易历史页面可访问');
          } catch (error) {
            console.log('⚠️ 交易历史页面访问失败:', error.message);
          }
          
        } else {
          console.log('❌ 交易功能未在导航菜单中找到');
        }
        
      } catch (error) {
        console.log('⚠️ 无法获取导航菜单:', error.message);
      }
      
    } else {
      console.log('⚠️ 页面未显示登录表单，可能已经登录或其他问题');
      
      // 检查是否已经在Dashboard
      const bodyContent = await page.textContent('body');
      if (bodyContent.includes('投资分析仪表板') || bodyContent.includes('Dashboard')) {
        console.log('✅ 已经在Dashboard页面');
        
        // 检查是否显示投资组合信息
        if (bodyContent.includes('投资组合总值') || bodyContent.includes('总收益')) {
          console.log('✅ Dashboard显示投资组合概览');
        }
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
  
  console.log('\n测试完成，浏览器将在5秒后关闭...');
  await page.waitForTimeout(5000);
  await browser.close();
})();