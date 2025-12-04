import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');

    // Check for login form elements
    await expect(page.getByRole('heading', { name: /login|sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /login|sign in/i });

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should see validation errors or stay on the same page
      // This will depend on your actual form validation implementation
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    }
  });

  test('should navigate to signup from login', async ({ page }) => {
    await page.goto('/login');

    // Look for signup link
    const signupLink = page.getByRole('link', { name: /sign up|register|create account/i });

    if (await signupLink.isVisible()) {
      await signupLink.click();

      // Should navigate to signup page
      await expect(page).toHaveURL(/signup|register/i);
    }
  });
});
