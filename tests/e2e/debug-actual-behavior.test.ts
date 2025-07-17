/**
 * Debug test to see what's actually on the /app page
 */

import { test, expect } from '@playwright/test';

test('Debug: What is actually on the /app page', async ({ page }) => {
  await page.goto('/app');
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Get the page content
  const pageContent = await page.content();
  console.log('=== PAGE CONTENT ===');
  console.log(pageContent);
  
  // Get all visible elements
  const visibleElements = await page.locator('*').all();
  console.log('\n=== VISIBLE ELEMENTS ===');
  for (const element of visibleElements.slice(0, 20)) { // First 20 elements
    try {
      const tagName = await element.evaluate(el => el.tagName);
      const className = await element.evaluate(el => el.className);
      const textContent = await element.evaluate(el => el.textContent?.trim() || '');
      
      if (textContent || className) {
        console.log(`${tagName}${className ? '.' + className : ''}: ${textContent.substring(0, 100)}`);
      }
    } catch (e) {
      // Skip elements that can't be evaluated
    }
  }
  
  // Check for specific selectors we expect
  const expectedSelectors = [
    '.loading-container',
    '.signin-container', 
    '.registration-container',
    '.demo-app',
    '.auth-container',
    '.app-container'
  ];
  
  console.log('\n=== SELECTOR CHECKS ===');
  for (const selector of expectedSelectors) {
    const exists = await page.locator(selector).count();
    const visible = exists > 0 ? await page.locator(selector).isVisible() : false;
    console.log(`${selector}: exists=${exists}, visible=${visible}`);
  }
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-app-page.png', fullPage: true });
  
  // This test always passes - it's just for debugging
  expect(true).toBe(true);
});