import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, useApi, isOverdue, isActive } from "@/lib/mock-store";
import { PageHeader } from "@/components/admin/PageHeader";
import { BookOpen, Users, AlertTriangle, BookMarked, Plus, CalendarDays, GraduationCap, Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const MORNING = ["Good morning", "Rise and shine", "A blessed morning", "Bright morning"];
const AFTERNOON = ["Good afternoon", "Hope your day's going well", "Afternoon blessings"];
const EVENING = ["Good evening", "Calm evening", "Evening blessings"];
const NIGHT = ["Working late?", "Quiet night", "Good night"];

function pickGreeting() {
  const h = new Date().getHours();
  const list = h < 5 ? NIGHT : h < 12 ? MORNING : h < 17 ? AFTERNOON : h < 22 ? EVENING : NIGHT;
  // rotate by day so it's not random on every render
  const day = Math.floor(Date.now() / 86400000);
  return list[day % list.length];
}

function Dashboard() {
  const s = useStore();
  const api = useApi();
  const [q, setQ] = useState("");
  const [greeting, setGreeting] = useState(pickGreeting);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setGreeting(pickGreeting());
      setNow(new Date());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const borrowed = s.assignments.filter(isActive).length;
  const overdue = s.assignments.filter(isOverdue).length;

  const stats = [
    { label: "Total Books", value: s.books.length, icon: BookOpen, tone: "primary", to: "/books" as const },
    { label: "Borrowed", value: borrowed, icon: BookMarked, tone: "accent", to: "/calendar" as const },
    { label: "Overdue", value: overdue, icon: AlertTriangle, tone: "destructive", to: "/calendar" as const },
    { label: "Total Kids", value: s.kids.length, icon: Users, tone: "primary", to: "/kids" as const },
    { label: "Teachers", value: s.teachers.length, icon: GraduationCap, tone: "accent", to: "/teachers" as const },
  ];

  const upcoming = useMemo(
    () => s.assignments.filter((a) => !a.returnedAt).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)).slice(0, 6),
    [s.assignments],
  );

  const topBooks = useMemo(() => {
    const counts = new Map<string, number>();
    s.assignments.forEach((a) => counts.set(a.bookId, (counts.get(a.bookId) || 0) + 1));
    return Array.from(counts.entries())
      .map(([bookId, count]) => ({ book: s.books.find((b) => b.id === bookId), count }))
      .filter((x) => x.book)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [s.assignments, s.books]);

  const topKids = useMemo(() => {
    const counts = new Map<string, number>();
    s.assignments.forEach((a) => counts.set(a.kidId, (counts.get(a.kidId) || 0) + 1));
    return Array.from(counts.entries())
      .map(([kidId, count]) => ({ kid: s.kids.find((k) => k.id === kidId), count }))
      .filter((x) => x.kid)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [s.assignments, s.kids]);

  const topBooksByDept = useMemo(() => {
    const depts = Array.from(new Set(s.kids.map((k) => k.department)));
    return depts
      .map((dept) => {
        const kidIds = new Set(s.kids.filter((k) => k.department === dept).map((k) => k.id));
        const counts = new Map<string, number>();
        s.assignments.filter((a) => kidIds.has(a.kidId)).forEach((a) => counts.set(a.bookId, (counts.get(a.bookId) || 0) + 1));
        const top = Array.from(counts.entries())
          .map(([bookId, count]) => ({ book: s.books.find((b) => b.id === bookId), count }))
          .filter((x) => x.book)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        return { dept, top };
      })
      .filter((d) => d.top.length > 0);
  }, [s.assignments, s.books, s.kids]);

  const ql = q.trim().toLowerCase();
  const searchResults = ql
    ? {
        books: s.books.filter((b) => b.title.toLowerCase().includes(ql) || b.author.toLowerCase().includes(ql)).slice(0, 4),
        kids: s.kids.filter((k) => k.name.toLowerCase().includes(ql) || k.department.toLowerCase().includes(ql)).slice(0, 4),
        teachers: s.teachers.filter((t) => t.name.toLowerCase().includes(ql) || t.department.toLowerCase().includes(ql)).slice(0, 4),
      }
    : null;

  const dueToday = s.assignments.filter(
    (a) => !a.returnedAt && new Date(a.dueDate).toDateString() === now.toDateString(),
  ).length;
  const subtitle =
    overdue > 0
      ? `${overdue} book${overdue === 1 ? "" : "s"} overdue${dueToday ? ` · ${dueToday} due today` : ""}.`
      : dueToday > 0
        ? `${dueToday} book${dueToday === 1 ? "" : "s"} due today.`
        : "Everything is on track today.";

  const timeLabel = now.toLocaleString(undefined, {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div>
      <PageHeader
        title={`${greeting}!`}
        subtitle={`${timeLabel} · ${subtitle}`}
        actions={
          <>
            <Button asChild variant="outline"><Link to="/books"><Plus className="h-4 w-4 mr-1.5" /> Add Book</Link></Button>
            <Button asChild><Link to="/calendar"><CalendarDays className="h-4 w-4 mr-1.5" /> Calendar</Link></Button>
          </>
        }
      />

      <div className="bg-card border rounded-xl p-3 mb-6" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-10 border-0 shadow-none focus-visible:ring-0 bg-transparent"
            placeholder="Search books, kids, or teachers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {searchResults && (
          <div className="border-t mt-2 pt-3 grid sm:grid-cols-3 gap-4 text-sm">
            <SearchGroup
              title="Books"
              items={searchResults.books.map((b) => ({ id: b.id, primary: b.title, secondary: b.author, to: "/books" as const, focus: b.id }))}
            />
            <SearchGroup
              title="Kids"
              items={searchResults.kids.map((k) => ({ id: k.id, primary: k.name, secondary: k.department, to: "/kids" as const, focus: k.id }))}
            />
            <SearchGroup
              title="Teachers"
              items={searchResults.teachers.map((t) => ({ id: t.id, primary: t.name, secondary: [t.department, t.className].filter(Boolean).join(" · "), to: "/teachers" as const, focus: t.id }))}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        {stats.map((st) => (
          <Link
            key={st.label}
            to={st.to}
            className="bg-card rounded-xl p-4 sm:p-5 border hover:border-primary/40 transition-colors"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm text-muted-foreground">{st.label}</p>
              <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center ${
                st.tone === "accent" ? "bg-accent/20 text-accent-foreground" :
                st.tone === "destructive" ? "bg-destructive/10 text-destructive" :
                "bg-primary/10 text-primary"
              }`}>
                <st.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-display font-semibold">{st.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border p-4 sm:p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Upcoming returns</h3>
            <Link to="/calendar" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="divide-y">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground py-4">Nothing pending — all books returned.</p>}
            {upcoming.map((a) => {
              const book = s.books.find((b) => b.id === a.bookId);
              const kid = s.kids.find((k) => k.id === a.kidId);
              const od = isOverdue(a);
              const dueLabel = new Date(a.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
              return (
                <div key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{book?.title ?? "Unknown"}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {kid?.name} · {kid?.department} · due {dueLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${od ? "bg-destructive/10 text-destructive" : "bg-accent/20 text-accent-foreground"}`}>
                      {od ? "Overdue" : "Active"}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => api.returnBook(a.id)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Return
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4 sm:p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h3 className="font-display text-lg font-semibold mb-4">Departments</h3>
          <div className="space-y-3">
            {Array.from(new Set(s.kids.map((k) => k.department))).map((d) => {
              const count = s.kids.filter((k) => k.department === d).length;
              const pct = s.kids.length ? (count / s.kids.length) * 100 : 0;
              return (
                <div key={d}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{d}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
        <div className="bg-card rounded-xl border p-4 sm:p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h3 className="font-display text-lg font-semibold mb-4">Most Borrowed Books</h3>
          {topBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No borrowing activity yet.</p>
          ) : (
            <div className="divide-y">
              {topBooks.map(({ book, count }, i) => (
                <div key={book!.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-semibold text-muted-foreground w-4">{i + 1}</span>
                    <p className="text-sm font-medium truncate">{book!.title}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground shrink-0">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border p-4 sm:p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h3 className="font-display text-lg font-semibold mb-4">Top Readers</h3>
          {topKids.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No borrowing activity yet.</p>
          ) : (
            <div className="divide-y">
              {topKids.map(({ kid, count }, i) => (
                <div key={kid!.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-semibold text-muted-foreground w-4">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{kid!.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{kid!.department}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground shrink-0">{count} book{count === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {topBooksByDept.length > 0 && (
        <div className="bg-card rounded-xl border p-4 sm:p-6 mt-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h3 className="font-display text-lg font-semibold mb-4">Top Books by Department</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topBooksByDept.map(({ dept, top }) => (
              <div key={dept}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{dept}</p>
                <div className="space-y-1.5">
                  {top.map(({ book, count }, i) => (
                    <div key={book!.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate"><span className="text-muted-foreground mr-1.5">{i + 1}.</span>{book!.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchGroup({
  title,
  items,
}: {
  title: string;
  items: { id: string; primary: string; secondary: string; to: "/books" | "/kids" | "/teachers"; focus: string }[];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/70">No matches</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                to={i.to}
                search={{ focus: i.focus } as any}
                className="block rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors"
              >
                <p className="text-sm font-medium truncate">{i.primary}</p>
                <p className="text-xs text-muted-foreground truncate">{i.secondary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

