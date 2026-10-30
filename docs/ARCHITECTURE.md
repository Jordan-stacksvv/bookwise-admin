# Architecture

## Overview

A single-page React app talks directly to Convex. There is no separate server: all business rules live in Convex functions, so they are enforced no matter what the screens show.

```
Browser (React, TanStack Router)
   |  Clerk: sign-in, gives the browser a token
   |  Convex client: queries (live) and mutations
   v
Convex  (convex/*.ts: functions, database, file storage)
```

## Folders

| Path | Contents |
|---|---|
| `convex/` | Server: database schema, queries, mutations, HTTP endpoint |
| `convex/schema.ts` | All tables and indexes |
| `convex/secure.ts` | Wrapper around `query` and `mutation` so only approved people can run them |
| `convex/adminAuth.ts`, `access.ts` | Who is calling, are they an admin, are they approved |
| `convex/activity.ts` | The activity log writer and reader |
| `convex/imports.ts`, `http.ts` | Batch import |
| `src/routes/` | One file per page. `admin/` is the admin app, `_authenticated/` is the teacher app, `approve.$token` and `review.$token` are public |
| `src/components/admin/` | Teacher-side and shared components |
| `src/components/admin-app/` | Admin-side components |
| `src/components/ui/` | shadcn/ui building blocks |
| `src/lib/mock-store.ts` | `useStore()` and `useApi()`: the screens' single door to the data (the name is historical; it is the real Convex data) |
| `src/lib/csv.ts` | CSV writing, reading and download |
| `src/styles.css` | Design tokens (colours, radius, fonts) |
| `public/` | Icons, manifests and the service worker for the installable apps |
| `patches/` | Numbered patch scripts used to ship changes |

## Sign-in and roles

Clerk signs people in. The Clerk token reaches Convex, which works out who is calling on every request. Roles are never taken from the browser.

| State | How it is decided | What they can do |
|---|---|---|
| Signed out | No token | Only the public approval and review pages |
| Waiting | A `members` row with no approval | See the waiting screen only. Every data function refuses them |
| Teacher | `members.status = approved` | Teacher app: books, kids, loans, reviews |
| Denied | `members.status = denied` | See "No access" |
| Admin | In the `admins` table, or the Convex variable `ADMIN_USER_IDS`, or a verified email in `ADMIN_EMAILS` | Everything, plus the admin app |

Access is enforced on the server, not just hidden in the screens. `convex/secure.ts` exports guarded `query` and `mutation` that refuse anyone who is not approved; books, kids, teachers, loans lists and settings use them. The other modules (loans, reviews, members, admins, announcements, reading sets, policy, activity, imports) check access themselves with `requireApproved`, `requireAdmin` or `getAdmin`, and admin-only functions always call `requireAdmin`. Three functions are open on purpose because their callers are not signed in: the sign-in check, and the two public pages (`loans.byToken` with `loans.parentApprove`, and `reviews.publicByToken`), which only work with a long random token.

## The apps

The admin app is its own installable app (own manifest, icons and sidebar) at `/admin`. The teacher app is at `/dashboard`. Both are PWAs with a service worker for the app shell. Both run in the same code base and share components.

## Loan lifecycle

```
teacher assigns --> pending_parent --(parent approves link)--> pending_admin --(admin approves)--> approved --> returned
                         |                                          |
                         +--> cancelled (teacher)                   +--> rejected (admin)
                                                         approved/overdue --> lost (admin charges a fee)
```
- A loan stores its own approval token, the parent's name and time, the policy version they saw, and who gave final approval.
- Assigning is refused if the child is under 10 (`MIN_BORROW_AGE` in `convex/policy.ts`, age from date of birth), the book has no free copy, or the book is waiting for approval or declined.
- WhatsApp is the delivery step only. The teacher taps a button that opens `wa.me` with the message and link. The approval itself is saved by the public page, so nothing depends on a reply in WhatsApp.
- Fees: a lost or damaged loan records the kind, amount (the book's own price, otherwise the default damage fee), status owed, paid or waived, and a note.

## Review lifecycle

```
teacher adds (text + optional photo) --> pending --(admin approves)--> approved + public link
                                           |                                |
                                           +--> rejected (reason)           +--> taken down (link stops working)
```
Photos are shrunk in the browser and stored in Convex file storage. The public page shows the child's first name and last initial only; admins see full names.

## Book approval

A book added by an admin is live. A book added by a teacher is saved with `status = pending` and cannot be assigned. An admin approves it (single or many at once) or declines it with a reason. A teacher who edits a declined book sends it back to pending. Books with no status (older ones, admin-added) are live.

## Bulk approval

Loans, reviews, people and books each have an approve-many function that runs in one transaction, skips anything not in the right state, and logs each item. Approving many people only ever grants teacher access; admin rights are always granted one by one.

## Activity log

Every important action calls `logEvent` in `convex/activity.ts` after the change. The actor and role come from the sign-in token on the server. Parents, who are not signed in, are recorded by the name they typed. A logging failure never blocks the action. The Activity page reads the log (admins only), newest first, with filters and CSV export.

## Import

`convex/imports.ts` holds one function that validates and saves rows, used by the admin Import page (`imports.run`, admins only) and by the HTTP endpoint (`imports.runFromApi`, internal, reached only through `http.ts` after the API key check). See [IMPORT-API.md](IMPORT-API.md).

## Design

The look is set by tokens in `src/styles.css`: one navy primary colour, neutral greys, a white sidebar with hairline borders, 8px radius, no heavy shadows, and Inter for all text. Status colours are used only for meaning (green for available or active, red for overdue or destructive, amber for waiting). The logo is a plain mark in `src/components/Logo.tsx`. Avoid adding explanatory subtitles under page titles; the title and the controls should be enough.

## Shipping changes with patches

Each `patches/NN-name.cjs` edits files by exact anchors, supports `--dry`, writes nothing if any anchor is missing, and skips itself once applied. `patches/run-all.cjs` runs them in order. Helpers are in `patches/_lib.cjs` and `_files.cjs`.

| Patch | Adds |
|---|---|
| 01 to 04 | Book codes, under-10 rule, birthdays, installable app |
| 05 to 07 | Admin backend, loan approval, the admin app |
| 08 to 09 | Accounts and profile, sign-in and members |
| 10 | Book reviews |
| 11 | Approval for new sign-ins and server-side access control |
| 12 | Activity log and CSV exports |
| 13 | Profile menu in the sidebar, review upload on loans, reviews on books |
| 14 | Teachers with no class, admin Books/Kids/Teachers pages, teacher-added books need approval, approve many |
| 15 | Visual polish: flat neutral look, plain logo and icons, no helper text, phone layout fixes |
| 16 | Batch import and the HTTP endpoint |

## Known limits

- Type-check reports about 38 pre-existing errors (mostly `convex/vocab.ts`, which references tables that are not in the schema). The build is not affected.
- The activity log only records from the day it was deployed.
- The activity list reads at most 10,000 recent lines per request, which is far more than a church book club produces.
