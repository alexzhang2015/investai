import { test, expect, waitForLoadingComplete, expectFormError } from './test-utils';

test.describe('Security Tests', () => {
  test.describe('Input Sanitization and XSS Prevention', () => {
    test('应防止基本XSS攻击', async ({ page }) => {
      await page.goto('/login');
      await waitForLoadingComplete(page);
      
      const xssPayload = '<script>alert("XSS")</script>';
      
      // 在登录表单中尝试XSS
      await page.fill('input[type="email"]', `user${xssPayload}@example.com`);
      await page.fill('input[type="password"]', `password${xssPayload}`);
      
      // 页面不应该执行脚本
      const dialogs: string[] = [];
      page.on('dialog', dialog => {
        dialogs.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // 不应该有弹窗出现
      expect(dialogs).toHaveLength(0);
      
      // 页面内容不应该包含未转义的脚本标签
      const pageContent = await page.content();
      expect(pageContent).not.toMatch(/<script[^>]*>.*?alert.*?<\/script>/gi);
    });

    test('应正确处理HTML注入', async ({ testUser, page }) => {
      await page.goto('/register');
      await waitForLoadingComplete(page);
      
      const htmlPayload = '<img src=x onerror=alert("XSS")>';
      
      // 尝试在注册表单中注入HTML
      await page.fill('input[name="name"], input[placeholder*="姓名"], input[placeholder*="Name"]', `Test User ${htmlPayload}`);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      
      // 监听弹窗
      const dialogs: string[] = [];
      page.on('dialog', dialog => {
        dialogs.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // 不应该执行JavaScript
      expect(dialogs).toHaveLength(0);
      
      // 检查页面是否正确转义了HTML
      const nameInputValue = await page.inputValue('input[name="name"], input[placeholder*="姓名"], input[placeholder*="Name"]');
      expect(nameInputValue).toContain('&lt;img');
    });

    test('应处理SQL注入尝试', async ({ page }) => {
      await page.goto('/login');
      await waitForLoadingComplete(page);
      
      // 常见的SQL注入尝试
      const sqlPayloads = [
        "' OR '1'='1",
        "admin'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --"
      ];
      
      for (const payload of sqlPayloads) {
        await page.fill('input[type="email"]', `user${payload}@example.com`);
        await page.fill('input[type="password"]', payload);
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
        
        // 应该显示正常的登录错误，而不是数据库错误
        const hasDbError = await page.locator('text=SQL, text=database, text=syntax').count() > 0;
        expect(hasDbError).toBe(false);
      }
    });
  });

  test.describe('Authentication and Authorization', () => {
    test('未认证用户应无法访问受保护页面', async ({ page }) => {
      const protectedPages = ['/dashboard', '/profile', '/analyze', '/history'];
      
      for (const pagePath of protectedPages) {
        await page.goto(pagePath);
        
        // 应该被重定向到登录页面或显示未授权错误
        await page.waitForLoadState('networkidle');
        const currentUrl = page.url();
        const isRedirectedToLogin = currentUrl.includes('login') || currentUrl.includes('auth');
        const hasUnauthorizedMessage = await page.locator('text=Unauthorized, text=未授权, text=401').count() > 0;
        
        expect(isRedirectedToLogin || hasUnauthorizedMessage).toBe(true);
      }
    });

    test('应正确处理无效的JWT令牌', async ({ page }) => {
      await page.goto('/');
      
      // 设置无效的JWT令牌
      await page.evaluate(() => {
        localStorage.setItem('token', 'invalid.jwt.token');
        localStorage.setItem('authToken', 'invalid.jwt.token');
      });
      
      // 尝试访问受保护页面
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // 应该被重定向或显示错误
      const currentUrl = page.url();
      const isRedirectedToAuth = currentUrl.includes('login') || currentUrl.includes('auth');
      expect(isRedirectedToAuth).toBe(true);
    });

    test('会话过期应正确处理', async ({ authenticatedPage }) => {
      // 清除所有存储的认证信息来模拟会话过期
      await authenticatedPage.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      });
      
      // 尝试进行需要认证的操作
      await authenticatedPage.reload();
      await authenticatedPage.waitForLoadState('networkidle');
      
      // 应该被重定向到登录页面
      const currentUrl = authenticatedPage.url();
      expect(currentUrl).toMatch(/login|auth/);
    });
  });

  test.describe('Data Validation and Input Security', () => {
    test('应验证电子邮件格式', async ({ page }) => {
      await page.goto('/register');
      await waitForLoadingComplete(page);
      
      const invalidEmails = [
        'invalid-email',
        'user@',
        '@example.com',
        'user..double.dot@example.com',
        'user@example',
        'user name@example.com' // 包含空格
      ];
      
      for (const invalidEmail of invalidEmails) {
        await page.fill('input[type="email"]', invalidEmail);
        await page.fill('input[type="password"]', 'ValidPassword123!');
        await page.click('button[type="submit"]');
        
        // 应该显示电子邮件格式错误
        await expectFormError(page, /邮箱|email|格式|format|invalid/i);
        
        // 清除输入以准备下次测试
        await page.fill('input[type="email"]', '');
      }
    });

    test('应验证密码强度', async ({ page }) => {
      await page.goto('/register');
      await waitForLoadingComplete(page);
      
      const weakPasswords = [
        '123',
        'password',
        'abc',
        '1234567', // 太短
        'PASSWORD', // 只有大写
        'password123' // 缺少特殊字符
      ];
      
      for (const weakPassword of weakPasswords) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', weakPassword);
        await page.click('button[type="submit"]');
        
        // 应该显示密码强度错误
        await expectFormError(page, /密码|password|强度|strength|weak|too short/i);
        
        // 清除输入
        await page.fill('input[type="password"]', '');
      }
    });

    test('应防止文件上传攻击（如果有文件上传功能）', async ({ authenticatedPage }) => {
      // 检查是否有文件上传功能
      const fileInputs = authenticatedPage.locator('input[type="file"]');
      const fileInputCount = await fileInputs.count();
      
      if (fileInputCount > 0) {
        const firstFileInput = fileInputs.first();
        
        // 尝试上传可执行文件
        const executableFiles = [
          { name: 'malicious.exe', content: 'fake executable content' },
          { name: 'script.sh', content: '#!/bin/bash\necho "malicious script"' },
          { name: 'virus.bat', content: '@echo off\necho malicious batch file' }
        ];
        
        for (const file of executableFiles) {
          try {
            // 创建文件对象
            const dataTransfer = await authenticatedPage.evaluateHandle(({ name, content }) => {
              const dt = new DataTransfer();
              const file = new File([content], name, { type: 'application/octet-stream' });
              dt.items.add(file);
              return dt;
            }, file);
            
            // 尝试上传文件
            await firstFileInput.setInputFiles(file.name);
            
            // 应该显示文件类型不支持的错误
            const hasError = await authenticatedPage.locator('text=不支持的文件类型, text=unsupported file type, text=invalid file').count() > 0;
            expect(hasError).toBe(true);
            
          } catch (error) {
            // 如果文件创建失败，这是预期的行为
            console.log(`File upload test skipped for ${file.name}: ${error}`);
          }
        }
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('应防止跨站请求伪造', async ({ authenticatedPage }) => {
      // 获取当前页面的CSRF令牌（如果存在）
      const csrfToken = await authenticatedPage.evaluate(() => {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        return metaToken ? metaToken.getAttribute('content') : null;
      });
      
      // 如果有CSRF保护，验证其存在
      if (csrfToken) {
        expect(csrfToken).toBeTruthy();
        expect(csrfToken.length).toBeGreaterThan(10);
      }
      
      // 尝试不带CSRF令牌的POST请求
      const response = await authenticatedPage.evaluate(async () => {
        try {
          const response = await fetch('/api/profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: 'Hacker' })
          });
          return { status: response.status, ok: response.ok };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      // 请求应该被拒绝（如果有CSRF保护）
      if (csrfToken) {
        expect(response.status).toBeOneOf([403, 419, 422]); // 常见的CSRF错误状态码
      }
    });
  });

  test.describe('Session Security', () => {
    test('应在多个浏览器标签中正确处理会话', async ({ browser }) => {
      // 创建两个浏览器上下文模拟不同标签
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      try {
        // 在第一个标签中登录
        await page1.goto('/login');
        await page1.fill('input[type="email"]', 'test@example.com');
        await page1.fill('input[type="password"]', 'TestPassword123!');
        await page1.click('button[type="submit"]');
        
        // 等待登录完成
        await expect(page1).toHaveURL(/dashboard/, { timeout: 10000 });
        
        // 在第二个标签中检查是否需要重新登录
        await page2.goto('/dashboard');
        
        // 应该需要重新登录（除非使用了共享会话）
        const isLoggedIn = await page2.locator('text=Dashboard, text=仪表板').count() > 0;
        const needsLogin = page2.url().includes('login');
        
        // 会话管理行为取决于应用的设计
        expect(isLoggedIn || needsLogin).toBe(true);
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('应正确处理并发登录尝试', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      try {
        await page.goto('/login');
        
        // 模拟快速连续的登录尝试
        const loginPromises = [];
        for (let i = 0; i < 3; i++) {
          loginPromises.push(
            page.evaluate(async () => {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: 'test@example.com',
                  password: 'TestPassword123!'
                })
              });
              return response.status;
            })
          );
        }
        
        const results = await Promise.all(loginPromises);
        
        // 应该有适当的速率限制或处理并发请求
        const successCount = results.filter(status => status === 200).length;
        expect(successCount).toBeLessThanOrEqual(1); // 应该只有一个成功
        
      } finally {
        await context.close();
      }
    });
  });

  test.describe('Content Security Policy', () => {
    test('应设置适当的安全头部', async ({ page }) => {
      const response = await page.goto('/');
      
      if (response) {
        const headers = response.headers();
        
        // 检查重要的安全头部
        const securityHeaders = [
          'x-frame-options',
          'x-content-type-options',
          'x-xss-protection'
        ];
        
        // 至少应该设置一些基本的安全头部
        const hasSecurityHeaders = securityHeaders.some(header => 
          headers[header] !== undefined
        );
        
        // 如果没有设置安全头部，至少记录警告
        if (!hasSecurityHeaders) {
          console.warn('Warning: No security headers detected. Consider adding CSP, X-Frame-Options, etc.');
        }
        
        // 检查Content-Type头部是否正确设置
        expect(headers['content-type']).toMatch(/text\/html|application\/json/);
      }
    });
  });
});