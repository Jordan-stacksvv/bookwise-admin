# Convex backend — Madina Central SDA Book Club

Ready-to-connect schema + queries/mutations. The UI currently uses the
in-memory store at `src/lib/mock-store.ts`; the function signatures here mirror it.

## Activate

1. `npm i convex`
2. `npx convex dev`
3. Wrap the app root with `ConvexProvider` and swap the mock `api` calls
   in `src/lib/mock-store.ts` for `useQuery` / `useMutation` from `convex/react`.

## Modules

| Module | Purpose |
| --- | --- |
| `schema.ts` | Tables: books, bookIssues, kids, teachers, assignments, categories, departments, ageRanges |
| `books.ts` | list / get / add / edit / remove + listIssues / addIssue / removeIssue + availableCopies |
| `kids.ts` | list / add / edit / remove (cascades to assignments) |
| `teachers.ts` | list / add / edit / remove |
| `assignments.ts` | list / listActive / create (capacity-checked) / markReturned / remove |
| `vocab.ts` | Categories, departments, age-range CRUD with in-use protection |
