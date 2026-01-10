import { test, expect } from '@playwright/test';
import { loginWithCredentials } from './helpers/auth-helper';

test.describe('E-Reader Functionality', () => {
    let bookId: number;

    test.beforeEach(async ({ page }) => {
        // Collect console logs if they start with DEBUG:
        page.on('console', msg => {
            if (msg.text().startsWith('DEBUG:')) {
                console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
            }
        });

        // 1. Login
        await loginWithCredentials(page);

        // 2. Find a book to test with (we'll look for one on the dashboard)
        await page.goto('/dashboard/student');

        // Wait for the library to load
        await page.waitForSelector('text=Library');

        // Click on the first book we find
        const firstBookLink = page.locator('a[href*="/dashboard/student/read/"]').first();
        await expect(firstBookLink).toBeVisible();

        const href = await firstBookLink.getAttribute('href');
        const match = href?.match(/\/read\/(\d+)/);
        bookId = match ? Number(match[1]) : NaN;

        // More robust navigation for CI
        await firstBookLink.scrollIntoViewIfNeeded();
        await Promise.all([
            page.waitForURL(new RegExp(`/dashboard/student/read/${bookId}`), { timeout: 15000 }),
            firstBookLink.click()
        ]);
    });

    test('should load the reader and display book content', async ({ page }) => {
        // Wait for loading indicator to disappear and reader content to appear
        await page.waitForSelector('text=Loading book...', { state: 'hidden', timeout: 30000 });

        // Check if we hit an error state (which would cause timeout on .reader-page-content)
        const errorMsg = page.locator('text=Unable to Load Book');
        if (await errorMsg.count() > 0) {
            const text = await errorMsg.textContent();
            console.log('Reader Error:', text);
        }

        await page.waitForSelector('.reader-page-content', { state: 'attached', timeout: 30000 });

        // Verify book title is visible in the header
        const title = await page.locator('h1').textContent();
        expect(title?.length).toBeGreaterThan(0);

        // Verify page number indicator
        await expect(page.locator('span:has-text("📍 Page")').first()).toBeVisible();
    });

    test('should navigate between pages', async ({ page }) => {
        await page.waitForSelector('.reader-page-content', { state: 'attached', timeout: 30000 });

        // Use the "Go to" form for reliable navigation in tests
        const jumpInput = page.locator('#page-jump');
        await jumpInput.fill('3');
        await page.getByRole('button', { name: 'Go', exact: true }).click();

        await expect(page.locator('span:has-text("📍 Page")').first()).toContainText('Page 3', { timeout: 10000 });

        // Navigate back
        await jumpInput.fill('1');
        await page.getByRole('button', { name: 'Go', exact: true }).click();
        await expect(page.locator('span:has-text("📍 Page")').first()).toContainText('Page 1', { timeout: 10000 });
    });

    test('should persist reading progress after reload', async ({ page }) => {
        await page.waitForSelector('.reader-page-content', { state: 'attached', timeout: 30000 });

        // Navigate to page 3 using the jump form for reliability
        const jumpInput = page.locator('#page-jump');
        await jumpInput.fill('3');
        await page.getByRole('button', { name: 'Go', exact: true }).click();

        await expect(page.locator('span:has-text("📍 Page")').first()).toContainText('Page 3', { timeout: 10000 });

        // Wait for the debounced save to trigger (3 seconds in UnifiedBookReader)
        // Increased to 8s for CI reliability
        await page.waitForTimeout(8000);

        // Reload the page
        await page.reload();
        await page.waitForSelector('.reader-page-content', { state: 'attached', timeout: 30000 });

        // Verify we are back on page 3
        await expect(page.locator('span:has-text("📍 Page")').first()).toContainText('Page 3', { timeout: 15000 });
    });

    test('should open and adjust reading settings', async ({ page }) => {
        await page.waitForSelector('.reader-page-content', { state: 'attached', timeout: 30000 });

        // Open settings
        const settingsButton = page.getByRole('button', { name: '⚙️ Settings', exact: true });
        await settingsButton.click();

        // Check if we are in Legacy FlipBook mode (Zoom controls) or Unified Reader mode (Modal)
        // We wait for either the Modal header or the Zoom label
        const settingsHeader = page.getByText('Reading Settings');
        const zoomLabel = page.getByText('🔍 Zoom');

        // Wait for one of them to appear
        await expect(settingsHeader.or(zoomLabel)).toBeVisible();

        if (await zoomLabel.isVisible()) {
            console.log('Detected Legacy FlipBookReader mode - verifying zoom controls');
            await expect(zoomLabel).toBeVisible();
            // Click zoom in
            await page.getByRole('button', { name: '+', exact: true }).click();
            // Click zoom out
            await page.getByRole('button', { name: '–', exact: true }).click();

            // Close settings (toggle again)
            await settingsButton.click();
            await expect(zoomLabel).not.toBeVisible();
        } else {
            console.log('Detected Standard Reader mode - verifying settings modal');
            // Verify settings modal is open
            await expect(settingsHeader).toBeVisible();

            // Change theme (Sepia)
            const sepiaButton = page.getByRole('button', { name: 'Sepia', exact: true });
            await sepiaButton.click();

            // Close settings (click Close button or press Escape)
            const closeButton = page.locator('button:has-text("✕")').first();
            if (await closeButton.isVisible()) {
                await closeButton.click();
            } else {
                await page.keyboard.press('Escape');
            }

            // Wait for modal to be hidden
            await expect(settingsHeader).not.toBeVisible();
        }
    });
});
