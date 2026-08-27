import { test, expect } from '@playwright/test';
import { HotelBookingPage } from '../pages/HotelBookingPage';
import { ApiHelper } from '../utils/ApiHelper';
import { buildValidBookingPayload, getDateString } from '../utils/TestDataGenerator';

/**
 * Testing Instructions #10: Concurrent bookings (race condition)
 *
 * Run just this file: npx playwright test tests/edge-cases/concurrency.spec.ts
 * Run just TC10:       npx playwright test --grep @tc10
 */

test.describe('[TC10] Concurrent bookings for the same room/dates', () => {
  test(
    '[TC10-API] Two simultaneous createBooking calls for the same room/dates - only one should succeed',
    { tag: ['@tc10', '@concurrency', '@api'] },
    async () => {
      // Random base offset so repeated runs against this shared, stateful demo API
      // (no cleanup endpoint available to us) don't land on a slot a previous run
      // already booked, which would make both calls fail (0 successes) instead of
      // exercising the actual race.
      const roomId = 1;
      const base = 400 + Math.floor(Math.random() * 1500);
      const dates = { checkin: getDateString(base), checkout: getDateString(base + 3) };

      const payloadA = buildValidBookingPayload({ roomid: roomId, bookingdates: dates, firstname: 'Race' });
      const payloadB = buildValidBookingPayload({ roomid: roomId, bookingdates: dates, firstname: 'Condition' });

      // Fire both requests without awaiting either first, so they land on the server
      // at effectively the same time.
      const [resultA, resultB] = await Promise.all([
        ApiHelper.createBooking(payloadA),
        ApiHelper.createBooking(payloadB),
      ]);

      const successes = [resultA, resultB].filter((r) => r.success);
      expect(successes.length).toBe(1);
    }
  );

  test(
    '[TC10-UI] Two browser sessions booking the same room/dates at the same time - only one should succeed',
    { tag: ['@tc10', '@concurrency', '@ui'] },
    async ({ browser }) => {
      // Same reasoning as [TC2-UI]: a rejected booking crashes to a generic error
      // screen rather than showing an alert, so the reliable signal for "did this
      // session's booking actually go through" is the POST /api/booking response
      // itself, not the DOM.
      const roomId = 1;
      const base = 1100 + Math.floor(Math.random() * 900);
      const checkIn = getDateString(base);
      const checkOut = getDateString(base + 3);

      const contextA = await browser.newContext();
      const contextB = await browser.newContext();
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      const bookingPageA = new HotelBookingPage(pageA);
      const bookingPageB = new HotelBookingPage(pageB);

      await bookingPageA.navigateToRoomBooking(roomId, checkIn, checkOut);
      await bookingPageB.navigateToRoomBooking(roomId, checkIn, checkOut);
      await bookingPageA.clickReserveNow();
      await bookingPageB.clickReserveNow();
      await bookingPageA.fillBookingForm('Race', 'WindowA', 'race.a@example.com', '+1-555-1112223');
      await bookingPageB.fillBookingForm('Race', 'WindowB', 'race.b@example.com', '+1-555-4445556');

      // Submit both as close together as possible and capture each session's own
      // booking-creation response.
      const [responseA, responseB] = await Promise.all([
        pageA
          .waitForResponse((res) => res.url().includes('/api/booking') && res.request().method() === 'POST')
          .catch(() => null),
        pageB
          .waitForResponse((res) => res.url().includes('/api/booking') && res.request().method() === 'POST')
          .catch(() => null),
        bookingPageA.submitBooking(),
        bookingPageB.submitBooking(),
      ]);

      const statuses = [responseA?.status(), responseB?.status()];
      const successCount = statuses.filter((s) => s === 201).length;
      expect(successCount).toBe(1);

      await contextA.close();
      await contextB.close();
    }
  );
});
