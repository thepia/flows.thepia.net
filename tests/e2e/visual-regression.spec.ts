import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Branding Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the landing page
    await page.goto('http://dev.thepia.net:5178/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for any animations or dynamic content
    await page.waitForTimeout(1000);
  });

  test('Full page screenshot - current state', async ({ page }) => {
    // Capture full page screenshot
    await expect(page).toHaveScreenshot('landing-page-full.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Hero section screenshot', async ({ page }) => {
    const heroSection = page.locator('section').first();
    await expect(heroSection).toHaveScreenshot('hero-section.png', {
      animations: 'disabled'
    });
  });

  test('Button styling verification', async ({ page }) => {
    // Look for buttons and capture their styling
    const buttons = page.locator('button, .btn-primary, .btn-secondary, .btn-outline');
    
    if (await buttons.count() > 0) {
      await expect(buttons.first()).toHaveScreenshot('button-styling.png', {
        animations: 'disabled'
      });
    }
  });

  test('How It Works section', async ({ page }) => {
    const howItWorksSection = page.locator('#how-it-works');
    if (await howItWorksSection.count() > 0) {
      await expect(howItWorksSection).toHaveScreenshot('how-it-works-section.png', {
        animations: 'disabled'
      });
    }
  });

  test('Features section', async ({ page }) => {
    const featuresSection = page.locator('#features');
    if (await featuresSection.count() > 0) {
      await expect(featuresSection).toHaveScreenshot('features-section.png', {
        animations: 'disabled'
      });
    }
  });

  test('Color verification - check computed styles', async ({ page }) => {
    // Check if primary colors are being applied correctly
    const primaryElements = page.locator('.btn-primary, .step-indicator, .gradient-text');
    
    if (await primaryElements.count() > 0) {
      const element = primaryElements.first();
      const computedStyle = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          borderColor: styles.borderColor
        };
      });
      
      console.log('Primary element computed styles:', computedStyle);
    }
  });

  test('CSS custom properties verification', async ({ page }) => {
    // Check if branding CSS variables are loaded
    const cssVariables = await page.evaluate(() => {
      const rootStyles = window.getComputedStyle(document.documentElement);
      return {
        'color-brand-primary': rootStyles.getPropertyValue('--color-brand-primary').trim(),
        'color-palette-thepia-400': rootStyles.getPropertyValue('--color-palette-thepia-400').trim(),
        'color-primary': rootStyles.getPropertyValue('--color-primary').trim(),
      };
    });
    
    console.log('CSS Variables:', cssVariables);
    
    // Verify that branding variables are loaded
    expect(cssVariables['color-brand-primary']).toBeTruthy();
    expect(cssVariables['color-palette-thepia-400']).toBeTruthy();
  });
});
