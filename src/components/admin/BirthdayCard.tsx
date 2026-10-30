import { Link } from "@tanstack/react-router";
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
    const msg = `Happy birthday to ${kid.name}! \u{1F389}\u{1F382} Wishing ${kid.name} a blessed year ahead. - Madina Central SDA Book Club`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="bg-card rounded-xl border p-4 sm:p-6 mb-6" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2 min-w-0">
          <Cake className="h-4 w-4 text-muted-foreground shrink-0" /> Birthdays in {monthName}
          <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">({all.length})</span>
        </h3>
        <Link to="/calendar" className="text-sm text-muted-foreground hover:text-foreground shrink-0 whitespace-nowrap">Calendar →</Link>
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
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  isToday ? "border-pink-500/40 bg-pink-500/10" : passed ? "opacity-60" : ""
                }`}
              >
                <div className="h-10 w-10 shrink-0 rounded-lg bg-pink-500/15 text-pink-700 dark:text-pink-300 flex flex-col items-center justify-center leading-none">
                  <span className="text-base font-semibold">{day}</span>
                  <span className="text-[9px] uppercase">{monthShort}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{kid.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {turning > 0 ? `Turning ${turning}` : "Birthday"} · {kid.department}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {isToday ? "Today!" : passed ? "passed" : `in ${until}d`}
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
