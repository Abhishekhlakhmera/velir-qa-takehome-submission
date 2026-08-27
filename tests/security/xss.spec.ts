import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { HotelBookingPage } from '../pages/HotelBookingPage';
import { ApiHelper } from '../utils/ApiHelper';
import { buildValidBookingPayload, generateRandomEmail } from '../utils/TestDataGenerator';

/**
 * Testing Instructions #5: XSS/Script injection
 *
 * Run just this file: npx playwright test tests/security/xss.spec.ts
 * Run just TC5:        npx playwright test --grep @tc5
 */

const SCRIPT_PAYLOAD = `<script>alert('XSS')</script>`;
const IMG_PAYLOAD = `<img src=x onerror=alert(1)>`;

test.describe('[TC5] XSS / script injection', () => {
  test(
    '[TC5-UI] Booking form firstname field should not execute injected script',
    { tag: ['@tc5', '@security', '@xss', '@ui'] },
    async ({ page }) => {
      let dialogFired = false;
      page.on('dialog', async (dialog) => {
        dialogFired = true;
        await dialog.dismiss();
      });

      const bookingPage = new HotelBookingPage(page);
      await bookingPage.navigateToRoomBooking(1);
      await bookingPage.clickReserveNow();
      await bookingPage.fillBookingForm(IMG_PAYLOAD, 'Doe', generateRandomEmail(), '+1-555-1234567');
      await bookingPage.submitBooking();
      await page.waitForTimeout(500); // give onerror a chance to fire if it were going to

      expect(dialogFired).toBe(false);

      // The payload should not appear as live markup anywhere on the page.
      const injectedImg = page.locator('img[src="x"]');
      expect(await injectedImg.count()).toBe(0);
    }
  );

  test(
    '[TC5-UI] Contact form should not execute injected script',
    { tag: ['@tc5', '@security', '@xss', '@ui'] },
    async ({ page }) => {
      let dialogFired = false;
      page.on('dialog', async (dialog) => {
        dialogFired = true;
        await dialog.dismiss();
      });

      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.fillContactForm(SCRIPT_PAYLOAD, generateRandomEmail(), '+1-555-1234567', 'XSS test', SCRIPT_PAYLOAD);
      await homePage.submitContactForm();
      await page.waitForTimeout(500);

      expect(dialogFired).toBe(false);
    }
  );

  test(
    '[TC5-API] Booking creation with an HTML/script payload in firstname - document current behavior',
    { tag: ['@tc5', '@security', '@xss', '@api'] },
    async () => {
      // The API is confirmed (via direct probing) to store a short raw-HTML firstname
      // ("<b>XSS</b>") unescaped rather than rejecting or sanitizing it. This is not
      // marked test.fail(): storing raw input and escaping at render time is a valid,
      // common design - the actual vulnerability only exists if a *view* (e.g. the
      // admin booking list) renders it unescaped, which requires authenticated admin
      // access to verify and is out of scope here. This test documents storage
      // behavior; render-time escaping should be checked manually/with credentials.
      const payload = buildValidBookingPayload({ firstname: '<b>XSS</b>' });
      const response = await ApiHelper.createBooking(payload);

      if (response.success) {
        console.log('API stored HTML payload as-is:', JSON.stringify(response.data));
      }
      expect(response.status).toBeLessThan(500);
    }
  );
});
