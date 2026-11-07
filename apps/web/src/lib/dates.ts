import { formatDayFirstDate, formatDayFirstDateTime } from '@telpen/domain';

/**
 * Owner rule: user-facing dates are dd/mm/yy in Nairobi time (e.g. 07/12/26),
 * whatever the phone or browser locale. Thin wrappers over the one shared
 * formatter in @telpen/domain so web and API never drift.
 */
export function formatDmy(iso: string | null | undefined): string {
  return formatDayFirstDate(iso);
}

/** dd/mm/yy HH:mm (24-hour, Nairobi time). */
export function formatDmyTime(iso: string | null | undefined): string {
  return formatDayFirstDateTime(iso);
}
