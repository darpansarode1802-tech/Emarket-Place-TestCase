import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { login as seedLogin } from '../../utils/login';

test.setTimeout(120000);

const baseUrl = 'https://dev.hellobooks.ai';

// Helper: textRegex(text) - escapes regex special chars and returns case-insensitive RegExp
function textRegex(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

// Optional action wrapper - tries action but doesn't fail test if element not found
async function optionalAction(locator: Locator, action: () => Promise<void>, note: string) {
  const target = locator.first();
  try {
    await target.waitFor({ state: 'visible', timeout: 5000 });
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await action();
    return;
  } catch {
    test.info().annotations.push({ type: 'note', description: note });
  }
}

// Safe visibility check that adds annotation instead of failing
async function safeExpectVisible(locator: Locator, note: string, timeout = 5000) {
  try {
    await expect(locator).toBeVisible({ timeout });
    return true;
  } catch {
    test.info().annotations.push({ type: 'note', description: note });
    return false;
  }
}

// Wait for page to be ready after navigation
async function waitForPageReady(page: Page, expectedRoute?: string) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  if (expectedRoute) {
    await expect(page).toHaveURL(new RegExp(expectedRoute), { timeout: 15000 });
  }
}

// Fill form field with retry logic
async function fillField(page: Page, selector: string, value: string, fieldName: string) {
  const field = page.locator(selector).first();
  try {
    await field.waitFor({ state: 'visible', timeout: 10000 });
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.clear();
    await field.fill(value);
  } catch {
    test.info().annotations.push({ type: 'note', description: `Could not fill ${fieldName}` });
  }
}

// Click button with text matching
async function clickButton(page: Page, textPattern: RegExp | string, note: string) {
  const button = page.getByRole('button', { name: textPattern }).first();
  try {
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.scrollIntoViewIfNeeded().catch(() => {});
    await button.click();
    return true;
  } catch {
    test.info().annotations.push({ type: 'note', description: note });
    return false;
  }
}

// Select dropdown option
async function selectOption(page: Page, triggerSelector: string, optionText: string, fieldName: string) {
  try {
    const trigger = page.locator(triggerSelector).first();
    await trigger.waitFor({ state: 'visible', timeout: 10000 });
    await trigger.click();
    await page.waitForTimeout(500);
    const option = page.getByRole('option', { name: new RegExp(optionText, 'i') }).first();
    await option.click();
  } catch {
    test.info().annotations.push({ type: 'note', description: `Could not select ${fieldName}` });
  }
}

// Get first data row from table
async function firstRow(page: Page) {
  const row = page.locator('table tbody tr, [role="row"]').filter({ hasNotText: /no data|empty/i }).first();
  if (await row.count()) {
    await row.scrollIntoViewIfNeeded().catch(() => {});
    return row;
  }
  return null;
}

// Wait for toast/notification
async function waitForToast(page: Page, pattern: RegExp, timeout = 10000) {
  try {
    const toast = page.locator('[role="status"], .toast, .sonner-toast, [data-sonner-toast]').filter({ hasText: pattern }).first();
    await toast.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

test.describe('Authentication @S0zgl0dsf', () => {
  test('Login Page Display and Elements @T2ajirqnp', async ({ page }) => {
    // STEP 1: Login using seedLogin utility (REQUIRED)
    await seedLogin(page);

    // STEP 2: Navigate to the starting point
    await page.goto(`${baseUrl}`);
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/\/login/i, { timeout: 20000 });

    // Attempt to log out to view login page (optional if already logged out)
    const userMenuButton = page.getByRole('button', { name: /account|profile|user|avatar|settings|menu/i }).first();
    await optionalAction(
      userMenuButton,
      async () => {
        await userMenuButton.click();
      },
      'User menu button not found for logout'
    );

    const logoutLink = page.getByRole('menuitem', { name: /logout|sign out/i }).first();
    await optionalAction(
      logoutLink,
      async () => {
        await logoutLink.click();
      },
      'Logout option not found'
    );

    // Navigate explicitly to login page
    await page.goto(`${baseUrl}/login`);
    await waitForPageReady(page, '/login');

    // STEP 3: Verify login page elements are visible
    const emailField = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
    const passwordField = page.locator('input[type="password"], input[name*="password" i], input[placeholder*="password" i]').first();
    const signInButton = page.getByRole('button', { name: /sign in|log in|login/i }).first();
    const signUpLink = page.getByRole('link', { name: /sign up|create account|register/i }).first();
    const forgotPasswordLink = page.getByRole('link', { name: /forgot password|reset password/i }).first();
    const loginHeading = page.getByRole('heading', { name: /sign in|log in|login/i }).first();

    await expect(loginHeading).toBeVisible({ timeout: 10000 });
    await expect(emailField).toBeVisible({ timeout: 10000 });
    await expect(passwordField).toBeVisible({ timeout: 10000 });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await expect(signUpLink).toBeVisible({ timeout: 10000 });
    await expect(forgotPasswordLink).toBeVisible({ timeout: 10000 });

    // FINAL STEP: Verify the operation completed successfully
    await expect(page).toHaveURL(/\/login/i, { timeout: 15000 });
  });
});