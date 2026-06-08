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

  async navigateToRoomBooking(roomId: number = 1) {
    // Navigate to room reservation page with dates
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const checkIn = today.toISOString().split('T')[0];
    const checkOut = tomorrow.toISOString().split('T')[0];
    
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
    // Check for various alert/error message elements
    try {
      const alert = this.page.locator('role=alert');
      if (await alert.isVisible({ timeout: 1000 })) {
        const text = await alert.textContent();
        return text && text.trim().length > 0 ? text.trim() : null;
      }
    } catch {}
    
    try {
      // Also check for error list items
      const errorList = this.page.locator('role=alert li');
      if (await errorList.first().isVisible({ timeout: 1000 })) {
        const text = await errorList.first().textContent();
        return text && text.trim().length > 0 ? text.trim() : null;
      }
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
