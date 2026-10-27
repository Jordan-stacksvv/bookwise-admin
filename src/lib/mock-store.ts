/**
 * Convex-backed data layer.
 * Exports the same types and hook shape as before so existing pages work unchanged.
 * Auth is now handled entirely by Clerk — no login/logout/signup here.
 */
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MIN_BORROW_AGE, type LoanStatus } from "../../convex/policy";
import { announceLoan } from "./loan-notice";

export { MIN_BORROW_AGE };

// ─── Re-exported types (same shape as before) ────────────────────────────────

export type BookIssue = {
  _id: Id<"bookIssues">;
  id: string;
  note: string;
  reportedAt: string;
  bookId: Id<"books">;
};

export type Book = {
  _id: Id<"books">;
  id: string;
  code?: string;
  title: string;
  author: string;
  category: string;
  ageRange: string;
  department: string;
  coverUrl?: string;
  copies: number;
  price?: number;
  issues: BookIssue[];
};

export type Kid = {
  _id: Id<"kids">;
  id: string;
  name: string;
  age: number;
  department: string;
  birthdate?: string;
  parentName?: string;
  parentPhone?: string;
};

export type Teacher = {
  _id: Id<"teachers">;
  id: string;
  name: string;
  department: string;
  className?: string;
  phone?: string;
  email?: string;
};

export type Assignment = {
  _id: Id<"assignments">;
  id: string;
  bookId: string;
  kidId: string;
  teacherId?: string;
  assignedAt: string;
  dueDate: string;
  returnedAt?: string;
  currentPage?: number;
  completed?: boolean;
  /** undefined = loan made before approvals existed (treated as approved) */
  status?: LoanStatus;
  approvalToken?: string;
  parentApprovedAt?: string;
  parentApprovedName?: string;
  policyVersion?: number;
  adminApprovedAt?: string;
  adminApprovedBy?: string;
  rejectedReason?: string;
  feeKind?: "lost" | "damaged";
  feeAmount?: number;
  feeStatus?: "owed" | "paid" | "waived";
  feeNote?: string;
  feeAt?: string;
};

export type BookReview = {
  _id: Id<"bookReviews">;
  id: string;
  assignmentId: string;
  kidId: string;
  bookId: string;
  chapterRange?: string;
  summary: string;
  createdAt: string;
  sentToParentAt?: string;
};

type StoreState = {
  books: Book[];
  kids: Kid[];
  teachers: Teacher[];
  assignments: Assignment[];
  reviews: BookReview[];
  categories: string[];
  departments: string[];
  ageRanges: string[];
};

// ─── useStore() hook — returns the same shape as before ──────────────────────

export function useStore(): StoreState {
  const rawBooks = useQuery(api.books.list) ?? [];
  const rawKids = useQuery(api.kids.list) ?? [];
  const rawTeachers = useQuery(api.teachers.list) ?? [];
  const rawAssignments = useQuery(api.assignments.list) ?? [];
  const rawReviews = useQuery(api.reviews.list) ?? [];
  const categories = useQuery(api.settings.get, { key: "categories" }) ?? [];
  const departments = useQuery(api.settings.get, { key: "departments" }) ?? [];
  const ageRanges = useQuery(api.settings.get, { key: "ageRanges" }) ?? [];

  // Normalise: add string `id` field = `_id` so existing JSX (b.id, k.id…) works
  const books: Book[] = rawBooks.map((b: any) => ({ ...b, id: b._id, issues: (b.issues ?? []).map((i: any) => ({ ...i, id: i._id })) }));
  const kids: Kid[] = rawKids.map((k: any) => ({ ...k, id: k._id }));
  const teachers: Teacher[] = rawTeachers.map((t: any) => ({ ...t, id: t._id }));
  const assignments: Assignment[] = rawAssignments.map((a: any) => ({
    ...a,
    id: a._id,
    bookId: a.bookId,
    kidId: a.kidId,
    teacherId: a.teacherId,
  }));

  const reviews: BookReview[] = rawReviews.map((r: any) => ({ ...r, id: r._id }));

  return { books, kids, teachers, assignments, reviews, categories, departments, ageRanges };
}

// ─── Mutations shim — same api.* surface ─────────────────────────────────────
// Components call these exactly as before: api.addBook(...), api.assign(...)

function useConvexMutations() {
  return {
    addBook: useMutation(api.books.add),
    editBook: useMutation(api.books.edit),
    deleteBook: useMutation(api.books.remove),
    addBookIssue: useMutation(api.books.addIssue),
    removeBookIssue: useMutation(api.books.removeIssue),
    addKid: useMutation(api.kids.add),
    editKid: useMutation(api.kids.edit),
    deleteKid: useMutation(api.kids.remove),
    addTeacher: useMutation(api.teachers.add),
    editTeacher: useMutation(api.teachers.edit),
    deleteTeacher: useMutation(api.teachers.remove),
    assign: useMutation(api.assignments.assign),
    returnBook: useMutation(api.assignments.returnBook),
    updateAssignment: useMutation(api.assignments.update),
    addCategory: useMutation(api.settings.add),
    deleteCategory: useMutation(api.settings.remove),
    addDepartment: useMutation(api.settings.add),
    deleteDepartment: useMutation(api.settings.remove),
    addAgeRange: useMutation(api.settings.add),
    deleteAgeRange: useMutation(api.settings.remove),
    addReview: useMutation(api.reviews.add),
    markReviewSent: useMutation(api.reviews.markSent),
    deleteReview: useMutation(api.reviews.remove),
  };
}

