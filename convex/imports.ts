import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { logEvent } from "./activity";
import { requireAdmin } from "./adminAuth";
import { DEFAULTS } from "./settings";

/**
 * Batch import of books, kids and teachers.
 *
 * One function does the work for both entry points (the admin Import page and the HTTP endpoint in http.ts), so
 * the rules are the same everywhere. Rows are checked one by one: bad rows are reported and left out, good rows are
 * saved, and rows that already exist are skipped. Nothing is half-saved: the whole call is one transaction.
 */

export const MAX_ROWS = 500;
export type Kind = "books" | "kids" | "teachers";
type Raw = Record<string, unknown>;
export type ImportResult = {
  kind: Kind;
  dryRun: boolean;
  total: number;
  created: number;
  skipped: { row: number; reason: string }[];
  errors: { row: number; message: string }[];
};

// ---------------------------------------------------------------- column names (any of these work, any case, spaces optional)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES: Record<Kind, Record<string, string[]>> = {
  books: {
    title: ["title", "bookname", "booktitle", "name"],
    author: ["author", "writer", "by"],
    category: ["category", "genre", "type"],
    ageRange: ["agerange", "age", "ages", "agegroup"],
    department: ["department", "dept", "class", "classes", "group"],
    copies: ["copies", "copy", "qty", "quantity", "count", "number"],
    code: ["code", "bookcode", "bookid", "id", "isbn", "accession"],
    price: ["price", "cost", "value", "replacementcost"],
  },
  kids: {
    name: ["name", "fullname", "child", "childname", "kid"],
    age: ["age"],
    birthdate: ["birthdate", "dateofbirth", "dob", "birthday", "born"],
    department: ["department", "dept", "class", "group"],
    parentName: ["parentname", "parent", "guardian", "guardianname"],
    parentPhone: ["parentphone", "phone", "parentcontact", "contact", "guardianphone", "whatsapp"],
  },
  teachers: {
    name: ["name", "fullname", "teacher", "teachername"],
    department: ["department", "dept", "group"],
    className: ["classname", "class", "classroom"],
    phone: ["phone", "mobile", "contact", "whatsapp"],
    email: ["email", "emailaddress", "mail"],
  },
};

function pick(kind: Kind, raw: Raw): Record<string, string> {
  const wanted = new Map<string, string>();
  for (const [field, names] of Object.entries(ALIASES[kind])) for (const n of names) if (!wanted.has(n)) wanted.set(n, field);
  const out: Record<string, string> = {};
  // exact field names win over looser aliases, whatever the column order
  const entries = Object.entries(raw).sort(([a], [b]) => Number(wanted.get(norm(b)) === b) - Number(wanted.get(norm(a)) === a));
  for (const [key, val] of entries) {
    const field = wanted.get(norm(key));
    if (!field || out[field] !== undefined) continue;
    if (val === null || val === undefined || typeof val === "object") continue;
    out[field] = String(val).trim();
  }
  return out;
}

const cut = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// ---------------------------------------------------------------- cell checks
function whole(s: string | undefined, min: number, max: number, label: string): number | string {
  if (s === undefined || s === "") return `${label} is missing.`;
  const n = Number(s);
  if (!Number.isInteger(n) || n < min || n > max) return `${label} must be a whole number from ${min} to ${max}.`;
  return n;
}

/** 2015-03-08, 08/03/2015 or 8-3-2015 (day first, as used in Ghana). Returns YYYY-MM-DD or an error. */
function parseDate(s: string): { iso: string } | { error: string } {
  let y: number, m: number, d: number;
  let hit = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (hit) [y, m, d] = [+hit[1], +hit[2], +hit[3]];
  else if ((hit = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) [d, m, y] = [+hit[1], +hit[2], +hit[3]];
  else return { error: `Date of birth "${s.slice(0, 20)}" is not a date. Use DD/MM/YYYY or YYYY-MM-DD.` };
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return { error: `Date of birth "${s.slice(0, 20)}" is not a real date.` };
  if (dt.getTime() > Date.now()) return { error: "Date of birth is in the future." };
  return { iso: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

const ageOn = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const now = new Date();
  let a = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) a--;
  return a;
};

// ---------------------------------------------------------------- settings lists (new classes/categories show up in the filters)
async function registerValues(ctx: MutationCtx, key: "categories" | "departments" | "ageRanges", values: Iterable<string>) {
  const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).first();
  const current = row?.values ?? DEFAULTS[key];
  const have = new Set(current.map((x: string) => x.toLowerCase()));
  const add: string[] = [];
  for (const val of values) if (val && !have.has(val.toLowerCase())) { have.add(val.toLowerCase()); add.push(val); }
  if (!add.length) return;
  if (row) await ctx.db.patch(row._id, { values: [...current, ...add] });
  else await ctx.db.insert("settings", { key, values: [...current, ...add] });
}

