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
│   ├── pages/
│   │   └── HotelBookingPage.ts      # Page Object Model for booking page
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
