"use strict";
/**
 * 16 - Batch import of books, kids and teachers
 * - Admin > Import: upload or paste a CSV, check it, import it.
 * - POST /import/books | /import/kids | /import/teachers for scripts (needs IMPORT_API_KEY).
 */
const { load, replaceOnce, exists, run } = require("./_lib.cjs");
const { createFrom, L } = require("./_files.cjs");

const DIR = "files16";

run("16 import", () => {
  if (exists("convex/imports.ts")) return "skip";

  createFrom(DIR, "convex/imports.ts");
  createFrom(DIR, "convex/http.ts");
  createFrom(DIR, "src/components/admin-app/ImportPanel.tsx");
  createFrom(DIR, "src/routes/admin/import.tsx");

  replaceOnce(load("convex/settings.ts"), "const DEFAULTS = {", "export const DEFAULTS = {", "export defaults");

  const api = load("convex/_generated/api.d.ts");
  replaceOnce(api, 'import type * as access from "../access.js";', L('import type * as access from "../access.js";', 'import type * as http from "../http.js";', 'import type * as imports from "../imports.js";'), "api imports");
  replaceOnce(api, "  access: typeof access;", L("  access: typeof access;", "  http: typeof http;", "  imports: typeof imports;"), "api modules");

  const csv = load("src/lib/csv.ts");
  csv.text =
    csv.text.replace(/\s*$/, "\n") +
    `
/** Reads CSV text into rows of cells. Handles quotes, CRLF, a BOM, and comma, semicolon or tab separators. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\\uFEFF/, "");
  const first = src.split(/\\r?\\n/, 1)[0] ?? "";
  const sep = [",", ";", "\\t"].map((c) => [c, first.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\\n" || ch === "\\r") {
      if (ch === "\\r" && src[i + 1] === "\\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}
`;

  const shell = load("src/components/admin-app/AdminShell.tsx");
  replaceOnce(shell, "BookOpen, GraduationCap, UsersRound }", "BookOpen, GraduationCap, UsersRound, Upload }", "shell icon");
  replaceOnce(
    shell,
    '  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },',
    L('  { to: "/admin/import", label: "Import", icon: Upload },', '  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },'),
    "shell nav",
  );
  // The server now refuses to give out a book with no free copy (before, only the button was disabled).
  replaceOnce(
    load("convex/assignments.ts"),
    '    if (book.status === "pending" || book.status === "rejected") throw new ConvexError("This book is waiting for the admin\'s approval, so it cannot be given out yet.");',
    L(
      '    if (book.status === "pending" || book.status === "rejected") throw new ConvexError("This book is waiting for the admin\'s approval, so it cannot be given out yet.");',
      '    const out = (await ctx.db.query("assignments").withIndex("by_book", (q) => q.eq("bookId", args.bookId)).collect()).filter((a) => !a.returnedAt).length;',
      '    if (out >= book.copies) throw new ConvexError("No copy of this book is free right now.");',
    ),
    "assign free copy check",
  );
});
