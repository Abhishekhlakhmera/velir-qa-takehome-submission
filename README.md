# Velir QA Automation Take-Home Challenge

## Overview

This repository contains a **Playwright automation framework** written in **TypeScript**. It demonstrates QA automation best practices with UI and API tests for the [Automation Testing Online](https://automationintesting.online/) website.

## Project Structure

```
.
├── tests/
│   ├── api/
│   │   └── booking.spec.ts          # API tests for booking endpoints
│   ├── ui/
│   │   ├── positive.spec.ts         # Positive UI test (successful booking)
│   │   └── negative.spec.ts         # Negative UI test (validation failure)
│   ├── edge-cases/                  # Exploratory / negative test cases (TC1-TC4, TC8-TC10)
│   │   ├── date-validation.spec.ts      # TC1: checkout<=checkin, TC2: overlapping bookings
│   │   ├── input-validation.spec.ts     # TC3: invalid email/phone, TC4: required fields
│   │   ├── boundary-values.spec.ts      # TC8: negative/absurd values, TC9: non-existent IDs
│   │   └── concurrency.spec.ts          # TC10: race condition on simultaneous bookings
│   ├── security/                    # Security-focused test cases (TC5-TC7)
│   │   ├── xss.spec.ts                  # TC5: XSS/script injection
│   │   ├── admin-auth.spec.ts           # TC6: admin routes without auth
│   │   └── api-bypass.spec.ts           # TC7: direct API calls bypassing the UI
│   ├── pages/
│   │   ├── HotelBookingPage.ts      # Page Object Model for the reservation page
│   │   ├── HomePage.ts              # Page Object Model for the homepage widgets
│   │   └── AdminPage.ts             # Page Object Model for the /admin login page
│   └── utils/
│       ├── ApiHelper.ts             # API request utilities
│       └── TestDataGenerator.ts     # Test data generation utilities
├── playwright.config.ts              # Playwright configuration
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Project dependencies
└── README.md                         # This file
```

## Test Coverage

### UI Tests (2 tests)

1. **Positive Test** - `[POSITIVE] Should successfully book a room with valid details`
   - Fills out the booking form with valid data
   - Submits the booking
   - Verifies a success confirmation message is displayed

2. **Negative Test** - `[NEGATIVE] Should fail to book with missing required phone number`
   - Attempts to submit a booking without the required phone number
   - Verifies HTML5 form validation prevents submission

### API Tests (3 tests)

1. **Get All Bookings** - `[API] Should retrieve all bookings from the API`
   - Fetches all bookings from the API
   - Verifies response structure and data integrity

2. **Get Single Booking** - `[API] Should retrieve a specific booking by ID`
   - Retrieves a booking by its ID
   - Verifies booking details are accurate

3. **Create Booking** - `[API] Should create a new booking via API`
   - Creates a new booking through the API
   - Verifies the booking is created with correct details

### Exploratory / Edge-Case & Security Suite (10 test cases, tests/edge-cases + tests/security)

Each test case from the original testing instructions maps to its own describe
block and a `@tcN` tag, with `-UI`/`-API` suffixes marking which layer a given
test exercises. Every test title is also prefixed with its case number, so the
list reporter output doubles as a checklist.

| # | Test case | File | Tags |
|---|---|---|---|
| TC1 | Checkout date before/equal to check-in | `edge-cases/date-validation.spec.ts` | `@tc1` |
| TC2 | Overlapping / double-booking the same room | `edge-cases/date-validation.spec.ts` | `@tc2` |
| TC3 | Invalid email/phone formats | `edge-cases/input-validation.spec.ts` | `@tc3` |
| TC4 | Required fields skipped | `edge-cases/input-validation.spec.ts` | `@tc4` |
| TC5 | XSS / script injection | `security/xss.spec.ts` | `@tc5` |
| TC6 | Admin routes without auth | `security/admin-auth.spec.ts` | `@tc6` |
| TC7 | Direct API calls bypassing UI rules | `security/api-bypass.spec.ts` | `@tc7` |
| TC8 | Negative or absurd values | `edge-cases/boundary-values.spec.ts` | `@tc8` |
| TC9 | Non-existent booking/room ID | `edge-cases/boundary-values.spec.ts` | `@tc9` |
| TC10 | Concurrent bookings (race condition) | `edge-cases/concurrency.spec.ts` | `@tc10` |

**Run a single test case (any file):**
```bash
npx playwright test --grep @tc1
```

**Run everything UI-only or API-only across all cases:**
```bash
npx playwright test --grep @ui
npx playwright test --grep @api
```

**Run just the security-focused cases:**
```bash
npx playwright test tests/security
```

**Run against this live site with a sane amount of parallelism** (the suite books
real rooms on a shared, public demo instance - too many workers at once causes
navigation timeouts from resource contention, not a test bug):
```bash
npx playwright test --workers=4
```

#### Known bugs found while writing this suite

A handful of tests are annotated with `test.fail()` and a comment explaining the
defect - the suite stays green, but the annotation documents a real, confirmed
issue on the live site rather than hiding it. If one of these ever starts
*passing*, Playwright will flag it as an unexpected pass, which is the signal to
remove the annotation.

- **TC1** - the homepage's react-datepicker widget accepts a checkout date on or
  before the selected check-in date with no validation error (the API itself
  correctly rejects this with 409).
- **TC2** - when the backend correctly rejects an overlapping booking (409), the
  React app crashes to a generic "This page couldn't load" screen instead of
  showing a graceful message.
- **TC3** - `POST /api/booking/` validates phone number *length* (11-21 chars)
  but not its format, so an all-letters string of valid length is accepted.
- **TC8** - `POST /api/booking/` accepts a negative `totalprice` with no
  validation.
- **TC9** - `GET /api/room/{id}` returns `500 Internal Server Error` for a
  non-existent numeric room id instead of `404`; `POST /api/booking/` also
  accepts a booking against a `roomid` that doesn't exist.

A separate, pre-existing bug was fixed rather than just documented:
`HotelBookingPage.getErrorMessages()` used `locator.isVisible({ timeout })`,
which does **not** poll/retry despite accepting a timeout option, and its
fallback selector (`role=alert li`) wasn't valid Playwright syntax - together
they made this helper return `null` even when a validation error was clearly
displayed, so it was fixed to properly wait for the banner (`waitFor({ state:
'visible' })`) scoped past the app's Next.js route announcer, which also
carries `role="alert"` and was causing a strict-mode violation. `ApiHelper.
createBooking()` was also switched from raw `fetch()` to Playwright's
`APIRequestContext`, since `fetch()` POSTs against this host reproducibly threw
`UND_ERR_REQ_CONTENT_LENGTH_MISMATCH` in this environment.

## Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/Velir/Velir.QA.TakeHome.git
   cd Velir.QA.TakeHome
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright browsers** (done automatically during npm install):
   ```bash
   npx playwright install
   ```

## Running the Tests

### Run all tests
```bash
npm test
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (visible browser)
```bash
npm run test:headed
```

### Run tests in debug mode
```bash
npm run test:debug
```

### View HTML test report
```bash
npm run test:report
```

### Run specific test file
```bash
npx playwright test tests/ui/positive.spec.ts
```

### Run specific test by name
```bash
npx playwright test -g "Should successfully book"
```

## Test Results

After running tests, results are generated in:
- **HTML Report**: `playwright-report/index.html`
- **Test Results**: `test-results/` directory

View the HTML report with:
```bash
npm run test:report
```

## Configuration

### Browser Configuration

Tests run across three browsers by default (configured in `playwright.config.ts`):
- Chromium
- Firefox
- WebKit (Safari)

To run tests on a single browser:
```bash
npx playwright test --project=chromium
```

### Key Configuration Features

- **Base URL**: `https://automationintesting.online/`
- **Retries**: 2 retries in CI environment
- **Screenshots**: Captured on failure only
- **Videos**: Retained on failure only
- **Traces**: Captured on first retry for debugging

## Code Structure & Best Practices

### Page Object Model (POM)
- **HotelBookingPage.ts** - Encapsulates all page interactions and selectors
- Provides reusable methods for form filling and assertions
- Separates test logic from page element selectors

### API Helper
- **ApiHelper.ts** - Centralized API request methods
- Handles HTTP requests (GET, POST, DELETE)
- Consistent error handling and response parsing

### Test Data Generation
- **TestDataGenerator.ts** - Utilities for generating test data
- Ensures unique data per test run
- Date calculation helpers

## Extending the Framework

### Adding a New UI Test

1. Create a new `.spec.ts` file in `tests/ui/`
2. Import the `HotelBookingPage` and test utilities
3. Write your test following the AAA pattern (Arrange, Act, Assert)

Example:
```typescript
import { test, expect } from '@playwright/test';
import { HotelBookingPage } from '../pages/HotelBookingPage';

test.describe('My Test Suite', () => {
  test('My new test', async ({ page }) => {
    const bookingPage = new HotelBookingPage(page);
    // Your test here
  });
});
```

### Adding a New API Test

1. Add a new method to `ApiHelper.ts` if needed
2. Create a test in `tests/api/booking.spec.ts`
3. Use the `ApiHelper` methods to make requests

Example:
```typescript
const response = await ApiHelper.getBookingById(123);
expect(response.bookingid).toBe(123);
```

### Adding More Page Objects

1. Create a new class in `tests/pages/`
2. Define selectors as class properties
3. Create methods for page interactions
4. Import and use in your tests

## Troubleshooting

### Tests fail with "Cannot find module"
```bash
npm install
npx playwright install
```

### Browser won't launch
Make sure browsers are installed:
```bash
npx playwright install --with-deps
```

### Port already in use
If tests fail due to port conflicts, update the `playwright.config.ts` with a different port.

### API tests fail
Verify the API endpoint is accessible:
```bash
curl -X GET https://automationintesting.online/booking/
```

## CI/CD Integration

This framework is ready for CI/CD pipelines. In CI environments:
- Tests run with 2 retries
- Tests run sequentially (1 worker)
- HTML reports are generated for review

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright API Testing](https://playwright.dev/docs/api-testing)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Automation Testing Online](https://automationintesting.online/)

## Questions & Support

For questions about the framework or to expand the test suite, refer to the code comments and test examples included in the repository.

---

**Happy Testing! 🚀**
