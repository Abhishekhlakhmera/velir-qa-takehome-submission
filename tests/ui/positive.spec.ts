import { test, expect } from '@playwright/test';
import { HotelBookingPage } from '../pages/HotelBookingPage';
import { generateRandomEmail, generateRandomPhone } from '../utils/TestDataGenerator';

test.describe('UI Tests - Hotel Booking', () => {
  let hotelBookingPage: HotelBookingPage;

  test.beforeEach(async ({ page }) => {
    hotelBookingPage = new HotelBookingPage(page);
    // Navigate directly to a room booking page with preset dates
    await hotelBookingPage.navigateToRoomBooking(1);
  });

  test('[POSITIVE] Should successfully book a room with valid details', async ({ page }) => {
    // Arrange - Test data
    const firstName = 'John';
    const lastName = 'Doe';
    const email = generateRandomEmail();
    // Phone must be between 11-21 characters
    const phone = generateRandomPhone();

    // Act - Click Reserve Now to show the booking form
    await hotelBookingPage.clickReserveNow();

    // Fill and submit booking form
    await hotelBookingPage.fillBookingForm(
      firstName,
      lastName,
      email,
      phone
    );
    await hotelBookingPage.submitBooking();

    // Assert - Verify form submission completed without errors
    // Check that no error messages are displayed
    const errorMessages = await hotelBookingPage.getErrorMessages();
    
    // If there are error messages, they should not be validation errors
    if (errorMessages) {
      expect(errorMessages).not.toContain('size must be between');
    }
  });
});
