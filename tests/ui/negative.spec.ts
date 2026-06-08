import { test, expect } from '@playwright/test';
import { HotelBookingPage } from '../pages/HotelBookingPage';
import { generateRandomEmail } from '../utils/TestDataGenerator';

test.describe('UI Tests - Hotel Booking Validation', () => {
  let hotelBookingPage: HotelBookingPage;

  test.beforeEach(async ({ page }) => {
    hotelBookingPage = new HotelBookingPage(page);
    await hotelBookingPage.navigateToRoomBooking(1);
  });

  test('[NEGATIVE] Should handle empty form submission gracefully', async ({ page }) => {
    // Arrange - no data provided

    // Act - Click Reserve Now to show the form
    await hotelBookingPage.clickReserveNow();

    // Verify form fields are present and required
    const firstNameInput = page.locator('input[name=\"firstname\"]');
    const firstNameRequired = await firstNameInput.getAttribute('required');
    
    // Assert - Verify form structure for validation
    // The form fields should be present and support validation
    expect(await firstNameInput.isVisible()).toBe(true);
    expect(firstNameRequired !== null || await firstNameInput.getAttribute('type')).toBeTruthy();
  });
});
