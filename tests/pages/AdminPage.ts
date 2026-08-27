import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the /admin login page and the auth-gated /admin/rooms area.
 */
export class AdminPage {
  readonly page: Page;

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('button[type="submit"]').first();
  }

  async goto(path: string = '/admin') {
    await this.page.goto(path, { waitUntil: 'networkidle' });
  }

  async isLoginFormVisible(): Promise<boolean> {
    return (await this.usernameInput.isVisible()) && (await this.passwordInput.isVisible());
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Seed a bogus auth token into localStorage, simulating a forged/expired session. */
  async seedFakeToken(token: string = 'fake.invalid.token') {
    await this.page.evaluate((t) => localStorage.setItem('token', t), token);
  }
}
