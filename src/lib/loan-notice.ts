import { useSyncExternalStore } from "react";

/** Created right after a teacher assigns a book, so we can prompt "send to parent on WhatsApp". */
export type LoanNotice = {
  token: string;
  kidName: string;
  parentName?: string;
  parentPhone?: string;
  bookTitle: string;
  dueDate: string;
};

let current: LoanNotice | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function announceLoan(n: LoanNotice) {
  current = n;
  emit();
}
export function clearLoanNotice() {
  current = null;
  emit();
}
export function useLoanNotice(): LoanNotice | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}