/**
 * useApi() — drop-in replacement for the old `api` singleton.
 * Must be called inside a React component (it's hooks under the hood).
 *
 * Usage in any page:
 *   const mutations = useApi();
 *   mutations.addBook({ title: "...", ... });
 */
export function useApi() {
  const m = useConvexMutations();

  return {
    addBook: (b: Omit<Book, "_id" | "id" | "issues"> & { issues?: BookIssue[] }) =>
      m.addBook({ ...b, copies: b.copies ?? 1 }),

    editBook: (id: string, updates: Partial<Omit<Book, "_id" | "id" | "issues">>) =>
      m.editBook({ id: id as Id<"books">, ...updates }),

    deleteBook: (id: string) => m.deleteBook({ id: id as Id<"books"> }),

    addBookIssue: (bookId: string, note: string) =>
      m.addBookIssue({ bookId: bookId as Id<"books">, note }),

    removeBookIssue: (_bookId: string, issueId: string) =>
      m.removeBookIssue({ issueId: issueId as Id<"bookIssues"> }),

    addKid: (k: Omit<Kid, "_id" | "id">) => m.addKid(k),

    editKid: (id: string, updates: Partial<Omit<Kid, "_id" | "id">>) =>
      m.editKid({ id: id as Id<"kids">, ...updates }),

    deleteKid: (id: string) => m.deleteKid({ id: id as Id<"kids"> }),

    addTeacher: (t: Omit<Teacher, "_id" | "id">) => m.addTeacher(t),

    editTeacher: (id: string, updates: Partial<Omit<Teacher, "_id" | "id">>) =>
      m.editTeacher({ id: id as Id<"teachers">, ...updates }),

    deleteTeacher: (id: string) => m.deleteTeacher({ id: id as Id<"teachers"> }),

    addCategory: (name: string) => m.addCategory({ key: "categories", value: name }),
    deleteCategory: (name: string) => m.deleteCategory({ key: "categories", value: name }),
    addDepartment: (name: string) => m.addDepartment({ key: "departments", value: name }),
    deleteDepartment: (name: string) => m.deleteDepartment({ key: "departments", value: name }),
    addAgeRange: (name: string) => m.addAgeRange({ key: "ageRanges", value: name }),
    deleteAgeRange: (name: string) => m.deleteAgeRange({ key: "ageRanges", value: name }),

    assign: async (bookId: string, kidId: string, dueDate: string, teacherId?: string) => {
      const r = await m.assign({
        bookId: bookId as Id<"books">,
        kidId: kidId as Id<"kids">,
        teacherId: teacherId as Id<"teachers"> | undefined,
        dueDate,
      });
      // Opens the "send to parent on WhatsApp" dialog (mounted in the teacher layout).
      announceLoan({
        token: r.token,
        kidName: r.kidName,
        parentName: r.parentName,
        parentPhone: r.parentPhone,
        bookTitle: r.bookTitle,
        dueDate: r.dueDate,
      });
      return r;
    },

    returnBook: (assignmentId: string) =>
      m.returnBook({ id: assignmentId as Id<"assignments"> }),

    updateAssignment: (id: string, updates: Partial<Pick<Assignment, "currentPage" | "completed" | "returnedAt">>) =>
      m.updateAssignment({ id: id as Id<"assignments">, ...updates }),

    addReview: (r: { assignmentId: string; kidId: string; bookId: string; chapterRange?: string; summary: string }) =>
      m.addReview({
        assignmentId: r.assignmentId as Id<"assignments">,
        kidId: r.kidId as Id<"kids">,
        bookId: r.bookId as Id<"books">,
        chapterRange: r.chapterRange,
        summary: r.summary,
      }),

    markReviewSent: (id: string) => m.markReviewSent({ id: id as Id<"bookReviews"> }),

    deleteReview: (id: string) => m.deleteReview({ id: id as Id<"bookReviews"> }),
  };
}

// ─── Utility helpers (unchanged) ─────────────────────────────────────────────

/** Loans made before the approval flow existed have no status: treat them as approved. */
export function loanStatus(a: Pick<Assignment, "status">): LoanStatus {
  return a.status ?? "approved";
}

// A loan only counts as overdue once it has been handed over (approved).
export function isOverdue(a: Assignment) {
  return !a.returnedAt && loanStatus(a) === "approved" && new Date(a.dueDate) < new Date();
}
export function isActive(a: Assignment) {
  return !a.returnedAt;
}

export function availableCopies(book: Book, assignments: Assignment[]) {
  const out = assignments.filter((a) => a.bookId === book.id && isActive(a)).length;
  return Math.max(0, book.copies - out);
}

export function currentAge(kid: Pick<Kid, "age" | "birthdate">): number {
  if (!kid.birthdate) return kid.age;
  const b = new Date(kid.birthdate);
  if (isNaN(+b)) return kid.age;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return Math.max(0, age);
}

/** Kids under MIN_BORROW_AGE (10) cannot borrow. */
export function canBorrow(kid: Pick<Kid, "age" | "birthdate">): boolean {
  return currentAge(kid) >= MIN_BORROW_AGE;
}



