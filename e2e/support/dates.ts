// Independent time oracle for the tests. It deliberately uses plain
// Intl/Date (not Luxon, not the app's own helpers) so a bug shared by the
// app's client and server can't also fool the assertion.

const ZONE = 'Europe/Athens';

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hourCycle: 'h23', ...opts });

/** Athens calendar date ("YYYY-MM-DD") of an instant. */
export const athensDate = (d: Date = new Date()): string => {
  const parts = Object.fromEntries(
    fmt(d, { year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const athensHHMM = (d: Date): string =>
  fmt(d, { hour: '2-digit', minute: '2-digit' }).format(d);

export const addDays = (date: string, n: number): string => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** The UTC instant at which the Athens wall clock reads `date` `hhmm`
 * (unambiguous times only). Found by testing the two offsets Athens uses. */
export const athensWallClockToUtc = (date: string, hhmm: string): Date => {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  for (const offsetHours of [2, 3]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, h - offsetHours, min));
    if (athensDate(candidate) === date && athensHHMM(candidate) === hhmm) {
      return candidate;
    }
  }
  throw new Error(`No unambiguous instant for ${date} ${hhmm} in ${ZONE}`);
};

const lastSunday = (year: number, month1: number): string => {
  const lastDay = new Date(Date.UTC(year, month1, 0));
  lastDay.setUTCDate(lastDay.getUTCDate() - lastDay.getUTCDay());
  return lastDay.toISOString().slice(0, 10);
};

/** First date >= `after` produced by `candidates(year)` for this/next year. */
const firstAfter = (after: string, candidates: (y: number) => string) => {
  const y = Number(after.slice(0, 4));
  return [candidates(y), candidates(y + 1), candidates(y + 2)].find((d) => d > after)!;
};

/** Dates the suite exercises, all safely in the future (> today + 2 days) so
 * the "not in the past" rule never trips, and within the seeded 730-day window. */
export const testDates = (today = athensDate()) => {
  const after = addDays(today, 2);
  return {
    winter: firstAfter(after, (y) => `${y}-02-10`),
    summer: firstAfter(after, (y) => `${y}-07-10`),
    dstStart: firstAfter(after, (y) => lastSunday(y, 3)), // last Sunday of March
    dstEnd: firstAfter(after, (y) => lastSunday(y, 10)), // last Sunday of October
  };
};
