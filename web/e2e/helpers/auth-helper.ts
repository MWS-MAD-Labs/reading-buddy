import { Page, expect } from '@playwright/test';

/**
 * Log in a user programmatically using the Credentials provider.
 * This avoids the need to interact with the UI for authentication.
 *
 * The sign-in is done purely through API requests (no page is open yet), so
 * the CSRF cookie cannot be overwritten mid-flight by the login page's own
 * SessionProvider calling /api/auth/session — that race made logins fail
 * intermittently with MissingCSRF in CI.
 */
export async function loginWithCredentials(
    page: Page,
    email: string = 'test-reader@millennia21.id',
    password: string = 'password123'
) {
    const csrfResponse = await page.request.get('/api/auth/csrf');
    expect(csrfResponse.ok()).toBeTruthy();
    const { csrfToken } = await csrfResponse.json();

    // Don't follow the redirect: Auth.js answers failures with a 302 to
    // /login?error=..., which would otherwise look like a successful 200.
    const response = await page.request.post('/api/auth/callback/credentials', {
        form: { email, password, csrfToken },
        maxRedirects: 0,
    });
    const location = response.headers()['location'] ?? '';
    expect(
        response.status() === 302 && !location.includes('error='),
        `Credentials sign-in failed (status ${response.status()}, location "${location}")`,
    ).toBeTruthy();

    const sessionResponse = await page.request.get('/api/auth/session');
    const session = await sessionResponse.json();
    expect(session?.user?.email, 'No session after sign-in').toBe(email);

    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/dashboard/);
}
