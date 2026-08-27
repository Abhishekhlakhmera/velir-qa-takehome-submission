import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the Shady Meadows B&B homepage:
 * - the "Check Availability & Book Your Stay" date-range widget (react-datepicker)
 * - the room cards grid ("Single" / "Double" / "Suite", each with a "Book now" link)
 * - the "Send Us a Message" contact form
 * - top nav (used to reach the Admin login page)
 */
export class HomePage {
  readonly page: Page;

  readonly checkInInput: Locator;
  readonly checkOutInput: Locator;
  readonly checkAvailabilityButton: Locator;
  readonly adminNavLink: Locator;

  readonly contactNameInput: Locator;
  readonly contactEmailInput: Locator;
  readonly contactPhoneInput: Locator;
  readonly contactSubjectInput: Locator;
  readonly contactMessageInput: Locator;
  readonly contactSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // The "Check In"/"Check Out" <label>s don't share an id with their <input>,
    // so we anchor off the label text and take the next input in the DOM.
    this.checkInInput = page.locator('text=Check In').locator('xpath=following::input[1]');
    this.checkOutInput = page.locator('text=Check Out').locator('xpath=following::input[1]');
    this.checkAvailabilityButton = page.getByRole('button', { name: /check availability/i });
    this.adminNavLink = page.getByRole('link', { name: 'Admin', exact: true });

    this.contactNameInput = page.locator('#name');
    this.contactEmailInput = page.locator('#email');
    this.contactPhoneInput = page.locator('#phone');
    this.contactSubjectInput = page.locator('#subject');
    this.contactMessageInput = page.locator('#description');
    this.contactSubmitButton = page.getByRole('button', { name: 'Submit' });
  }

  async goto() {
    await this.page.goto('/', { waitUntil: 'networkidle' });
  }

  /** Locator for a room card by its visible name (e.g. "Single", "Double", "Suite"). */
  roomCard(roomName: string): Locator {
    return this.page.locator('.card', { hasText: roomName }).filter({ hasText: 'per night' });
  }

  async openCheckInCalendar() {
    await this.checkInInput.click();
  }

  async openCheckOutCalendar() {
    await this.checkOutInput.click();
  }

  /** Advance whichever react-datepicker calendar is currently open by one month. */
  async goToNextMonthInOpenCalendar() {
    await this.page.locator('.react-datepicker__navigation--next').click();
  }

  /** Click a day cell in whichever react-datepicker calendar is currently open. */
  async selectDayInOpenCalendar(day: number) {
    const cell = this.page
      .locator('.react-datepicker__day:not(.react-datepicker__day--outside-month)', {
        hasText: new RegExp(`^${day}$`),
      })
      .first();
    await cell.click();
  }

  async selectCheckInDay(day: number) {
    await this.openCheckInCalendar();
    await this.selectDayInOpenCalendar(day);
  }

  async selectCheckOutDay(day: number) {
    await this.openCheckOutCalendar();
    await this.selectDayInOpenCalendar(day);
  }

  async getCheckInValue(): Promise<string> {
    return this.checkInInput.inputValue();
  }

  async getCheckOutValue(): Promise<string> {
    return this.checkOutInput.inputValue();
  }

  async clickCheckAvailability() {
    await this.checkAvailabilityButton.click();
  }

  /** Click "Book now" on the named room card, navigating to its reservation page. */
  async bookRoom(roomName: string) {
    await this.roomCard(roomName).getByRole('link', { name: 'Book now' }).click();
  }

  async fillContactForm(name: string, email: string, phone: string, subject: string, message: string) {
    await this.contactNameInput.fill(name);
    await this.contactEmailInput.fill(email);
    await this.contactPhoneInput.fill(phone);
    await this.contactSubjectInput.fill(subject);
    await this.contactMessageInput.fill(message);
  }

  async submitContactForm() {
    await this.contactSubmitButton.click();
  }

  async navigateToAdmin() {
    await this.adminNavLink.click();
  }
}
