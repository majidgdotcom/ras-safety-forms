import { COMPANY_TIME_ZONE } from '@ras/shared';

/** "2026-10-02" -> "Fri, Oct 2, 2026" (a work day, no time zone shift) */
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/** "2026-10-02" -> "Oct 2" (chart labels) */
export function formatShortDay(date: string): string {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** ISO timestamp -> "7:42 a.m." in BC time */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: COMPANY_TIME_ZONE,
  }).format(new Date(iso));
}
