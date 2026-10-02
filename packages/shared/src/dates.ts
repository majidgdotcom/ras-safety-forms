/**
 * Date helpers. A safety form is for a WORK DAY (YYYY-MM-DD), not a timestamp,
 * so "today" must be computed in the company time zone (BC, Canada), not UTC.
 */
export const COMPANY_TIME_ZONE = 'America/Vancouver';

/** YYYY-MM-DD for the given instant in the company time zone. */
export function localDate(at: Date = new Date(), timeZone = COMPANY_TIME_ZONE): string {
  // en-CA formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Add (or subtract) whole days to a YYYY-MM-DD string. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`); // noon UTC avoids DST edge cases
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** All dates from `from` to `to` inclusive. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
