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

// ---- Loan approval + damage fee defaults (batch 2) -----------------------------------------
export const DEFAULT_CURRENCY = "GHS";
/** Placeholder replacement cost. Admins change it under Admin > Settings. */
export const DEFAULT_DAMAGE_FEE = 50;
export const DEFAULT_POLICY_TEXT = [
  "Madina Central SDA Book Club - Borrowing Policy",
  "",
  "1. Books are lent to children aged 10 and above.",
  "2. Please return the book on or before the due date.",
  "3. Look after the book: keep it clean and dry, and do not write in it.",
  "4. If a book is lost or damaged, the parent or guardian pays its replacement cost.",
  "5. A loan only starts after the parent or guardian approves it and the book club admin gives final approval.",
].join("\n");

export type LoanStatus = "pending_parent" | "pending_admin" | "approved" | "rejected" | "cancelled" | "lost";
