import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/ApiHelper';
import { buildValidBookingPayload, generateHugeString, getDateString } from '../utils/TestDataGenerator';

/**
 * Testing Instructions #8: Negative or absurd values
 * Testing Instructions #9: Non-existent booking/room ID
 *
 * Run just this file:   npx playwright test tests/edge-cases/boundary-values.spec.ts
 * Run just TC8:         npx playwright test --grep @tc8
 * Run just TC9:         npx playwright test --grep @tc9
 */

test.describe('[TC8] Negative or absurd values', () => {
  test(
    '[TC8-API] Negative totalprice should be rejected',
    { tag: ['@tc8', '@boundary', '@api'] },
    async () => {
      // KNOWN BUG: confirmed via direct probing (with a date range guaranteed not to
      // collide with any other booking) that totalprice: -500 is happily accepted
      // and a booking is created (201) - there is no lower-bound validation at all.
      test.fail(true, 'BUG: /api/booking/ accepts a negative totalprice with no validation');

      const payload = buildValidBookingPayload({ totalprice: -500 });
      const response = await ApiHelper.createBooking(payload);

      expect(response.success).toBe(false);
    }
  );

  test(
    '[TC8-API] Zero totalprice - document current behavior',
    { tag: ['@tc8', '@boundary', '@api'] },
    async () => {
      // Not marked as a confirmed bug: whether a free stay (totalprice: 0) should be
      // allowed is a business-rule question, not a clear-cut validation defect. This
      // test documents what the API currently does so the behavior is visible and
      // intentional, rather than silently assumed.
      const payload = buildValidBookingPayload({ totalprice: 0 });
      const response = await ApiHelper.createBooking(payload);

      // Confirmed via direct probing: currently accepted (201).
      expect(response.status).toBe(201);
    }
  );

  test(
    '[TC8-API] Huge firstname (1000 chars) should be rejected',
    { tag: ['@tc8', '@boundary', '@api'] },
    async () => {
      const payload = buildValidBookingPayload({ firstname: generateHugeString(1000) });
      const response = await ApiHelper.createBooking(payload);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.data)).toMatch(/size must be between/i);
    }
  );

  test(
    '[TC8-API] Absurd date range (10-year stay) - document current behavior',
    { tag: ['@tc8', '@boundary', '@api'] },
    async () => {
      const payload = buildValidBookingPayload({
        bookingdates: { checkin: getDateString(30), checkout: getDateString(30 + 365 * 10) },
      });
      const response = await ApiHelper.createBooking(payload);

      // Recorded, not asserted as pass/fail either way - see comment above on totalprice: 0.
      console.log(`10-year booking attempt -> status ${response.status}`);
      expect([200, 201, 400, 409]).toContain(response.status);
    }
  );
});

test.describe('[TC9] Non-existent booking/room ID', () => {
  test(
    '[TC9-API] GET a non-existent booking id should not 5xx',
    { tag: ['@tc9', '@boundary', '@api'] },
    async () => {
      const response = await ApiHelper.getBookingById(999999);

      // Booking reads require auth, so 401/403 (auth challenge) is acceptable here -
      // the point of this test is that it must NOT be a 5xx server crash.
      expect(response.status).toBeLessThan(500);
    }
  );

  test(
    '[TC9-API] GET a non-existent numeric room id should return 404, not crash',
    { tag: ['@tc9', '@boundary', '@api'] },
    async () => {
      // KNOWN BUG: confirmed via direct probing - GET /api/room/999999 currently
      // returns 500 Internal Server Error instead of 404 Not Found.
      test.fail(true, 'BUG: GET /api/room/{nonexistent-id} returns 500 instead of 404');

      const response = await ApiHelper.getRoomById(999999);
      expect(response.status).toBe(404);
    }
  );

  test(
    '[TC9-API] GET a non-numeric room id ("abc") should return 404',
    { tag: ['@tc9', '@boundary', '@api'] },
    async () => {
      const response = await ApiHelper.getRoomById('abc');
      expect(response.status).toBe(404);
    }
  );

  test(
    '[TC9-API] Creating a booking against a non-existent roomid should be rejected',
    { tag: ['@tc9', '@boundary', '@api'] },
    async () => {
      // KNOWN BUG: confirmed via direct probing - POST /api/booking/ with
      // roomid: 999999 (a room that does not exist) still returns 201 Created.
      test.fail(true, 'BUG: /api/booking/ creates a booking against a non-existent roomid');

      const payload = buildValidBookingPayload({ roomid: 999999 });
      const response = await ApiHelper.createBooking(payload);

      expect(response.success).toBe(false);
    }
  );
});