// ---------------------------------------------------------------- the import
export async function runImport(ctx: MutationCtx, kind: Kind, rows: unknown[], dryRun: boolean, actor?: { role: "system"; name: string }): Promise<ImportResult> {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("There are no rows to import.");
  if (rows.length > MAX_ROWS) throw new Error(`Send at most ${MAX_ROWS} rows at a time.`);
  const res: ImportResult = { kind, dryRun, total: rows.length, created: 0, skipped: [], errors: [] };
  const err = (row: number, message: string) => res.errors.push({ row, message });
  const skip = (row: number, reason: string) => res.skipped.push({ row, reason });
  const seen = new Set<string>();
  const newLists = { categories: new Set<string>(), departments: new Set<string>(), ageRanges: new Set<string>() };

  if (kind === "books") {
    const existing = await ctx.db.query("books").collect();
    const codes = new Map(existing.filter((b) => b.code).map((b) => [b.code!.toLowerCase(), b.title]));
    const titles = new Set(existing.map((b) => `${b.title}|${b.author}`.toLowerCase()));
    for (let i = 0; i < rows.length; i++) {
      const n = i + 1;
      const r = rows[i];
      if (!r || typeof r !== "object" || Array.isArray(r)) { err(n, "This row is not a set of columns."); continue; }
      const f = pick(kind, r as Raw);
      const title = cut(f.title, 200);
      if (!title) { err(n, "Title is missing."); continue; }
      const author = cut(f.author, 120) || "Unknown";
      const code = cut(f.code, 40);
      let copies = 1;
      if (f.copies) {
        const c = whole(f.copies, 1, 500, "Copies");
        if (typeof c === "string") { err(n, c); continue; }
        copies = c;
      }
      let price: number | undefined;
      if (f.price) {
        price = Number(f.price.replace(/[^0-9.]/g, ""));
        if (!Number.isFinite(price) || price < 0 || price > 100000) { err(n, "Price must be a number from 0 to 100000."); continue; }
      }
      if (code) {
        const key = code.toLowerCase();
        if (codes.has(key) || seen.has(`c:${key}`)) { skip(n, `Code ${code} is already used${codes.get(key) ? ` by "${codes.get(key)}"` : " earlier in this file"}.`); continue; }
        seen.add(`c:${key}`);
      } else {
        const key = `${title}|${author}`.toLowerCase();
        if (titles.has(key) || seen.has(`t:${key}`)) { skip(n, "This title and author are already in the library."); continue; }
        seen.add(`t:${key}`);
      }
      const category = cut(f.category, 60) || "General";
      const ageRange = cut(f.ageRange, 20) || "All ages";
      const department = cut(f.department, 60) || "All classes";
      if (!dryRun) {
        await ctx.db.insert("books", { title, author, category, ageRange, department, copies, ...(code ? { code } : {}), ...(price !== undefined ? { price } : {}) });
        newLists.categories.add(category);
        newLists.ageRanges.add(ageRange);
        newLists.departments.add(department);
      }
      res.created++;
    }
  } else if (kind === "kids") {
    const existing = await ctx.db.query("kids").collect();
    const have = new Set(existing.map((k) => `${k.name}|${k.department}`.toLowerCase()));
    for (let i = 0; i < rows.length; i++) {
      const n = i + 1;
      const r = rows[i];
      if (!r || typeof r !== "object" || Array.isArray(r)) { err(n, "This row is not a set of columns."); continue; }
      const f = pick(kind, r as Raw);
      const name = cut(f.name, 120);
      if (!name) { err(n, "Name is missing."); continue; }
      let birthdate: string | undefined;
      let age: number | undefined;
      if (f.birthdate) {
        const d = parseDate(f.birthdate);
        if ("error" in d) { err(n, d.error); continue; }
        birthdate = d.iso;
        age = ageOn(d.iso);
      }
      if (f.age) {
        const a = whole(f.age, 0, 25, "Age");
        if (typeof a === "string") { err(n, a); continue; }
        age ??= a;
      }
      if (age === undefined) { err(n, "Add an age or a date of birth."); continue; }
      if (age < 0 || age > 25) { err(n, "That date of birth gives an age outside 0 to 25."); continue; }
      const department = cut(f.department, 60) || "Unassigned";
      const key = `${name}|${department}`.toLowerCase();
      if (have.has(key) || seen.has(key)) { skip(n, `${name} is already in ${department}.`); continue; }
      seen.add(key);
      const parentName = cut(f.parentName, 120);
      const parentPhone = (f.parentPhone ?? "").replace(/[^\d+]/g, "").slice(0, 20);
      if (!dryRun) {
        await ctx.db.insert("kids", { name, age, department, ...(birthdate ? { birthdate } : {}), ...(parentName ? { parentName } : {}), ...(parentPhone ? { parentPhone } : {}) });
        newLists.departments.add(department);
      }
      res.created++;
    }
  } else {
    const existing = await ctx.db.query("teachers").collect();
    const emails = new Set(existing.map((t) => t.email?.trim().toLowerCase()).filter(Boolean) as string[]);
    const have = new Set(existing.map((t) => `${t.name}|${t.department}`.toLowerCase()));
    for (let i = 0; i < rows.length; i++) {
      const n = i + 1;
      const r = rows[i];
      if (!r || typeof r !== "object" || Array.isArray(r)) { err(n, "This row is not a set of columns."); continue; }
      const f = pick(kind, r as Raw);
      const name = cut(f.name, 80);
      if (!name) { err(n, "Name is missing."); continue; }
      const email = cut(f.email, 120).toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err(n, `"${email.slice(0, 40)}" is not an email address.`); continue; }
      const department = cut(f.department, 60) || "Unassigned";
      if (email) {
        if (emails.has(email) || seen.has(`e:${email}`)) { skip(n, `${email} is already a teacher.`); continue; }
        seen.add(`e:${email}`);
      } else {
        const key = `${name}|${department}`.toLowerCase();
        if (have.has(key) || seen.has(`n:${key}`)) { skip(n, `${name} is already in ${department}.`); continue; }
        seen.add(`n:${key}`);
      }
      const className = cut(f.className, 60);
      const phone = (f.phone ?? "").replace(/[^\d+]/g, "").slice(0, 20);
      if (!dryRun) {
        await ctx.db.insert("teachers", { name, department, ...(className ? { className } : {}), ...(phone ? { phone } : {}), ...(email ? { email } : {}) });
        if (department !== "Unassigned") newLists.departments.add(department);
      }
      res.created++;
    }
  }

  if (!dryRun && res.created > 0) {
    await registerValues(ctx, "categories", newLists.categories);
    await registerValues(ctx, "ageRanges", newLists.ageRanges);
    await registerValues(ctx, "departments", newLists.departments);
    await logEvent(ctx, `import.${kind}`, `Imported ${res.created} ${kind}${res.skipped.length ? `, ${res.skipped.length} skipped` : ""}${res.errors.length ? `, ${res.errors.length} with problems` : ""}`, {
      entity: "import",
      ...(actor ? { actor } : {}),
    });
  }
  return res;
}

const args = { kind: v.union(v.literal("books"), v.literal("kids"), v.literal("teachers")), rows: v.array(v.any()), dryRun: v.optional(v.boolean()) };

/** Admin Import page. `dryRun` checks the rows and saves nothing. */
export const run = mutation({
  args,
  handler: async (ctx, { kind, rows, dryRun }) => {
    await requireAdmin(ctx);
    return runImport(ctx, kind, rows, dryRun ?? false);
  },
});

/** For the HTTP endpoint only (it checks the API key first). Not callable from a browser. */
export const runFromApi = internalMutation({
  args,
  handler: async (ctx, { kind, rows, dryRun }) => runImport(ctx, kind, rows, dryRun ?? false, { role: "system", name: "API import" }),
});
