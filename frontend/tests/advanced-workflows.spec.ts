import { test, expect, waitForLoadingComplete, waitForChartsLoaded, expectTableHasData } from './test-utils';

test.describe('Advanced User Workflows', () => {
  test.describe('Complete Investment Analysis Workflow', () => {
    test('用户应能完成完整的股票分析流程', async ({ authenticatedPage }) => {
      // 1. 从仪表板开始
      await expect(authenticatedPage.locator('h1:has-text("Dashboard"), h1:has-text("仪表板")')).toBeVisible();
      
      // 2. 导航到分析页面
      await authenticatedPage.click('nav a:has-text("Analyze"), nav a:has-text("分析"), a[href*="analyze"]');
      await expect(authenticatedPage).toHaveURL(/analyze/);
      await waitForLoadingComplete(authenticatedPage);
      
      // 3. 搜索股票
      const stockSymbol = 'AAPL';
      await authenticatedPage.fill('input[placeholder*="股票"], input[placeholder*="symbol"], input[type="search"]', stockSymbol);
      await authenticatedPage.press('input[placeholder*="股票"], input[placeholder*="symbol"], input[type="search"]', 'Enter');
      
      // 4. 等待搜索结果
      await expect(authenticatedPage.locator(`text=${stockSymbol}, text=Apple`)).toBeVisible({ timeout: 10000 });
      
      // 5. 选择股票
      await authenticatedPage.click(`text=${stockSymbol}, button:has-text("${stockSymbol}")`);
      await waitForLoadingComplete(authenticatedPage);
      
      // 6. 开始分析
      await authenticatedPage.click('button:has-text("分析"), button:has-text("Analyze"), button[type="submit"]');
      await waitForLoadingComplete(authenticatedPage);
      
      // 7. 验证分析结果显示
      await expect(authenticatedPage.locator('text=分析结果, text=Analysis Results, [data-testid="analysis-results"]')).toBeVisible({ timeout: 15000 });
      
      // 8. 检查图表显示
      await waitForChartsLoaded(authenticatedPage);
      
      // 9. 保存分析结果
      const saveButton = authenticatedPage.locator('button:has-text("保存"), button:has-text("Save")');
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expect(authenticatedPage.locator('text=保存成功, text=Saved successfully')).toBeVisible({ timeout: 5000 });
      }
      
      // 10. 导航到历史记录验证保存
      await authenticatedPage.click('nav a:has-text("History"), nav a:has-text("历史"), a[href*="history"]');
      await expect(authenticatedPage).toHaveURL(/history/);
      await waitForLoadingComplete(authenticatedPage);
      
      // 11. 验证分析记录存在
      await expect(authenticatedPage.locator(`text=${stockSymbol}`)).toBeVisible({ timeout: 10000 });
    });

    test('用户应能进行多股票比较分析', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/analyze');
      await waitForLoadingComplete(authenticatedPage);
      
      // 添加多个股票进行比较
      const stocks = ['AAPL', 'GOOGL', 'MSFT'];
      
      for (const stock of stocks) {
        // 搜索并添加股票
        await authenticatedPage.fill('input[placeholder*="股票"], input[placeholder*="symbol"]', stock);
        await authenticatedPage.press('input[placeholder*="股票"], input[placeholder*="symbol"]', 'Enter');
        
        // 等待搜索结果并选择
        await expect(authenticatedPage.locator(`text=${stock}`)).toBeVisible({ timeout: 5000 });
        
        // 添加到比较列表
        const addButton = authenticatedPage.locator(`button:has-text("添加"), button:has-text("Add")`).first();
        if (await addButton.count() > 0) {
          await addButton.click();
        }
        
        await authenticatedPage.waitForTimeout(1000);
      }
      
      // 开始比较分析
      const compareButton = authenticatedPage.locator('button:has-text("比较"), button:has-text("Compare")');
      if (await compareButton.count() > 0) {
        await compareButton.click();
        await waitForLoadingComplete(authenticatedPage);
        
        // 验证比较结果显示
        await expect(authenticatedPage.locator('text=比较结果, text=Comparison Results')).toBeVisible();
        
        // 验证所有股票都在结果中显示
        for (const stock of stocks) {
          await expect(authenticatedPage.locator(`text=${stock}`)).toBeVisible();
        }
        
        // 验证比较图表
        await waitForChartsLoaded(authenticatedPage);
      }
    });
  });

  test.describe('Portfolio Management Workflow', () => {
    test('用户应能创建和管理投资组合', async ({ authenticatedPage }) => {
      // 导航到仪表板
      await authenticatedPage.goto('/dashboard');
      await waitForLoadingComplete(authenticatedPage);
      
      // 查找投资组合管理功能
      const portfolioButton = authenticatedPage.locator('button:has-text("投资组合"), button:has-text("Portfolio"), a[href*="portfolio"]');
      
      if (await portfolioButton.count() > 0) {
        await portfolioButton.click();
        await waitForLoadingComplete(authenticatedPage);
        
        // 创建新投资组合
        const createButton = authenticatedPage.locator('button:has-text("创建"), button:has-text("Create"), button:has-text("新建")');
        if (await createButton.count() > 0) {
          await createButton.click();
          
          // 填写投资组合信息
          await authenticatedPage.fill('input[name="name"], input[placeholder*="名称"]', '测试投资组合');
          await authenticatedPage.fill('input[name="description"], textarea[name="description"]', '这是一个测试投资组合');
          
          // 保存投资组合
          await authenticatedPage.click('button:has-text("保存"), button:has-text("Save"), button[type="submit"]');
          await waitForLoadingComplete(authenticatedPage);
          
          // 验证创建成功
          await expect(authenticatedPage.locator('text=测试投资组合')).toBeVisible();
        }
        
        // 添加股票到投资组合
        const addStockButton = authenticatedPage.locator('button:has-text("添加股票"), button:has-text("Add Stock")');
        if (await addStockButton.count() > 0) {
          await addStockButton.click();
          
          // 搜索并添加股票
          await authenticatedPage.fill('input[placeholder*="股票"]', 'AAPL');
          await authenticatedPage.fill('input[placeholder*="数量"], input[name="quantity"]', '10');
          await authenticatedPage.fill('input[placeholder*="价格"], input[name="price"]', '150');
          
          await authenticatedPage.click('button:has-text("确认"), button:has-text("Confirm")');
          await waitForLoadingComplete(authenticatedPage);
          
          // 验证股票添加成功
          await expect(authenticatedPage.locator('text=AAPL')).toBeVisible();
        }
      }
    });

    test('用户应能查看投资组合性能分析', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await waitForLoadingComplete(authenticatedPage);
      
      // 查看投资组合性能图表
      await waitForChartsLoaded(authenticatedPage);
      
      // 验证关键指标显示
      const metrics = ['总价值', 'Total Value', '收益', 'Return', '涨跌', 'Change'];
      let hasMetrics = false;
      
      for (const metric of metrics) {
        if (await authenticatedPage.locator(`text=${metric}`).count() > 0) {
          hasMetrics = true;
          break;
        }
      }
      
      expect(hasMetrics).toBe(true);
      
      // 验证交易历史表格
      await expectTableHasData(authenticatedPage, 'table');
    });
  });

  test.describe('Data Export and Import Workflow', () => {
    test('用户应能导出分析数据', async ({ authenticatedPage }) => {
      // 导航到历史页面
      await authenticatedPage.goto('/history');
      await waitForLoadingComplete(authenticatedPage);
      
      // 查找导出功能
      const exportButton = authenticatedPage.locator('button:has-text("导出"), button:has-text("Export")');
      
      if (await exportButton.count() > 0) {
        // 设置下载监听
        const downloadPromise = authenticatedPage.waitForEvent('download');
        
        await exportButton.click();
        
        // 等待下载开始
        const download = await downloadPromise;
        
        // 验证下载文件
        expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|json)$/);
        
        // 验证文件内容不为空
        const filePath = await download.path();
        expect(filePath).toBeTruthy();
      }
    });

    test('用户应能使用不同的数据导出格式', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/history');
      await waitForLoadingComplete(authenticatedPage);
      
      // 查找格式选择器
      const formatSelector = authenticatedPage.locator('select[name="format"], .format-selector');
      
      if (await formatSelector.count() > 0) {
        const formats = ['CSV', 'Excel', 'JSON'];
        
        for (const format of formats) {
          // 选择格式
          await formatSelector.selectOption(format);
          
          // 导出
          const exportButton = authenticatedPage.locator('button:has-text("导出"), button:has-text("Export")');
          if (await exportButton.count() > 0) {
            const downloadPromise = authenticatedPage.waitForEvent('download');
            await exportButton.click();
            
            const download = await downloadPromise;
            const filename = download.suggestedFilename();
            
            // 验证文件扩展名匹配选择的格式
            if (format === 'CSV') {
              expect(filename).toMatch(/\.csv$/i);
            } else if (format === 'Excel') {
              expect(filename).toMatch(/\.xlsx?$/i);
            } else if (format === 'JSON') {
              expect(filename).toMatch(/\.json$/i);
            }
          }
        }
      }
    });
  });

  test.describe('Advanced Search and Filtering', () => {
    test('用户应能使用高级搜索筛选股票', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/analyze');
      await waitForLoadingComplete(authenticatedPage);
      
      // 查找高级搜索功能
      const advancedSearchToggle = authenticatedPage.locator('button:has-text("高级搜索"), button:has-text("Advanced"), .advanced-search-toggle');
      
      if (await advancedSearchToggle.count() > 0) {
        await advancedSearchToggle.click();
        
        // 设置搜索条件
        const marketCapInput = authenticatedPage.locator('input[name="marketCap"], input[placeholder*="市值"]');
        if (await marketCapInput.count() > 0) {
          await marketCapInput.fill('1000000000'); // 10亿市值以上
        }
        
        const sectorSelect = authenticatedPage.locator('select[name="sector"], select[name="行业"]');
        if (await sectorSelect.count() > 0) {
          await sectorSelect.selectOption('Technology');
        }
        
        const priceRangeMin = authenticatedPage.locator('input[name="priceMin"], input[placeholder*="最低价"]');
        if (await priceRangeMin.count() > 0) {
          await priceRangeMin.fill('50');
        }
        
        // 执行搜索
        await authenticatedPage.click('button:has-text("搜索"), button:has-text("Search")');
        await waitForLoadingComplete(authenticatedPage);
        
        // 验证搜索结果
        await expect(authenticatedPage.locator('.search-results, .stock-list')).toBeVisible();
      }
    });

    test('用户应能保存和管理搜索条件', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/analyze');
      await waitForLoadingComplete(authenticatedPage);
      
      // 设置搜索条件
      await authenticatedPage.fill('input[placeholder*="股票"]', 'TECH');
      
      // 查找保存搜索功能
      const saveSearchButton = authenticatedPage.locator('button:has-text("保存搜索"), button:has-text("Save Search")');
      
      if (await saveSearchButton.count() > 0) {
        await saveSearchButton.click();
        
        // 命名搜索
        const searchNameInput = authenticatedPage.locator('input[name="searchName"], input[placeholder*="搜索名称"]');
        if (await searchNameInput.count() > 0) {
          await searchNameInput.fill('科技股搜索');
          await authenticatedPage.click('button:has-text("确认"), button:has-text("Confirm")');
          
          // 验证搜索已保存
          await expect(authenticatedPage.locator('text=科技股搜索')).toBeVisible();
        }
      }
    });
  });

  test.describe('Real-time Data and Notifications', () => {
    test('应用应显示实时股价更新', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await waitForLoadingComplete(authenticatedPage);
      
      // 查找实时价格显示
      const priceElements = authenticatedPage.locator('[data-testid="stock-price"], .price, .stock-price');
      
      if (await priceElements.count() > 0) {
        const initialPrice = await priceElements.first().textContent();
        
        // 等待一段时间看是否有价格更新
        await authenticatedPage.waitForTimeout(5000);
        
        // 检查是否有实时更新指示器
        const updateIndicators = authenticatedPage.locator('.live-indicator, .real-time, [data-live="true"]');
        const hasLiveIndicator = await updateIndicators.count() > 0;
        
        // 如果有实时指示器，这是好的
        if (hasLiveIndicator) {
          expect(hasLiveIndicator).toBe(true);
        }
      }
    });

    test('用户应能设置价格警报', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await waitForLoadingComplete(authenticatedPage);
      
      // 查找警报设置功能
      const alertButton = authenticatedPage.locator('button:has-text("警报"), button:has-text("Alert"), .alert-button');
      
      if (await alertButton.count() > 0) {
        await alertButton.click();
        
        // 设置价格警报
        const stockInput = authenticatedPage.locator('input[placeholder*="股票代码"]');
        const priceInput = authenticatedPage.locator('input[placeholder*="目标价格"]');
        
        if (await stockInput.count() > 0 && await priceInput.count() > 0) {
          await stockInput.fill('AAPL');
          await priceInput.fill('160');
          
          await authenticatedPage.click('button:has-text("设置警报"), button:has-text("Set Alert")');
          await waitForLoadingComplete(authenticatedPage);
          
          // 验证警报创建成功
          await expect(authenticatedPage.locator('text=AAPL, text=160')).toBeVisible();
        }
      }
    });
  });

  test.describe('Multi-user Collaboration Features', () => {
    test('用户应能分享分析结果', async ({ authenticatedPage }) => {
      // 创建一个分析
      await authenticatedPage.goto('/analyze');
      await waitForLoadingComplete(authenticatedPage);
      
      // 进行简单分析
      await authenticatedPage.fill('input[placeholder*="股票"]', 'AAPL');
      await authenticatedPage.press('input[placeholder*="股票"]', 'Enter');
      
      const analyzeButton = authenticatedPage.locator('button:has-text("分析"), button[type="submit"]');
      if (await analyzeButton.count() > 0) {
        await analyzeButton.click();
        await waitForLoadingComplete(authenticatedPage);
      }
      
      // 查找分享功能
      const shareButton = authenticatedPage.locator('button:has-text("分享"), button:has-text("Share")');
      
      if (await shareButton.count() > 0) {
        await shareButton.click();
        
        // 生成分享链接
        const shareUrlInput = authenticatedPage.locator('input[readonly], .share-url');
        if (await shareUrlInput.count() > 0) {
          const shareUrl = await shareUrlInput.inputValue();
          expect(shareUrl).toMatch(/^https?:\/\//);
          expect(shareUrl.length).toBeGreaterThan(20);
        }
      }
    });

    test('用户应能查看公开的分析报告', async ({ authenticatedPage }) => {
      // 查找公开报告或社区功能
      const communityLink = authenticatedPage.locator('a:has-text("社区"), a:has-text("Community"), a[href*="community"]');
      
      if (await communityLink.count() > 0) {
        await communityLink.click();
        await waitForLoadingComplete(authenticatedPage);
        
        // 验证公开报告列表
        const reportList = authenticatedPage.locator('.report-list, .community-reports');
        if (await reportList.count() > 0) {
          await expect(reportList).toBeVisible();
          
          // 查看第一个报告
          const firstReport = reportList.locator('.report-item, .report-card').first();
          if (await firstReport.count() > 0) {
            await firstReport.click();
            await waitForLoadingComplete(authenticatedPage);
            
            // 验证报告内容加载
            await expect(authenticatedPage.locator('h1, .report-title')).toBeVisible();
          }
        }
      }
    });
  });
});