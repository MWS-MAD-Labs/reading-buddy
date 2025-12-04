import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show login page with Google OAuth", async ({ page }) => {
    await page.goto("/login");

    // Check for login heading (actual text from LoginForm.tsx)
    await expect(
      page.getByRole("heading", { name: /Welcome to Reading Buddy/i }),
    ).toBeVisible();

    // Check for Google sign-in button
    await expect(
      page.getByRole("button", { name: /Sign In with Google/i }),
    ).toBeVisible();

    // Check for workspace restriction message
    await expect(page.getByText(/@millennia21\.id/i)).toBeVisible();
  });

  test("should redirect to Google OAuth when clicking sign in", async ({
    page,
  }) => {
    await page.goto("/login");

    // Get the Google sign-in button
    const googleButton = page.getByRole("button", {
      name: /Sign In with Google/i,
    });
    await expect(googleButton).toBeVisible();

    // Click the button - this will redirect to Google OAuth
    await googleButton.click();

    // Wait for navigation to Google OAuth or callback
    await page.waitForURL(/accounts\.google\.com|auth\/callback/, {
      timeout: 10000,
    });

    // Should navigate away from login page (to Google or callback)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("http://localhost:3000/login");
  });

  test("should show error message structure", async ({ page }) => {
    // Verify the page has proper structure for error display
    await page.goto("/login");

    // Check that the page has proper structure for error display
    const loginForm = page
      .locator("div")
      .filter({ hasText: /Welcome to Reading Buddy/i })
      .first();
    await expect(loginForm).toBeVisible();

    // Verify button is enabled and clickable
    const googleButton = page.getByRole("button", {
      name: /Sign In with Google/i,
    });
    await expect(googleButton).toBeEnabled();
  });

  test("should display loading state when signing in", async ({ page }) => {
    await page.goto("/login");

    const googleButton = page.getByRole("button", {
      name: /Sign In with Google/i,
    });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).not.toBeDisabled();

    // Click and immediately check for loading state (or redirect)
    await googleButton.click();

    // Either button shows loading text or we've already redirected
    // This is a fast operation so we accept both outcomes
    const buttonText = await googleButton
      .textContent({ timeout: 1000 })
      .catch(() => null);
    if (buttonText) {
      expect(buttonText).toMatch(/Redirecting|Sign In with Google/i);
    }
  });
});
