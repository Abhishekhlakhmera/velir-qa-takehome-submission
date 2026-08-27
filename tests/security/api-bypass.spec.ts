import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/ApiHelper';
import { buildValidBookingPayload, getDateString } from '../utils/TestDataGenerator';

/**
 * Testing Instructions #7: Direct API calls bypassing UI rules
 *
 * Run just this file: npx playwright test tests/security/api-bypass.spec.ts
 * Run just TC7:        npx playwright test --grep @tc7
 *
 * These exercise /api/booking/ directly (no browser, no calendar widget, no form)
 * to check whether the server enforces its own rules independent of the UI.
 * TC1/TC2's [*-API] tests already cover the checkout<=checkin and overlapping-dates
 * cases from the API side - this file focuses on the remaining #7 sub-points:
 * data the UI wouldn't even let you enter, and auth enforcement on writes.
 */

test.describe('[TC7] Direct API calls bypassing UI rules', () => {
  test(
    '[TC7] Creating a booking with data the UI form would reject (malformed email) via raw API call',
    { tag: ['@tc7', '@security', '@api'] },
    async () => {
      // The UI form has no client-side email format check at all (see
      // tests/edge-cases/input-validation.spec.ts) - so this specifically bypasses
      // the *server* round-trip the UI relies on, by hitting the endpoint directly.
      const payload = buildValidBookingPayload({ email: 'not-an-email' });
      const response = await ApiHelper.createBooking(payload);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
    }
  );

  test(
    '[TC7] Creating an overlapping booking by calling the API directly, skipping the calendar widget entirely',
    { tag: ['@tc7', '@security', '@api'] },
    async () => {
      // Random base offset so repeated runs against this shared, stateful demo API
      // (no cleanup endpoint available to us) don't collide with a previous run's
      // leftover booking in the same room/date slot.
      const roomId = 2;
      const base = 1800 + Math.floor(Math.random() * 800);
      const dates = { checkin: getDateString(base), checkout: getDateString(base + 5) };

      const first = await ApiHelper.createBooking(
        buildValidBookingPayload({ roomid: roomId, bookingdates: dates, firstname: 'Direct' })
      );
      expect(first.success).toBe(true);

      // Same room, overlapping range, submitted with no calendar interaction at all.
      const overlap = await ApiHelper.createBooking(
        buildValidBookingPayload({
          roomid: roomId,
          bookingdates: { checkin: getDateString(base + 2), checkout: getDateString(base + 8) },
          firstname: 'Bypass',
        })
      );

      expect(overlap.success).toBe(false);
      expect(overlap.status).toBe(409);
    }
  );

  test(
    '[TC7] Creating a booking without any auth token/header - document current behavior',
    { tag: ['@tc7', '@security', '@api'] },
    async () => {
      // FINDING (not a confirmed "bug" in the classic sense, but worth flagging):
      // confirmed via direct probing that POST /api/booking/ requires NO
      // authentication at all - only the read endpoints (GET /api/booking/,
      // GET /api/booking/{id}) return 401/403 without a token. Any anonymous caller
      // can create bookings directly against this API. Whether that's intentional
      // (public "book as guest" flow) or an oversight is a product question, so this
      // is recorded as documented behavior rather than asserted as pass/fail.
      const payload = buildValidBookingPayload();
      const response = await ApiHelper.createBooking(payload);

      console.log(`POST /api/booking/ with no auth header -> status ${response.status}`);
      expect(response.status).toBeLessThan(500);
    }
  );

  test(
    '[TC7] Reading bookings without auth should be blocked (contrast with the unauthenticated write above)',
    { tag: ['@tc7', '@security', '@api'] },
    async () => {
      const response = await ApiHelper.testBookingApiAvailability();

      expect(response.requiresAuth).toBe(true);
      expect(response.status).toBe(401);
    }
  );
});
