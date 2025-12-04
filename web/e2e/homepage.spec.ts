import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/Reading Buddy|Home/i);
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Check for common navigation elements
    // Adjust selectors based on your actual homepage structure
    const loginLink = page.getByRole('link', { name: /login|sign in/i });
    await expect(loginLink).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still load and be functional
    await expect(page).toHaveTitle(/Reading Buddy|Home/i);
  });
});
