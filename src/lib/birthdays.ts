import type { Kid } from "@/lib/mock-store";

export type MonthBirthday = { kid: Kid; day: number; turning: number };

/** Parses "YYYY-MM-DD" as a plain calendar date (no timezone shifting). */
export function parseBirthdate(s?: string): { y: number; m: number; d: number } | null {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  return { y, m, d };
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Day of month the birthday is celebrated in `year` (Feb 29 -> Feb 28 in non-leap years). */
function dayIn(year: number, dob: { m: number; d: number }): number {
  return dob.m === 1 && dob.d === 29 && !isLeap(year) ? 28 : dob.d;
}

/** Kids with a birthday in the given month (month is 0-11), sorted by day. */
export function birthdaysInMonth(kids: Kid[], year: number, month: number): MonthBirthday[] {
  const out: MonthBirthday[] = [];
  for (const kid of kids) {
    const dob = parseBirthdate(kid.birthdate);
    if (!dob || dob.m !== month) continue;
    out.push({ kid, day: dayIn(year, dob), turning: year - dob.y });
  }
  return out.sort((a, b) => a.day - b.day || a.kid.name.localeCompare(b.kid.name));
}
