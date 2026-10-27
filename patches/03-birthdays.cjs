"use strict";
/**
 * 03 - Birthday reminders
 * - Dashboard card: "Birthdays in <month>" (today highlighted, upcoming, passed)
 *   with a one-tap WhatsApp "send wishes" button when the parent has a number.
 * - Calendar page: birthday markers on each day, a Birthdays toggle chip, and the
 *   day dialog lists who has a birthday. Feb 29 birthdays show on Feb 28 in non-leap years.
 *
 * Run from project root:  node patches/03-birthdays.cjs   (frontend only, no Convex deploy)
 */
const { exists, load, replaceOnce, ensureAfter, create, run } = require("./_lib.cjs");
const { ensurePhone } = require("./_shared.cjs");

const BIRTHDAYS_LIB = `import type { Kid } from "@/lib/mock-store";

export type MonthBirthday = { kid: Kid; day: number; turning: number };

/** Parses "YYYY-MM-DD" as a plain calendar date (no timezone shifting). */
export function parseBirthdate(s?: string): { y: number; m: number; d: number } | null {
  if (!s) return null;
  const match = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  return { y, m, d };
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Day of month the birthday is celebrated in \`year\` (Feb 29 -> Feb 28 in non-leap years). */
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
`;

const BIRTHDAY_CARD = `import { Link } from "@tanstack/react-router";
import { Cake, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Kid } from "@/lib/mock-store";
import { birthdaysInMonth } from "@/lib/birthdays";
import { normalisePhone } from "@/lib/phone";

const MAX_SHOWN = 6;

export function BirthdayCard({ kids }: { kids: Kid[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const monthName = now.toLocaleString(undefined, { month: "long" });
  const monthShort = now.toLocaleString(undefined, { month: "short" });

  if (!kids.some((k) => k.birthdate)) return null; // no dates of birth recorded yet

  const all = birthdaysInMonth(kids, year, month);
  // today + upcoming first, then the ones already passed this month
  const ordered = [...all.filter((b) => b.day >= today), ...all.filter((b) => b.day < today)];
  const shown = ordered.slice(0, MAX_SHOWN);
  const hidden = ordered.length - shown.length;

  const sendWishes = (kid: Kid) => {
    const phone = kid.parentPhone ? normalisePhone(kid.parentPhone) : null;
    if (!phone) return;
    const msg = \`Happy birthday to \${kid.name}! \\u{1F389}\\u{1F382} Wishing \${kid.name} a blessed year ahead. - Madina Central SDA Book Club\`;
    window.open(\`https://wa.me/\${phone}?text=\${encodeURIComponent(msg)}\`, "_blank");
  };

  return (
    <div className="bg-card rounded-xl border p-4 sm:p-6 mb-6" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Cake className="h-5 w-5 text-pink-500" /> Birthdays in {monthName}
          <span className="text-xs font-normal text-muted-foreground">({all.length})</span>
        </h3>
        <Link to="/calendar" className="text-sm text-muted-foreground hover:text-foreground">Calendar →</Link>
      </div>

      {all.length === 0 ? (
        <p className="text-sm text-muted-foreground">No birthdays this month.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map(({ kid, day, turning }) => {
            const isToday = day === today;
            const passed = day < today;
            const until = day - today;
            const canWish = !!(kid.parentPhone && normalisePhone(kid.parentPhone));
            return (
              <div
                key={kid.id}
                className={\`flex items-center gap-3 rounded-lg border p-3 \${
                  isToday ? "border-pink-500/40 bg-pink-500/10" : passed ? "opacity-60" : ""
                }\`}
              >
                <div className="h-10 w-10 shrink-0 rounded-lg bg-pink-500/15 text-pink-700 dark:text-pink-300 flex flex-col items-center justify-center leading-none">
                  <span className="text-base font-semibold">{day}</span>
                  <span className="text-[9px] uppercase">{monthShort}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{kid.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {turning > 0 ? \`Turning \${turning}\` : "Birthday"} · {kid.department}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {isToday ? "Today!" : passed ? "passed" : \`in \${until}d\`}
                </span>
                {canWish && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" title="Send birthday wishes on WhatsApp" onClick={() => sendWishes(kid)}>
                    <MessageCircle className="h-4 w-4 text-emerald-500" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {hidden > 0 && <p className="text-xs text-muted-foreground mt-3">+{hidden} more this month - see the calendar.</p>}
    </div>
  );
}
`;

