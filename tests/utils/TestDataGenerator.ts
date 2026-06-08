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
