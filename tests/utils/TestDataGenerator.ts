export function generateRandomEmail(): string {
  return `user.${Date.now()}@example.com`;
}

/**
 * Generate a random phone number between 11-21 characters
 * Phone field validates: size must be between 11 and 21
 */
export function generateRandomPhone(): string {
  // Generate a realistic phone number: +1-555-123-4567890 (15 characters)
  return `+1-555-${String(Math.floor(Math.random() * 9000000) + 1000000)}`;
}

export function getDateString(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * automationintesting.online is a shared, stateful demo API with no reset/cleanup
 * endpoint available to us (DELETE requires auth we don't have). A fixed default
 * date range would mean every test that doesn't care about specific dates collides
 * with bookings left behind by earlier/parallel test runs - a same-room/same-range
 * 409 Conflict then masks whatever the test was actually trying to check. Spreading
 * defaults across a wide random window keeps unrelated tests independent.
 */
function randomFutureOffsetDays(): number {
  return 30 + Math.floor(Math.random() * 6000);
}

/**
 * A minimal but valid /api/booking/ payload. roomid is required by the API even
 * though it's undocumented in the README's API contract example - omitting it makes
 * every booking fail validation regardless of the other fields.
 * Pass `overrides` to mutate individual fields for negative/boundary testing, e.g.
 * buildValidBookingPayload({ totalprice: -500 }). Give an explicit `bookingdates`
 * override for any test that specifically cares about a date relationship (e.g.
 * overlap detection) rather than relying on the random default.
 */
export function buildValidBookingPayload(overrides: Record<string, any> = {}): any {
  const start = randomFutureOffsetDays();
  return {
    roomid: 1,
    firstname: 'John',
    lastname: 'Doe',
    email: generateRandomEmail(),
    phone: generateRandomPhone(),
    totalprice: 250,
    depositpaid: true,
    bookingdates: {
      checkin: getDateString(start),
      checkout: getDateString(start + 3),
    },
    additionalneeds: 'Wifi and breakfast',
    ...overrides,
  };
}

/** Emails that should never pass server-side "well-formed email" validation. */
export const INVALID_EMAILS = ['notanemail', 'test@', '@domain.com', 'missing-at-sign.com'];

/** Phone strings that violate the documented 11-21 character size constraint. */
export const INVALID_PHONES = ['abc', '123', ''];

/** A short (fits typical 3-18 char name fields) HTML/script payload for XSS probing. */
export const XSS_PAYLOADS = ['<b>XSS</b>', '<img src=x>', '"><svg/onload=1>'];

export function generateHugeString(length = 1000, char = 'A'): string {
  return char.repeat(length);
}
