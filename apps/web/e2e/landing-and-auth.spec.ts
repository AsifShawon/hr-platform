import { test, expect } from '@playwright/test';

test.describe('Landing Page & Public Shell', () => {
  test('renders dark editorial hero headline, bilingual card pair, and key invariants', async ({
    page,
  }) => {
    await page.goto('/');

    // Hero headline and subhead
    await expect(
      page.locator('h1', { hasText: 'Create accurate employee ID cards' }),
    ).toBeVisible();
    await expect(page.locator('text=on your own computer.').first()).toBeVisible();

    // CTAs exist
    const signInBtn = page.getByRole('link', { name: 'Sign In to Local Workspace' }).first();
    await expect(signInBtn).toBeVisible();

    // No public signup, SaaS request access, or cloud pricing anywhere
    await expect(page.locator('text=Start Free')).toHaveCount(0);
    await expect(page.locator('text=Sign up')).toHaveCount(0);
    await expect(page.locator('text=Create Account')).toHaveCount(0);
    await expect(page.locator('text=Request Access')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Bilingual Card Visuals rendered
    await expect(page.locator('text=Apex Industrial').first()).toBeVisible();
    await expect(page.locator('text=Tanvir Ahmed').first()).toBeVisible();
  });

  test('interactive tabs allow switching between worker flow, batch queue, and card engine', async ({
    page,
  }) => {
    await page.goto('/');

    // Check Worker Flow tab is default
    await expect(page.locator('text=Worker Card Creation & Live Preflight')).toBeVisible();

    // Click Batch Queue tab
    await page.getByRole('button', { name: 'Batch Queue & Defect Sign-off' }).click();
    await expect(page.locator('text=Persistent Queue & Physical Operator Sign-off')).toBeVisible();

    // Click Bilingual Card Engine tab
    await page.getByRole('button', { name: 'Bilingual Card Engine' }).click();
    await expect(page.locator('text=High-Precision Bilingual Imposition Engine')).toBeVisible();
  });

  test('presents local deployment modes and direct calibration links', async ({ page }) => {
    await page.goto('/');

    // Deployment mode cards
    await expect(page.locator('text=Single-PC Workstation')).toBeVisible();
    await expect(page.locator('text=Private Factory LAN')).toBeVisible();
    await expect(page.locator('text=100% Offline Capable').first()).toBeVisible();
  });

  test('FAQ accordion expands and collapses', async ({ page }) => {
    await page.goto('/');

    const firstFaqBtn = page.getByTestId('faq-btn-offline');
    await firstFaqBtn.scrollIntoViewIfNeeded();
    await expect(firstFaqBtn).toBeVisible();

    // Click to open
    await firstFaqBtn.click();
    await expect(page.getByTestId('faq-answer-offline')).toBeVisible();

    // Click to close
    await firstFaqBtn.click();
    await expect(page.getByTestId('faq-answer-offline')).toHaveCount(0);
  });

  test('no horizontal overflow on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBeFalsy();
  });
});

test.describe('Sign-In Presentation Shell', () => {
  test('renders two-column visual, local system badge, and show/hide password toggle', async ({
    page,
  }) => {
    await page.goto('/login');

    // Header & Privacy
    await expect(page.locator('h2', { hasText: 'Sign in to your organization' })).toBeVisible();
    await expect(page.locator('text=Strict Privacy & Tenant Isolation')).toBeVisible();

    // Local System Badge & recovery guidance
    await expect(page.locator('text=Local On-Premises System')).toBeVisible();
    await expect(page.locator('text=Local Node Active')).toBeVisible();
    await expect(page.locator('text=Contact your System Owner')).toBeVisible();

    // Password input toggle
    const passwordInput = page.locator('#auth-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    const showPasswordBtn = page.getByRole('button', { name: 'Show password' });
    await showPasswordBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    const hidePasswordBtn = page.getByRole('button', { name: 'Hide password' });
    await hidePasswordBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('enforces local recovery guidance without public password reset or SaaS links', async ({
    page,
  }) => {
    await page.goto('/login');

    // Local-only invariants
    await expect(page.locator('text=Contact your System Owner')).toBeVisible();
    await expect(page.locator('text=Forgot password?')).toHaveCount(0);
    await expect(page.locator('text=Request access')).toHaveCount(0);
    await expect(page.locator('text=Hosted Enterprise')).toHaveCount(0);
  });

  test('simulates generic authentication feedback without account-existence disclosure', async ({
    page,
  }) => {
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'The username or password entered is incorrect.',
        }),
      });
    });

    await page.goto('/login');

    // Enter wrong password
    await page.fill('#auth-username', 'admin@example.com');
    await page.fill('#auth-password', 'wrong');
    await page.getByRole('button', { name: 'Sign In to Workspace' }).click();

    // Generic error
    await expect(page.locator('text=Authentication Failed')).toBeVisible();
    await expect(page.locator('text=The username or password entered is incorrect.')).toBeVisible();
  });
});
