import { test, expect } from '@playwright/test';
import { AdminPage } from '../pages/AdminPage';

/**
 * Testing Instructions #6: Admin routes without auth
 *
 * Run just this file: npx playwright test tests/security/admin-auth.spec.ts
 * Run just TC6:        npx playwright test --grep @tc6
 */

test.describe('[TC6] Admin routes without auth', () => {
  test(
    '[TC6] /admin without logging in should show the login form, not admin content',
    { tag: ['@tc6', '@security', '@auth', '@ui'] },
    async ({ page }) => {
      const adminPage = new AdminPage(page);
      await adminPage.goto('/admin');

      expect(await adminPage.isLoginFormVisible()).toBe(true);
    }
  );

  test(
    '[TC6] /admin/rooms without logging in should redirect to login, not leak room data',
    { tag: ['@tc6', '@security', '@auth', '@ui'] },
    async ({ page }) => {
      const adminPage = new AdminPage(page);
      await adminPage.goto('/admin/rooms');

      // Confirmed: this route redirects back to /admin and shows the login form.
      expect(page.url()).not.toContain('/admin/rooms');
      expect(await adminPage.isLoginFormVisible()).toBe(true);
    }
  );

  test(
    '[TC6] /admin/rooms with a forged/invalid token should still require login',
    { tag: ['@tc6', '@security', '@auth', '@ui'] },
    async ({ page }) => {
      const adminPage = new AdminPage(page);
      await adminPage.goto('/admin');
      await adminPage.seedFakeToken('fake.invalid.token');

      await adminPage.goto('/admin/rooms');

      expect(page.url()).not.toContain('/admin/rooms');
      expect(await adminPage.isLoginFormVisible()).toBe(true);
    }
  );

  test(
    '[TC6] Logging in with invalid credentials should be rejected with an error',
    { tag: ['@tc6', '@security', '@auth', '@ui'] },
    async ({ page }) => {
      const adminPage = new AdminPage(page);
      await adminPage.goto('/admin');
      await adminPage.login('invaliduser', 'wrongpassword');

      // Confirmed: stays on /admin and shows an "invalid" error message.
      expect(page.url()).toContain('/admin');
      await expect(page.locator('text=/invalid/i').first()).toBeVisible();
    }
  );
});
