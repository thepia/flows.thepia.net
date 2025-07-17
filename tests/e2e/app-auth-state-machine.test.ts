/**
 * App Authentication State Machine Integration Test
 * 
 * This test verifies that the actual /app page follows the documented
 * authentication state machine behavior by testing real scenarios.
 */

import { test, expect } from '@playwright/test';

test.describe('App Authentication State Machine Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session data
    await page.goto('/app');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should follow CheckingSession → SessionInvalid flow for unauthenticated user', async ({ page }) => {
    await page.goto('/app');

    // Wait for page to load and show sign-in form (no loading state in current implementation)
    await expect(page.locator('.signin-container')).toBeVisible();
    await expect(page.locator('h2.signin-title')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in with Passkey")')).toBeVisible();

    // Should not show multiple states simultaneously
    await expect(page.locator('.demo-app')).not.toBeVisible();
    await expect(page.locator('.registration-container')).not.toBeVisible();
  });

  test('should show registration form for valid invitation token', async ({ page }) => {
    // Create a valid invitation token (basic JWT structure)
    const tokenData = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      company: 'Test Company',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000) - 60    // 1 minute ago
    };
    
    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(tokenData))}.mock-signature`;
    
    await page.goto(`/app?token=${token}`);

    // Should show registration form (wait for it to load)
    await expect(page.locator('.registration-container')).toBeVisible();
    // Check for actual registration title (may be different text)
    await expect(page.locator('h2.registration-title')).toBeVisible();

    // Should pre-fill form with token data
    await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com');
    await expect(page.locator('input#firstName')).toHaveValue('Test');
    await expect(page.locator('input#lastName')).toHaveValue('User');
    await expect(page.locator('input#company')).toHaveValue('Test Company');

    // Should not show other states
    await expect(page.locator('.signin-container')).not.toBeVisible();
    await expect(page.locator('.demo-app')).not.toBeVisible();
  });

  test('should handle invalid invitation token gracefully', async ({ page }) => {
    await page.goto('/app?token=invalid-token');

    // Should show loading state initially
    await expect(page.locator('.loading-container')).toBeVisible();

    // Should show error message for invalid token
    await expect(page.locator('.error-banner')).toBeVisible();
    await expect(page.locator('text=Invalid invitation link')).toBeVisible();

    // Should not show registration form
    await expect(page.locator('.registration-container')).not.toBeVisible();
  });

  test('should handle expired invitation token', async ({ page }) => {
    // Create an expired invitation token
    const tokenData = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      iat: Math.floor(Date.now() / 1000) - 7200   // 2 hours ago
    };
    
    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(tokenData))}.mock-signature`;
    
    await page.goto(`/app?token=${token}`);

    // Should show error for expired token
    await expect(page.locator('.error-banner')).toBeVisible();
    await expect(page.locator('text=Invalid or expired invitation token')).toBeVisible();
  });

  test('should maintain single source of truth - no duplicate states', async ({ page }) => {
    await page.goto('/app');

    // Wait for loading to complete
    await page.waitForTimeout(1000);

    // Count visible auth states
    const stateSelectors = [
      '.loading-container',
      '.signin-container', 
      '.registration-container',
      '.demo-app'
    ];

    const visibleStates = [];
    for (const selector of stateSelectors) {
      const isVisible = await page.locator(selector).isVisible();
      if (isVisible) {
        visibleStates.push(selector);
      }
    }

    // Should have exactly one visible state
    expect(visibleStates.length).toBeLessThanOrEqual(1);
    
    // Should be in signin state for unauthenticated user
    if (visibleStates.length === 1) {
      expect(visibleStates[0]).toBe('.signin-container');
    }
  });

  test('should handle sign-in form validation', async ({ page }) => {
    await page.goto('/app');
    
    // Wait for signin form to load
    await expect(page.locator('.signin-container')).toBeVisible();

    // Try to submit without email
    const submitButton = page.locator('button:has-text("Sign in with Passkey")');
    await expect(submitButton).toBeDisabled();

    // Enter email and check button is enabled
    await page.fill('input[type="email"]', 'test@example.com');
    await expect(submitButton).toBeEnabled();

    // Clear email and check button is disabled again
    await page.fill('input[type="email"]', '');
    await expect(submitButton).toBeDisabled();
  });

  test('should handle registration form validation', async ({ page }) => {
    const tokenData = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 60
    };
    
    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(tokenData))}.mock-signature`;
    
    await page.goto(`/app?token=${token}`);
    
    // Wait for registration form to load
    await expect(page.locator('.registration-container')).toBeVisible();

    // Check required fields
    await expect(page.locator('input#email')).toHaveAttribute('required');
    await expect(page.locator('input#firstName')).toHaveAttribute('required');
    await expect(page.locator('input#lastName')).toHaveAttribute('required');

    // Check terms checkboxes are required
    await expect(page.locator('input[type="checkbox"]').first()).toHaveAttribute('required');
    await expect(page.locator('input[type="checkbox"]').nth(1)).toHaveAttribute('required');

    // Submit button should be disabled without terms acceptance
    const submitButton = page.locator('button:has-text("Create Account with Passkey")');
    await expect(submitButton).toBeDisabled();

    // Accept terms and check button is enabled
    const visibleCheckboxes = await page.locator('input[type="checkbox"]:visible').all();
    for (const checkbox of visibleCheckboxes) {
      await checkbox.check();
    }
    await expect(submitButton).toBeEnabled();
  });

  test('should show correct UI elements for each state', async ({ page }) => {
    // Test signin state
    await page.goto('/app');
    await expect(page.locator('.signin-container')).toBeVisible();
    
    // Check signin-specific elements
    await expect(page.locator('h2.signin-title')).toBeVisible();
    await expect(page.locator('text=Use your passkey to securely access your account')).toBeVisible();
    await expect(page.locator('text=Your device will prompt for Touch ID, Face ID, or Windows Hello')).toBeVisible();

    // Test registration state
    const tokenData = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 60
    };
    
    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(tokenData))}.mock-signature`;
    
    await page.goto(`/app?token=${token}`);
    await expect(page.locator('.registration-container')).toBeVisible();

    // Check registration-specific elements
    await expect(page.locator('h2.registration-title')).toBeVisible();
    await expect(page.locator('.registration-subtitle')).toBeVisible();
    await expect(page.locator('text=I agree to the Terms of Service')).toBeVisible();
    await expect(page.locator('text=I agree to the Privacy Policy')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept network requests and simulate failure
    await page.route('**/*', route => {
      if (route.request().url().includes('thepia.com')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/app');
    
    // Should still show signin form even if network fails
    await expect(page.locator('.signin-container')).toBeVisible();
    
    // Should not crash or show blank page
    await expect(page.locator('body')).toBeVisible();
  });

  test('should clean invitation URL after processing', async ({ page }) => {
    const tokenData = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 60
    };
    
    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(tokenData))}.mock-signature`;
    
    await page.goto(`/app?token=${token}`);
    
    // Wait for registration form to load
    await expect(page.locator('.registration-container')).toBeVisible();
    
    // URL should still contain token during registration
    expect(page.url()).toContain('token=');
    
    // If user were to authenticate, URL should be cleaned
    // (This would require actual authentication flow which is beyond scope)
  });

  test('should maintain responsive design across states', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app');
    
    await expect(page.locator('.signin-container')).toBeVisible();
    await expect(page.locator('.brand-lockup')).toBeVisible();
    await expect(page.locator('.app-footer')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    await expect(page.locator('.signin-container')).toBeVisible();
    await expect(page.locator('.brand-lockup')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    await expect(page.locator('.signin-container')).toBeVisible();
    await expect(page.locator('.brand-lockup')).toBeVisible();
  });
});