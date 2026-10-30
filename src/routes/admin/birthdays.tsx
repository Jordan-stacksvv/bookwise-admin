import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Empty, Panel } from "@/components/admin-app/ui";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { birthdaysInMonth } from "@/lib/birthdays";
import { whatsappLink } from "@/lib/approval-link";
import { useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/birthdays")({
  component: Birthdays,
});

function Birthdays() {
  const s = useStore();
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const list = useMemo(() => birthdaysInMonth(s.kids, cursor.y, cursor.m), [s.kids, cursor]);
  const missing = s.kids.filter((k) => !k.birthdate).length;
  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
  const isThisMonth = cursor.y === today.getFullYear() && cursor.m === today.getMonth();

  const step = (n: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <>
      <PageHeader title="Birthdays" />
      <Panel
        title={monthName}
        action={
          <div className="flex gap-1">
            <Button size="icon" variant="outline" aria-label="Previous month" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}>Today</Button>
            <Button size="icon" variant="outline" aria-label="Next month" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        }
      >
        {list.length === 0 ? (
          <Empty>No birthdays in {monthName}.</Empty>
        ) : (
          <ul className="divide-y">
            {list.map(({ kid, day, turning }) => {
              const isToday = isThisMonth && day === today.getDate();
              const msg = `Happy birthday to ${kid.name}! \u{1F389}\u{1F382} Wishing ${kid.name} a blessed year ahead. - Madina Central SDA Book Club`;
              const link = kid.parentPhone ? whatsappLink(kid.parentPhone, msg) : null;
              return (
                <li key={kid.id} className={`py-3 flex items-center gap-3 ${isToday ? "bg-pink-500/10 -mx-4 px-4 sm:-mx-6 sm:px-6" : ""}`}>
                  <div className="h-11 w-11 shrink-0 rounded-lg bg-pink-500/15 text-pink-700 dark:text-pink-300 flex items-center justify-center text-base font-semibold">{day}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{kid.name}{isToday ? " (today)" : ""}</p>
                    <p className="text-xs text-muted-foreground truncate">{turning > 0 ? `Turning ${turning}` : "Birthday"} · {kid.department}</p>
                  </div>
                  {link ? (
                    <Button size="sm" variant="outline" onClick={() => window.open(link, "_blank")}>
                      <MessageCircle className="h-4 w-4 mr-1.5 text-emerald-500" /> Wish
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">No phone</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      {missing > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          {missing} kid{missing === 1 ? " has" : "s have"} no date of birth saved, so they will not show here. Add it on the <a className="underline" href="/kids">Kids page</a> in the teacher app.
        </p>
      )}
    </>
  );
}
