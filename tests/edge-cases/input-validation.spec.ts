import { test, expect } from '@playwright/test';
import { HotelBookingPage } from '../pages/HotelBookingPage';
import { ApiHelper } from '../utils/ApiHelper';
import { buildValidBookingPayload, INVALID_EMAILS, generateRandomEmail, getDateString } from '../utils/TestDataGenerator';

/**
 * Every test in this file books room 1 for a *distinct*, randomly-offset date
 * range rather than the default today/tomorrow. With fullyParallel test execution,
 * multiple tests hitting the same fixed room/date slot at once triggers a real
 * 409 room conflict on top of whatever field validation is being tested, which
 * crashes the UI (see [TC2-UI]) and swallows the validation banner this file is
 * actually checking for.
 */
function freshDateRange(): { checkIn: string; checkOut: string } {
  const start = 2000 + Math.floor(Math.random() * 5000);
  return { checkIn: getDateString(start), checkOut: getDateString(start + 2) };
}

/**
 * Testing Instructions #3: Invalid email/phone formats
 * Testing Instructions #4: Required fields skipped
 *
 * Run just this file:   npx playwright test tests/edge-cases/input-validation.spec.ts
 * Run just TC3:         npx playwright test --grep @tc3
 * Run just TC4:         npx playwright test --grep @tc4
 *
 * Note: the reservation form's firstname/lastname/email/phone inputs are plain
 * type="text" with no HTML5 `required`/`type=email` attributes - there is no native
 * browser-level validation. The form submits to the backend regardless, and any
 * validation errors come back from the server and are rendered in a [role="alert"]
 * banner. So "does the client-side accept it?" is checked here via that round trip,
 * not via el.validity.
 */

test.describe('[TC3] Invalid email/phone formats', () => {
  let bookingPage: HotelBookingPage;

  test.beforeEach(async ({ page }) => {
    bookingPage = new HotelBookingPage(page);
    const { checkIn, checkOut } = freshDateRange();
    await bookingPage.navigateToRoomBooking(1, checkIn, checkOut);
    await bookingPage.clickReserveNow();
  });

  for (const badEmail of INVALID_EMAILS) {
    test(
      `[TC3-UI] Should reject malformed email "${badEmail}"`,
      { tag: ['@tc3', '@validation', '@ui'] },
      async () => {
        await bookingPage.fillBookingForm('John', 'Doe', badEmail, '+1-555-1234567');
        await bookingPage.submitBooking();

        const errorMessages = await bookingPage.getErrorMessages();
        expect(errorMessages).toBeTruthy();
        expect(errorMessages).toMatch(/email/i);
      }
    );
  }

  test(
    '[TC3-UI] Should reject a too-short phone number ("abc")',
    { tag: ['@tc3', '@validation', '@ui'] },
    async () => {
      await bookingPage.fillBookingForm('John', 'Doe', generateRandomEmail(), 'abc');
      await bookingPage.submitBooking();

      const errorMessages = await bookingPage.getErrorMessages();
      expect(errorMessages).toBeTruthy();
      expect(errorMessages).toMatch(/size must be between|phone/i);
    }
  );

  test(
    '[TC3-API] createBooking should reject a malformed email',
    { tag: ['@tc3', '@validation', '@api'] },
    async () => {
      const payload = buildValidBookingPayload({ email: 'notanemail' });
      const response = await ApiHelper.createBooking(payload);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.data)).toMatch(/email/i);
    }
  );

  test(
    '[TC3-API] createBooking should reject a phone number that is only letters (format, not just length)',
    { tag: ['@tc3', '@validation', '@api'] },
    async () => {
      // KNOWN BUG: confirmed via direct probing - the API validates phone length
      // (11-21 chars) but not its format, so an 11-letter, all-alphabetic string
      // like "abcabcabcab" passes validation and creates a booking (201).
      test.fail(true, 'BUG: /api/booking/ phone validation is length-only, accepts non-numeric strings');

      const payload = buildValidBookingPayload({ phone: 'abcabcabcab' }); // 11 letters, valid length, invalid format
      const response = await ApiHelper.createBooking(payload);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
    }
  );
});

test.describe('[TC4] Required fields skipped', () => {
  let bookingPage: HotelBookingPage;

  test.beforeEach(async ({ page }) => {
    bookingPage = new HotelBookingPage(page);
    const { checkIn, checkOut } = freshDateRange();
    await bookingPage.navigateToRoomBooking(1, checkIn, checkOut);
    await bookingPage.clickReserveNow();
  });

  test(
    '[TC4-UI] Submitting a completely empty form should show validation errors for every field',
    { tag: ['@tc4', '@validation', '@ui'] },
    async () => {
      await bookingPage.submitBooking();

      const errorMessages = await bookingPage.getErrorMessages();
      expect(errorMessages).toBeTruthy();
      expect(errorMessages).toMatch(/firstname/i);
      expect(errorMessages).toMatch(/lastname/i);
    }
  );

  const requiredFieldCases: Array<{ field: 'firstname' | 'lastname' | 'email' | 'phone'; expectedError: RegExp }> = [
    { field: 'firstname', expectedError: /firstname/i },
    { field: 'lastname', expectedError: /lastname/i },
    { field: 'email', expectedError: /email|must not be empty/i },
    { field: 'phone', expectedError: /phone|size must be between/i },
  ];

  for (const { field, expectedError } of requiredFieldCases) {
    test(
      `[TC4-UI] Leaving "${field}" empty should be rejected`,
      { tag: ['@tc4', '@validation', '@ui'] },
      async () => {
        const values: Record<string, string> = {
          firstname: 'John',
          lastname: 'Doe',
          email: generateRandomEmail(),
          phone: '+1-555-1234567',
        };
        values[field] = '';
        await bookingPage.fillBookingForm(values.firstname, values.lastname, values.email, values.phone);
        await bookingPage.submitBooking();

        const errorMessages = await bookingPage.getErrorMessages();
        expect(errorMessages).toBeTruthy();
        expect(errorMessages).toMatch(expectedError);
      }
    );
  }

  test(
    '[TC4-API] createBooking should reject a payload missing required fields',
    { tag: ['@tc4', '@validation', '@api'] },
    async () => {
      const response = await ApiHelper.createBooking({ roomid: 1 }); // everything else missing

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.data)).toMatch(/blank|null/i);
    }
  );

  test(
    '[TC4] UI and API should agree that an empty booking is invalid',
    { tag: ['@tc4', '@validation', '@ui', '@api'] },
    async () => {
      // Direct comparison per the instructions: "Both should reject, but they might disagree."
      await bookingPage.submitBooking();
      const uiErrors = await bookingPage.getErrorMessages();

      const apiResponse = await ApiHelper.createBooking({ roomid: 1 });

      expect(!!uiErrors).toBe(true);
      expect(apiResponse.success).toBe(false);
    }
  );
});
