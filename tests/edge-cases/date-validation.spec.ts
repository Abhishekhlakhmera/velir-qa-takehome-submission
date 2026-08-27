import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { HotelBookingPage } from '../pages/HotelBookingPage';
import { ApiHelper } from '../utils/ApiHelper';
import { buildValidBookingPayload, getDateString } from '../utils/TestDataGenerator';

/**
 * Testing Instructions #1: Checkout date before or equal to checkin
 * Testing Instructions #2: Overlapping/double-booking the same room
 *
 * Run just this file:   npx playwright test tests/edge-cases/date-validation.spec.ts
 * Run just TC1:         npx playwright test --grep @tc1
 * Run just TC2:         npx playwright test --grep @tc2
 */

test.describe('[TC1] Checkout date before or equal to check-in', () => {
  test(
    '[TC1-UI] Homepage availability widget should reject checkout <= checkin',
    { tag: ['@tc1', '@dates', '@ui'] },
    async ({ page }) => {
      // KNOWN BUG: the react-datepicker widget does not disable/reject a checkout
      // date on or before the selected checkin date, and clicking "Check Availability"
      // shows no validation error - confirmed by direct inspection against the live site.
      test.fail(true, 'BUG: homepage date widget accepts checkout <= checkin with no error shown');

      const homePage = new HomePage(page);
      await homePage.goto();

      // Jump a full month ahead so the picked days are unambiguously in the future,
      // then pick checkout BEFORE checkin within that same visible month.
      await homePage.openCheckInCalendar();
      await homePage.goToNextMonthInOpenCalendar();
      await homePage.selectDayInOpenCalendar(25);
      await homePage.openCheckOutCalendar();
      await homePage.selectDayInOpenCalendar(20);

      const checkIn = await homePage.getCheckInValue();
      const checkOut = await homePage.getCheckOutValue();
      expect(checkIn).toBeTruthy();
      expect(checkOut).toBeTruthy();

      await homePage.clickCheckAvailability();

      // Expected: an inline validation error, OR the button should refuse to proceed.
      const errorLocator = page.locator('text=/invalid|error|checkout.*after|must be after/i');
      await expect(errorLocator.first()).toBeVisible({ timeout: 3000 });
    }
  );

  test(
    '[TC1-API] Create booking should reject checkout <= checkin',
    { tag: ['@tc1', '@dates', '@api'] },
    async () => {
      const payload = buildValidBookingPayload({
        bookingdates: { checkin: getDateString(30), checkout: getDateString(27) }, // checkout before checkin
      });

      const response = await ApiHelper.createBooking(payload);

      // Confirmed via direct probing: the API DOES reject this (409), unlike the UI.
      expect(response.success).toBe(false);
      expect([400, 409]).toContain(response.status);
    }
  );
});

test.describe('[TC2] Overlapping / double-booking the same room', () => {
  test(
    '[TC2-API] Second overlapping booking for the same room should be rejected',
    { tag: ['@tc2', '@dates', '@api'] },
    async () => {
      // Random base offset so repeated runs against this shared, stateful demo API
      // (no cleanup endpoint available to us) don't collide with a previous run's
      // leftover booking in the same room/date slot.
      const roomId = 1;
      const base = 200 + Math.floor(Math.random() * 1500);
      const firstBooking = buildValidBookingPayload({
        roomid: roomId,
        bookingdates: { checkin: getDateString(base), checkout: getDateString(base + 5) }, // e.g. 10th-15th
      });
      const first = await ApiHelper.createBooking(firstBooking);
      expect(first.success).toBe(true);

      const overlappingBooking = buildValidBookingPayload({
        roomid: roomId,
        bookingdates: { checkin: getDateString(base + 2), checkout: getDateString(base + 8) }, // e.g. 12th-18th, overlaps
      });
      const overlapping = await ApiHelper.createBooking(overlappingBooking);

      // Answers "can you book via API for overlapping dates?" - no, the API itself
      // enforces the conflict (confirmed: 409 Conflict), independent of the UI.
      expect(overlapping.success).toBe(false);
      expect(overlapping.status).toBe(409);
    }
  );

  test(
    '[TC2-UI] Booking the same room for overlapping dates should be blocked',
    { tag: ['@tc2', '@dates', '@ui'] },
    async ({ page }) => {
      // Asserting via [role="alert"]/banner text turned out to be unreliable here:
      // traced network traffic shows the underlying POST /api/booking genuinely gets
      // rejected (409), but the app doesn't render a graceful "unavailable" message
      // for it - see the follow-up test below. So the reliable signal for "was this
      // actually blocked" is the network response itself, not the DOM.
      const bookingPage = new HotelBookingPage(page);
      const roomId = 1;
      const base = 600 + Math.floor(Math.random() * 1000);
      const checkin = getDateString(base);
      const checkout = getDateString(base + 3);

      await bookingPage.navigateToRoomBooking(roomId, checkin, checkout);
      await bookingPage.clickReserveNow();
      await bookingPage.fillBookingForm('Alice', 'First', 'alice.first@example.com', '+1-555-1112223');
      const [firstResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/booking') && res.request().method() === 'POST'),
        bookingPage.submitBooking(),
      ]);
      expect(firstResponse.status()).toBe(201);

      // Second, overlapping attempt on the same room (shifted by a couple of days).
      await bookingPage.navigateToRoomBooking(roomId, getDateString(base + 1), getDateString(base + 4));
      await bookingPage.clickReserveNow();
      await bookingPage.fillBookingForm('Bob', 'Second', 'bob.second@example.com', '+1-555-4445556');
      const [secondResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/booking') && res.request().method() === 'POST'),
        bookingPage.submitBooking(),
      ]);

      expect(secondResponse.status()).toBe(409);
    }
  );

  test(
    '[TC2-UI] A rejected (409) overlapping booking should show a graceful message, not crash the page',
    { tag: ['@tc2', '@dates', '@ui'] },
    async ({ page }) => {
      // KNOWN BUG: confirmed by tracing network responses - when the backend
      // correctly rejects an overlapping booking with 409, the React app does not
      // catch it. Instead of a "room unavailable" message, the page renders the
      // generic browser/React error-boundary screen: "This page couldn't load -
      // Reload to try again, or go back."
      test.fail(true, 'BUG: a 409 from POST /api/booking crashes the UI to a generic error screen instead of a graceful message');

      const bookingPage = new HotelBookingPage(page);
      const roomId = 1;
      const base = 900 + Math.floor(Math.random() * 1000);

      await bookingPage.navigateToRoomBooking(roomId, getDateString(base), getDateString(base + 3));
      await bookingPage.clickReserveNow();
      await bookingPage.fillBookingForm('Alice', 'First', 'alice.first@example.com', '+1-555-1112223');
      await bookingPage.submitBooking();

      await bookingPage.navigateToRoomBooking(roomId, getDateString(base + 1), getDateString(base + 4));
      await bookingPage.clickReserveNow();
      await bookingPage.fillBookingForm('Bob', 'Second', 'bob.second@example.com', '+1-555-4445556');
      await bookingPage.submitBooking();
      await page.waitForTimeout(1000);

      await expect(page.locator("text=couldn't load")).not.toBeVisible();
      const errorMessages = await bookingPage.getErrorMessages();
      expect(errorMessages).toMatch(/unavailable|already booked|conflict/i);
    }
  );
});
