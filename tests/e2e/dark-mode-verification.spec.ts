import { test, expect } from '@playwright/test';

test.describe('Dark Mode Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('Dark mode makes the page actually dark', async ({ page }) => {
    const themeToggle = page.locator('#theme-toggle-footer');
    
    // Capture initial light mode colors
    const lightModeColors = await page.evaluate(() => {
      const body = document.body;
      const bodyStyles = window.getComputedStyle(body);
      return {
        bodyBg: bodyStyles.backgroundColor,
        bodyColor: bodyStyles.color
      };
    });
    
    // Toggle to dark mode
    await themeToggle.click();
    await page.waitForTimeout(500);
    
    // Verify HTML has dark class
    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('dark');
    
    // Capture dark mode colors
    const darkModeColors = await page.evaluate(() => {
      const body = document.body;
      const bodyStyles = window.getComputedStyle(body);
      return {
        bodyBg: bodyStyles.backgroundColor,
        bodyColor: bodyStyles.color
      };
    });
    
    // Verify colors actually changed
    expect(darkModeColors.bodyBg).not.toBe(lightModeColors.bodyBg);
    expect(darkModeColors.bodyColor).not.toBe(lightModeColors.bodyColor);
    
    // Verify body background is actually dark
    const bodyBgRgb = await page.evaluate(() => {
      const body = document.body;
      const bg = window.getComputedStyle(body).backgroundColor;
      
      const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3])
        };
      }
      return null;
    });
    
    if (bodyBgRgb) {
      // Calculate brightness (0-255, lower is darker)
      const brightness = (bodyBgRgb.r * 299 + bodyBgRgb.g * 587 + bodyBgRgb.b * 114) / 1000;
      
      // Should be dark (brightness < 128)
      expect(brightness).toBeLessThan(100);
      console.log(`Dark mode body brightness: ${brightness} (should be < 100)`);
    }
  });

  test('Dark mode feature icons are properly styled', async ({ page }) => {
    const themeToggle = page.locator('#theme-toggle-footer');
    
    // Toggle to dark mode
    await themeToggle.click();
    await page.waitForTimeout(500);
    
    // Check feature card icons
    const featureIcons = page.locator('.bg-red-100, .bg-blue-100, .bg-green-100, .bg-purple-100, .bg-orange-100, .bg-indigo-100');
    const iconCount = await featureIcons.count();
    
    expect(iconCount).toBeGreaterThan(0);
    
    // Test first few icons have dark mode styling
    for (let i = 0; i < Math.min(iconCount, 3); i++) {
      const icon = featureIcons.nth(i);
      
      const iconBgRgb = await icon.evaluate((el) => {
        const bg = window.getComputedStyle(el).backgroundColor;
        const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
          };
        }
        return null;
      });
      
      if (iconBgRgb) {
        // Icon backgrounds should be darker in dark mode
        const brightness = (iconBgRgb.r * 299 + iconBgRgb.g * 587 + iconBgRgb.b * 114) / 1000;
        expect(brightness).toBeLessThan(150);
        console.log(`Feature icon ${i} brightness: ${brightness} (should be < 150)`);
      }
    }
  });

  test('Dark mode visual comparison screenshots', async ({ page }) => {
    // Capture light mode
    await expect(page).toHaveScreenshot('light-mode-full.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Toggle to dark mode
    const themeToggle = page.locator('#theme-toggle-footer');
    await themeToggle.click();
    await page.waitForTimeout(500);
    
    // Capture dark mode
    await expect(page).toHaveScreenshot('dark-mode-full.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Dark mode contrast verification', async ({ page }) => {
    const themeToggle = page.locator('#theme-toggle-footer');
    
    // Toggle to dark mode
    await themeToggle.click();
    await page.waitForTimeout(500);
    
    // Check contrast between body background and text
    const contrastData = await page.evaluate(() => {
      const body = document.body;
      const bodyStyles = window.getComputedStyle(body);
      
      const bgMatch = bodyStyles.backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      const colorMatch = bodyStyles.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      
      if (bgMatch && colorMatch) {
        const bg = {
          r: parseInt(bgMatch[1]),
          g: parseInt(bgMatch[2]),
          b: parseInt(bgMatch[3])
        };
        const text = {
          r: parseInt(colorMatch[1]),
          g: parseInt(colorMatch[2]),
          b: parseInt(colorMatch[3])
        };
        
        // Calculate relative luminance
        const getLuminance = (rgb: {r: number, g: number, b: number}) => {
          const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        
        const bgLuminance = getLuminance(bg);
        const textLuminance = getLuminance(text);
        
        // Calculate contrast ratio
        const contrast = (Math.max(bgLuminance, textLuminance) + 0.05) / 
                        (Math.min(bgLuminance, textLuminance) + 0.05);
        
        return {
          bg,
          text,
          bgLuminance,
          textLuminance,
          contrast
        };
      }
      return null;
    });
    
    if (contrastData) {
      // WCAG AA requires 4.5:1 for normal text
      expect(contrastData.contrast).toBeGreaterThan(4.5);
      console.log(`Dark mode contrast ratio: ${contrastData.contrast.toFixed(2)}:1 (should be > 4.5:1)`);
      
      // Verify background is actually dark (low luminance)
      expect(contrastData.bgLuminance).toBeLessThan(0.2);
      
      // Verify text is actually light (high luminance)
      expect(contrastData.textLuminance).toBeGreaterThan(0.5);
    }
  });
});
