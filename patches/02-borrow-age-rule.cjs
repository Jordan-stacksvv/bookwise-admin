"use strict";
/**
 * 02 - Kids under 10 cannot borrow
 * Enforced on the server (Convex `assignments.assign`) and in the UI
 * (book assign picker + kid page Assign button are disabled for under-10s).
 * Age is computed from the date of birth when there is one, so it stays correct.
 * Change the rule in ONE place: MIN_BORROW_AGE in convex/policy.ts.
 *
 * Run from project root:  node patches/02-borrow-age-rule.cjs
 * Then redeploy Convex:   npx convex deploy --typecheck=disable
 */
const { exists, load, replaceOnce, ensureAfter, create, run } = require("./_lib.cjs");
const { ensureFriendlyError } = require("./_shared.cjs");

run("02 under-10 borrowing rule", () => {
  if (exists("convex/policy.ts")) return "skip";

  // ---- convex/policy.ts (new, shared by server and client) --------------
  create(
    "convex/policy.ts",
    `// Lending rules shared by Convex functions AND the React app.
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
`
  );

  // ---- convex/assignments.ts -------------------------------------------
  const asg = load("convex/assignments.ts");
  replaceOnce(
    asg,
    `import { v } from "convex/values";`,
    `import { v, ConvexError } from "convex/values";
import { MIN_BORROW_AGE, ageOn } from "./policy";`,
    "imports"
  );
  replaceOnce(
    asg,
    `  handler: async (ctx, args) => {
    return ctx.db.insert("assignments", {`,
    `  handler: async (ctx, args) => {
    const kid = await ctx.db.get(args.kidId);
    if (!kid) throw new ConvexError("Kid not found.");
    if (ageOn(kid) < MIN_BORROW_AGE) {
      throw new ConvexError(\`\${kid.name} is under \${MIN_BORROW_AGE} and cannot borrow books yet.\`);
    }
    return ctx.db.insert("assignments", {`,
    "assign handler"
  );

  // ---- src/lib/mock-store.ts -------------------------------------------
  const store = load("src/lib/mock-store.ts");
  replaceOnce(
    store,
    `import type { Id } from "../../convex/_generated/dataModel";`,
    `import type { Id } from "../../convex/_generated/dataModel";
import { MIN_BORROW_AGE } from "../../convex/policy";

export { MIN_BORROW_AGE };`,
    "policy import"
  );
  replaceOnce(
    store,
    `  return Math.max(0, age);
}`,
    `  return Math.max(0, age);
}

/** Kids under MIN_BORROW_AGE (10) cannot borrow. */
export function canBorrow(kid: Pick<Kid, "age" | "birthdate">): boolean {
  return currentAge(kid) >= MIN_BORROW_AGE;
}`,
    "canBorrow helper"
  );

  ensureFriendlyError();

  // ---- src/routes/_authenticated/books.tsx ------------------------------
  const books = load("src/routes/_authenticated/books.tsx");
  replaceOnce(
    books,
    `import { useStore, useApi, availableCopies, isActive, type Book } from "@/lib/mock-store";`,
    `import { useStore, useApi, availableCopies, isActive, canBorrow, currentAge, MIN_BORROW_AGE, type Book } from "@/lib/mock-store";`,
    "store import"
  );
  ensureAfter(books, `import { Combobox } from "@/components/admin/Combobox";`, `import { friendlyError } from "@/lib/friendly-error";`);
  replaceOnce(
    books,
    `              onClick={() => {
                if (assignFor) {
                  api.assign(assignFor.id, assignKid, new Date(assignDue).toISOString(), assignTeacher !== "none" ? assignTeacher : undefined);
                  setAssignFor(null);
                  setAssignTeacher("none");
                }
              }}`,
    `              onClick={async () => {
                if (!assignFor) return;
                try {
                  await api.assign(assignFor.id, assignKid, new Date(assignDue).toISOString(), assignTeacher !== "none" ? assignTeacher : undefined);
                  setAssignFor(null);
                  setAssignTeacher("none");
                } catch (e) {
                  alert(friendlyError(e));
                }
              }}`,
    "assign click"
  );
  replaceOnce(
    books,
    `              type="button"
              onClick={() => { onChange(k.id); onQueryChange(""); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-muted/40"
            >`,
    `              type="button"
              disabled={!canBorrow(k)}
              onClick={() => { onChange(k.id); onQueryChange(""); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >`,
    "kid picker button"
  );
  replaceOnce(
    books,
    `<span className="text-xs text-muted-foreground">{k.department} · age {k.age}</span>`,
    `<span className="text-xs text-muted-foreground">
                  {k.department} · age {currentAge(k)}
                  {!canBorrow(k) && <span className="text-destructive"> · under {MIN_BORROW_AGE}, can't borrow</span>}
                </span>`,
    "kid picker age line"
  );

  // ---- src/routes/_authenticated/kids.tsx -------------------------------
  const kids = load("src/routes/_authenticated/kids.tsx");
  replaceOnce(
    kids,
    `import { useStore, useApi, isActive, isOverdue, currentAge, type Kid } from "@/lib/mock-store";`,
    `import { useStore, useApi, isActive, isOverdue, currentAge, canBorrow, MIN_BORROW_AGE, type Kid } from "@/lib/mock-store";`,
    "store import"
  );
  ensureAfter(kids, `import { Combobox } from "@/components/admin/Combobox";`, `import { friendlyError } from "@/lib/friendly-error";`);
  replaceOnce(
    kids,
    `<Button size="sm" variant="outline" onClick={() => { setAssignKidId(k.id); setAssignBook(""); setAssignDue(""); }}>`,
    `<Button
                        size="sm"
                        variant="outline"
                        disabled={!canBorrow(k)}
                        title={!canBorrow(k) ? \`Kids under \${MIN_BORROW_AGE} can't borrow books\` : undefined}
                        onClick={() => { setAssignKidId(k.id); setAssignBook(""); setAssignDue(""); }}
                      >`,
    "kid assign button"
  );
  replaceOnce(
    kids,
    `            <Button disabled={!assignBook || !assignDue} onClick={() => {
              if (assignKidId) {
                api.assign(assignBook, assignKidId, new Date(assignDue).toISOString());
                setAssignKidId(null);
              }
            }}>Assign</Button>`,
    `            <Button disabled={!assignBook || !assignDue} onClick={async () => {
              if (!assignKidId) return;
              try {
                await api.assign(assignBook, assignKidId, new Date(assignDue).toISOString());
                setAssignKidId(null);
              } catch (e) {
                alert(friendlyError(e));
              }
            }}>Assign</Button>`,
    "kid assign dialog"
  );
});
