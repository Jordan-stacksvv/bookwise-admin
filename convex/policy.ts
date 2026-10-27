// Lending rules shared by Convex functions AND the React app.
// Keep this file free of server-only imports so the client can import it too.

/** Kids younger than this cannot borrow books. */
export const MIN_BORROW_AGE = 10;

/** Age today, from the date of birth when available (falls back to the stored age). */
export function ageOn(kid: { age: number; birthdate?: string }, now: Date = new Date()): number {
  if (!kid.birthdate) return kid.age;
  const b = new Date(kid.birthdate);
  if (isNaN(+b)) return kid.age;
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return Math.max(0, age);
}
