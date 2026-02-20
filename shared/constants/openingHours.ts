/**
 * Default Opening Hours Configuration
 * 
 * This is the single source of truth for default opening hours across the application.
 * Used when:
 * - Database has no opening hours data yet
 * - Admin is setting up hours for the first time
 * - Frontend needs to display hours but backend returns empty array
 */

export interface OpeningHoursEntry {
  id: number;
  dayOfWeek: number;
  dayName: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

/**
 * Default opening hours: Monday-Sunday 9:00 AM - 5:00 PM
 * All days open by default (isClosed: false)
 * 
 * Modify these values to change the default hours shown to new users
 */
export const DEFAULT_OPENING_HOURS: OpeningHoursEntry[] = [
  { id: 0, dayOfWeek: 0, dayName: 'Sunday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { id: 0, dayOfWeek: 1, dayName: 'Monday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { id: 0, dayOfWeek: 2, dayName: 'Tuesday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { id: 0, dayOfWeek: 3, dayName: 'Wednesday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { id: 0, dayOfWeek: 4, dayName: 'Thursday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { id: 0, dayOfWeek: 5, dayName: 'Friday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { id: 0, dayOfWeek: 6, dayName: 'Saturday', openTime: '09:00', closeTime: '17:00', isClosed: false },
];

/**
 * Get default opening hours for a specific day
 * @param dayOfWeek - 0 (Sunday) to 6 (Saturday)
 */
export function getDefaultHoursForDay(dayOfWeek: number): OpeningHoursEntry | undefined {
  return DEFAULT_OPENING_HOURS.find(h => h.dayOfWeek === dayOfWeek);
}

/**
 * Get all default opening hours
 */
export function getAllDefaultHours(): OpeningHoursEntry[] {
  return [...DEFAULT_OPENING_HOURS];
}
