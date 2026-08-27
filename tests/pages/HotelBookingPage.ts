import { Page } from '@playwright/test';

export class HotelBookingPage {
  readonly page: Page;
  
  // Selectors
  readonly firstNameInput = 'input[name="firstname"]';
  readonly lastNameInput = 'input[name="lastname"]';
  readonly emailInput = 'input[name="email"]';
  readonly phoneInput = 'input[name="phone"]';
  readonly reserveButton = 'button:has-text("Reserve Now")';
  readonly cancelButton = 'button:has-text("Cancel")';
  readonly bookButton = 'a:has-text("Book now")';
  readonly errorAlert = 'alert';

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToHome() {
    await this.page.goto('/', { waitUntil: 'networkidle' });
  }

  async navigateToRoomBooking(roomId: number = 1, checkIn?: string, checkOut?: string) {
    // Navigate to room reservation page with dates. Defaults to today/tomorrow;
    // pass explicit checkIn/checkOut (YYYY-MM-DD) for tests that need specific,
    // non-colliding, or deliberately invalid date ranges.
    if (!checkIn || !checkOut) {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      checkIn = checkIn ?? today.toISOString().split('T')[0];
      checkOut = checkOut ?? tomorrow.toISOString().split('T')[0];
    }

    await this.page.goto(`/reservation/${roomId}?checkin=${checkIn}&checkout=${checkOut}`, {
      waitUntil: 'networkidle'
    });
  }

  async clickReserveNow() {
    // This button appears when we load the reservation page
    const button = this.page.locator(this.reserveButton);
    await button.click();
    // Wait for form to appear
    await this.page.waitForSelector(this.firstNameInput);
  }

  async fillFirstName(firstName: string) {
    await this.page.fill(this.firstNameInput, firstName);
  }

  async fillLastName(lastName: string) {
    await this.page.fill(this.lastNameInput, lastName);
  }

  async fillEmail(email: string) {
    await this.page.fill(this.emailInput, email);
  }

  async fillPhone(phone: string) {
    await this.page.fill(this.phoneInput, phone);
  }

  async fillBookingForm(
    firstName: string,
    lastName: string,
    email: string,
    phone: string
  ) {
    await this.fillFirstName(firstName);
    await this.fillLastName(lastName);
    await this.fillEmail(email);
    await this.fillPhone(phone);
  }

  async submitBooking() {
    const button = this.page.locator(this.reserveButton).last();
    await button.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getErrorMessages() {
    // BUG FIX, two compounding issues in the original implementation:
    //
    // 1. This app's Next.js route announcer (#__next-route-announcer__) also
    //    carries role="alert" and is permanently present (empty) on every page. A
    //    plain `role=alert` / `[role="alert"]` locator therefore always resolves to
    //    2+ elements whenever a real validation banner is shown, causing a
    //    strict-mode violation. Scoping to the banner's `.alert-danger` class (the
    //    real element is `<div class="alert alert-danger" role="alert">`) avoids
    //    the announcer entirely.
    // 2. `locator.isVisible({ timeout })` does NOT poll/retry despite accepting a
    //    timeout option - it's an immediate, single check. Right after
    //    submitBooking()'s waitForLoadState('networkidle'), the error banner has
    //    often not been painted into the DOM yet, so isVisible() returned false
    //    on that first check and this method returned null even though the error
    //    appears half a second later. `locator.waitFor({ state: 'visible' })` is
    //    the version that actually retries until the element shows up.
    try {
      const errorBanner = this.page.locator('[role="alert"].alert-danger').first();
      await errorBanner.waitFor({ state: 'visible', timeout: 3000 });
      const text = await errorBanner.textContent();
      return text && text.trim().length > 0 ? text.trim() : null;
    } catch {}

    return null;
  }

  async isPhoneFieldValid() {
    const phoneInput = this.page.locator(this.phoneInput);
    return await phoneInput.evaluate((el: any) => el.validity.valid);
  }

  async getPageTitle() {
    return await this.page.title();
  }
}
