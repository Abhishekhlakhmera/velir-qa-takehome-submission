import { request, APIRequestContext } from '@playwright/test';

/**
 * API Helper for booking/room operations against the Restful-Booker-Platform demo API.
 *
 * Note on transport: POST requests use Playwright's APIRequestContext rather than the
 * global fetch() used previously. Raw fetch() against this host was found to throw
 * `UND_ERR_REQ_CONTENT_LENGTH_MISMATCH` (Node/undici) whenever a JSON body was sent,
 * which made the original createBooking() fail on every call in this environment.
 * APIRequestContext does not hit that issue, so it's now used for every request.
 *
 * Note on auth: contrary to the class-level assumption this file used to document,
 * only the *read* endpoints (GET /api/booking/, GET /api/booking/{id}) require
 * authentication (401/403). POST /api/booking/ (createBooking) does NOT require auth -
 * confirmed by direct API probing. See tests/security/api-bypass.spec.ts.
 */
export class ApiHelper {
  static readonly BASE_URL = 'https://automationintesting.online';
  static readonly BOOKING_ENDPOINT = '/api/booking/';
  static readonly ROOM_ENDPOINT = '/api/room/';

  private static newContext(): Promise<APIRequestContext> {
    return request.newContext({ baseURL: this.BASE_URL });
  }

  private static async parseBody(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<any> {
    try {
      return await response.json();
    } catch {
      return await response.text().catch(() => null);
    }
  }

  /**
   * Test if the booking API endpoint exists and returns expected status
   */
  static async testBookingApiAvailability(): Promise<any> {
    const ctx = await this.newContext();
    try {
      const response = await ctx.get(this.BOOKING_ENDPOINT);
      return {
        status: response.status(),
        statusText: response.statusText(),
        available: response.status() !== 404,
        requiresAuth: response.status() === 401,
      };
    } catch (error: any) {
      return {
        error: error.message,
        available: false,
      };
    } finally {
      await ctx.dispose();
    }
  }

  /**
   * Create a booking via API. Does NOT require authentication (see class docblock).
   * bookingData is intentionally untyped so callers can send incomplete/malformed
   * payloads for negative testing.
   */
  static async createBooking(bookingData: any): Promise<any> {
    const ctx = await this.newContext();
    try {
      const response = await ctx.post(this.BOOKING_ENDPOINT, { data: bookingData });
      const data = await this.parseBody(response);

      return {
        status: response.status(),
        statusText: response.statusText(),
        data,
        success: response.status() === 200 || response.status() === 201,
      };
    } finally {
      await ctx.dispose();
    }
  }

  /**
   * Fetch a single booking by id. Requires authentication - expect 401/403 without it.
   */
  static async getBookingById(id: number | string): Promise<any> {
    const ctx = await this.newContext();
    try {
      const response = await ctx.get(`${this.BOOKING_ENDPOINT}${id}`);
      const data = await this.parseBody(response);
      return {
        status: response.status(),
        statusText: response.statusText(),
        data,
      };
    } finally {
      await ctx.dispose();
    }
  }

  /**
   * Fetch all rooms. Does not require authentication.
   */
  static async getAllRooms(): Promise<any> {
    const ctx = await this.newContext();
    try {
      const response = await ctx.get(this.ROOM_ENDPOINT);
      const data = await this.parseBody(response);
      return {
        status: response.status(),
        statusText: response.statusText(),
        data,
      };
    } finally {
      await ctx.dispose();
    }
  }

  /**
   * Fetch a single room by id.
   */
  static async getRoomById(id: number | string): Promise<any> {
    const ctx = await this.newContext();
    try {
      const response = await ctx.get(`${this.ROOM_ENDPOINT}${id}`);
      const data = await this.parseBody(response);
      return {
        status: response.status(),
        statusText: response.statusText(),
        data,
      };
    } finally {
      await ctx.dispose();
    }
  }

  /**
   * Get rooms information from the homepage
   * This is a practical alternative for testing when API requires auth
   */
  static async getRoomInfo(): Promise<any> {
    const ctx = await this.newContext();
    try {
      const response = await ctx.get('/');
      if (!response.ok()) {
        throw new Error(`Failed to fetch room data: ${response.statusText()}`);
      }
      const html = await response.text();
      return {
        status: response.status(),
        hasContent: html.length > 0,
      };
    } finally {
      await ctx.dispose();
    }
  }
}