run("03 birthdays", () => {
  if (exists("src/lib/birthdays.ts")) return "skip";

  create("src/lib/birthdays.ts", BIRTHDAYS_LIB);
  ensurePhone();
  create("src/components/admin/BirthdayCard.tsx", BIRTHDAY_CARD);

  // ---- dashboard.tsx ----------------------------------------------------
  const dash = load("src/routes/_authenticated/dashboard.tsx");
  ensureAfter(dash, `import { PageHeader } from "@/components/admin/PageHeader";`, `import { BirthdayCard } from "@/components/admin/BirthdayCard";`);
  replaceOnce(
    dash,
    `      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border p-4 sm:p-6"`,
    `      <BirthdayCard kids={s.kids} />

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border p-4 sm:p-6"`,
    "dashboard card slot"
  );

  // ---- calendar.tsx -----------------------------------------------------
  const cal = load("src/routes/_authenticated/calendar.tsx");
  replaceOnce(cal, `  AlertTriangle,\n} from "lucide-react";`, `  AlertTriangle,\n  Cake,\n} from "lucide-react";`, "lucide import");
  ensureAfter(cal, `import { PageHeader } from "@/components/admin/PageHeader";`, `import { birthdaysInMonth } from "@/lib/birthdays";`);
  replaceOnce(
    cal,
    `  const [openDay, setOpenDay] = useState<{ y: number; m: number; d: number } | null>(null);`,
    `  const [openDay, setOpenDay] = useState<{ y: number; m: number; d: number } | null>(null);
  const [showBirthdays, setShowBirthdays] = useState(true);`,
    "state"
  );
  replaceOnce(
    cal,
    `  const first = new Date(view.y, view.m, 1);`,
    `  const bdays = useMemo(() => birthdaysInMonth(s.kids, view.y, view.m), [s.kids, view.y, view.m]);

  const first = new Date(view.y, view.m, 1);`,
    "bdays memo"
  );
  replaceOnce(
    cal,
    `            {s.teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>`,
    `            {s.teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setShowBirthdays((v) => !v)}
          className={\`flex items-center gap-2 px-3 h-9 rounded-md text-sm border transition \${
            showBirthdays
              ? "bg-pink-500/15 border-pink-500/40 text-pink-700 dark:text-pink-300"
              : "bg-card border-border text-muted-foreground"
          }\`}
        >
          <Cake className="h-3.5 w-3.5" /> Birthdays
          <span className="text-xs opacity-80">{bdays.length}</span>
        </button>
      </div>`,
    "toggle chip"
  );
  replaceOnce(
    cal,
    `              const due = dueOn(view.y, view.m, d);`,
    `              const due = dueOn(view.y, view.m, d);
              const bd = showBirthdays ? bdays.filter((x) => x.day === d) : [];
              const maxDue = bd.length > 0 ? 1 : 2;`,
    "cell vars"
  );
  replaceOnce(
    cal,
    `onClick={() => due.length > 0 && setOpenDay({ y: view.y, m: view.m, d })}`,
    `onClick={() => (due.length > 0 || bd.length > 0) && setOpenDay({ y: view.y, m: view.m, d })}`,
    "cell click"
  );
  replaceOnce(
    cal,
    `\${due.length > 0 ? "cursor-pointer hover:bg-muted/40" : "cursor-default"}`,
    `\${due.length > 0 || bd.length > 0 ? "cursor-pointer hover:bg-muted/40" : "cursor-default"}`,
    "cell cursor"
  );
  replaceOnce(
    cal,
    `                  <div className="mt-auto space-y-0.5 w-full">
                    {due.slice(0, 2).map((a) => {`,
    `                  <div className="mt-auto space-y-0.5 w-full">
                    {bd.length > 0 && (
                      <div className="truncate text-[10px] px-1 py-0.5 rounded bg-pink-500/15 text-pink-700 dark:text-pink-300 flex items-center gap-0.5">
                        <Cake className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{bd[0].kid.name.split(" ")[0]}{bd.length > 1 ? \` +\${bd.length - 1}\` : ""}</span>
                      </div>
                    )}
                    {due.slice(0, maxDue).map((a) => {`,
    "cell birthday pill"
  );
  replaceOnce(
    cal,
    `                    {due.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{due.length - 2}</div>`,
    `                    {due.length > maxDue && (
                      <div className="text-[10px] text-muted-foreground">+{due.length - maxDue}</div>`,
    "cell overflow"
  );
  replaceOnce(
    cal,
    `  const dayItems = openDay ? dueOn(openDay.y, openDay.m, openDay.d) : [];`,
    `  const dayItems = openDay ? dueOn(openDay.y, openDay.m, openDay.d) : [];
  const dayBirthdays = openDay && showBirthdays ? bdays.filter((x) => x.day === openDay.d) : [];`,
    "day birthdays"
  );
  replaceOnce(
    cal,
    `          <div className="divide-y">
            {dayItems.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nothing due on this day.</p>
            )}`,
    `          {dayBirthdays.length > 0 && (
            <div className="space-y-2">
              {dayBirthdays.map(({ kid, turning }) => (
                <div key={kid.id} className="flex items-center gap-2 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-sm">
                  <Cake className="h-4 w-4 text-pink-500 shrink-0" />
                  <span className="font-medium">{kid.name}</span>
                  <span className="text-muted-foreground">{turning > 0 ? \`turns \${turning}\` : "birthday"} · {kid.department}</span>
                </div>
              ))}
            </div>
          )}
          <div className="divide-y">
            {dayItems.length === 0 && dayBirthdays.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nothing due on this day.</p>
            )}`,
    "day dialog"
  );
});
