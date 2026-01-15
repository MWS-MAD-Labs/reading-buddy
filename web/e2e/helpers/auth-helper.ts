import { Page, expect } from '@playwright/test';

/**
 * Log in a user programmatically using the Credentials provider.
 * This avoids the need to interact with the UI for authentication.
 */
export async function loginWithCredentials(
    page: Page,
    email: string = 'test-reader@millennia21.id',
    password: string = 'password123'
) {
    // Go to login page first to ensure we have any necessary cookies (like CSRF)
    await page.goto('/login');

    // NextAuth.js v5 uses a different way to handle credentials from the client side
    // But we can simulate hitting the sign-in form or just use the NextAuth API

    // For simplicity and robustness, we'll hit the sign-in API directly via request
    const response = await page.request.post('/api/auth/callback/credentials', {
        form: {
            email,
            password,
            redirect: 'false',
            csrfToken: await getCsrfToken(page),
        },
    });

    expect(response.ok()).toBeTruthy();

    // Reload the page to ensure the session is picked up
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
}

/**
 * Get the CSRF token from the NextAuth API
 */
async function getCsrfToken(page: Page): Promise<string> {
    const response = await page.request.get('/api/auth/csrf');
    const data = await response.json();
    return data.csrfToken;
}
