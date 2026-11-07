/**
 * One shared day-first date formatter (owner rule: dd/mm/yy everywhere).
 *
 * The output never follows the device or browser locale: an Android phone set
 * to en-US still shows 07/11/26 for 7 November 2026, not 11/07/26. Dates are
 * shown in the country's own clock (Kenya pilot: Africa/Nairobi).
 */
export const defaultDisplayTimeZone = 'Africa/Nairobi';

export type DayFirstDateOptions = {
  /** IANA time zone for the calendar day; defaults to Africa/Nairobi. */
  timeZone?: string;
  /** dd/mm/yyyy instead of dd/mm/yy. */
  fullYear?: boolean;
};

function dayFirstParts(
  value: string | number | Date,
  options: DayFirstDateOptions & { withTime?: boolean },
): Record<string, string> | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const format: Intl.DateTimeFormatOptions = {
    timeZone: options.timeZone ?? defaultDisplayTimeZone,
    day: '2-digit',
    month: '2-digit',
    year: options.fullYear ? 'numeric' : '2-digit',
  };
  if (options.withTime) {
    format.hour = '2-digit';
    format.minute = '2-digit';
    format.hourCycle = 'h23';
  }
  const parts = new Intl.DateTimeFormat('en-GB', format).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/** dd/mm/yy (or dd/mm/yyyy); empty string for a missing or invalid date. */
export function formatDayFirstDate(
  value: string | number | Date | null | undefined,
  options: DayFirstDateOptions = {},
): string {
  if (value === null || value === undefined || value === '') return '';
  const parts = dayFirstParts(value, options);
  return parts ? `${parts.day}/${parts.month}/${parts.year}` : '';
}

/** dd/mm/yy HH:mm in 24-hour time; empty string for a missing or invalid date. */
export function formatDayFirstDateTime(
  value: string | number | Date | null | undefined,
  options: DayFirstDateOptions = {},
): string {
  if (value === null || value === undefined || value === '') return '';
  const parts = dayFirstParts(value, { ...options, withTime: true });
  if (!parts) return '';
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.day}/${parts.month}/${parts.year} ${hour}:${parts.minute}`;
}
