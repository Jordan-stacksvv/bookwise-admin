import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, useApi, isOverdue, type Assignment } from "@/lib/mock-store";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

type Filter = "all" | "active" | "overdue" | "returned";

function CalendarPage() {
  const s = useStore();
  const api = useApi();
  const [view, setView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [openDay, setOpenDay] = useState<{ y: number; m: number; d: number } | null>(null);

  const today = new Date();

  const matchesFilter = (a: Assignment) => {
    const kid = s.kids.find((k) => k.id === a.kidId);
    if (deptFilter !== "all" && kid?.department !== deptFilter) return false;
    if (teacherFilter !== "all" && a.teacherId !== teacherFilter) return false;
    if (ageFilter !== "all" && kid) {
      const [lo, hi] = ageFilter.split("-").map(Number);
      if (kid.age < lo || kid.age > hi) return false;
    }
    if (filter === "all") return true;
    if (filter === "returned") return !!a.returnedAt;
    if (filter === "overdue") return isOverdue(a);
    if (filter === "active") return !a.returnedAt;
    return true;
  };

  const dueOn = useMemo(
    () => (y: number, m: number, d: number) => {
      return s.assignments.filter((a) => {
        const due = new Date(a.dueDate);
        if (
          due.getFullYear() !== y ||
          due.getMonth() !== m ||
          due.getDate() !== d
        )
          return false;
        return matchesFilter(a);
      });
    },
    [s.assignments, filter, deptFilter, ageFilter, teacherFilter, s.kids],
  );

  const first = new Date(view.y, view.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const monthName = first.toLocaleString("default", { month: "long", year: "numeric" });

  const overdueAll = s.assignments.filter(isOverdue);
  const activeAll = s.assignments.filter((a) => !a.returnedAt && !isOverdue(a));

  const departments = Array.from(new Set(s.kids.map((k) => k.department))).sort();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const filters: {
    id: Filter;
    label: string;
    icon: typeof Clock;
    count: number;
    activeCls: string;
    idleCls: string;
  }[] = [
    {
      id: "all", label: "All", icon: CalendarDays, count: s.assignments.length,
      activeCls: "bg-primary text-primary-foreground border-primary shadow-sm",
      idleCls: "bg-card hover:bg-muted/50 border-border text-foreground",
    },
    {
      id: "active", label: "Active", icon: Clock, count: activeAll.length,
      activeCls: "bg-sky-500 text-white border-sky-500 shadow-sm",
      idleCls: "bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30 text-sky-700 dark:text-sky-300",
    },
    {
      id: "overdue", label: "Overdue", icon: AlertTriangle, count: overdueAll.length,
      activeCls: "bg-destructive text-destructive-foreground border-destructive shadow-sm",
      idleCls: "bg-destructive/10 hover:bg-destructive/20 border-destructive/30 text-destructive",
    },
    {
      id: "returned", label: "Returned", icon: CheckCircle2, count: s.assignments.filter((a) => a.returnedAt).length,
      activeCls: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
      idleCls: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    },
  ];

  const goToday = () => {
    const d = new Date();
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const dayItems = openDay ? dueOn(openDay.y, openDay.m, openDay.d) : [];
  const dayLabel = openDay
    ? new Date(openDay.y, openDay.m, openDay.d).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div>
      <PageHeader
        title="Returns Calendar"
        subtitle="Filter by status and mark returns directly from any due date."
        actions={
          <Button variant="outline" onClick={goToday}>
            <CalendarDays className="h-4 w-4 mr-1.5" /> Today
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {filters.map((f) => {
          const Icon = f.icon;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition ${
                active ? f.activeCls : f.idleCls
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {f.label}
              <span className={`text-xs ${active ? "opacity-90" : "opacity-80"}`}>
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ageFilter} onValueChange={setAgeFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Age group" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ages</SelectItem>
            <SelectItem value="3-6">3 – 6</SelectItem>
            <SelectItem value="7-10">7 – 10</SelectItem>
            <SelectItem value="11-14">11 – 14</SelectItem>
            <SelectItem value="15-18">15 – 18</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Teacher" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teachers</SelectItem>
            {s.teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 bg-card border rounded-xl p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">{monthName}</h3>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setView((v) => ({
                    y: v.m === 0 ? v.y - 1 : v.y,
                    m: (v.m + 11) % 12,
                  }))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setView((v) => ({
                    y: v.m === 11 ? v.y + 1 : v.y,
                    m: (v.m + 1) % 12,
                  }))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const due = dueOn(view.y, view.m, d);
              const isToday =
                today.getFullYear() === view.y &&
                today.getMonth() === view.m &&
                today.getDate() === d;
              const cellDate = new Date(view.y, view.m, d);
              const hasOverdue = due.some(
                (a) => !a.returnedAt && new Date(a.dueDate) < today && cellDate < new Date(today.toDateString()),
              );
              return (
                <button
                  key={i}
                  onClick={() => due.length > 0 && setOpenDay({ y: view.y, m: view.m, d })}
                  className={`aspect-square rounded-lg p-1.5 border text-left text-xs flex flex-col transition ${
                    isToday
                      ? "border-accent bg-accent/10"
                      : "border-transparent hover:border-border"
                  } ${due.length > 0 ? "cursor-pointer hover:bg-muted/40" : "cursor-default"}`}
                >
                  <span className={`font-medium ${isToday ? "text-accent-foreground" : ""}`}>
                    {d}
                  </span>
                  <div className="mt-auto space-y-0.5 w-full">
                    {due.slice(0, 2).map((a) => {
                      const book = s.books.find((b) => b.id === a.bookId);
                      const returned = !!a.returnedAt;
                      return (
                        <div
                          key={a.id}
                          className={`truncate text-[10px] px-1 py-0.5 rounded ${
                            returned
                              ? "bg-muted text-muted-foreground line-through"
                              : hasOverdue
                                ? "bg-destructive/15 text-destructive"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {book?.title}
                        </div>
                      );
                    })}
                    {due.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{due.length - 2}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {(() => {
          const sideList =
            filter === "active" ? activeAll :
            filter === "returned" ? s.assignments.filter((a) => a.returnedAt) :
            overdueAll;
          const sideTitle =
            filter === "active" ? "Active" :
            filter === "returned" ? "Recently returned" :
            "Overdue";
          const empty =
            filter === "returned" ? "No returns yet." :
            filter === "active" ? "No active borrows." :
            "All caught up. ✨";
          return (
            <div className="bg-card border rounded-xl p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <h3 className="font-display text-lg font-semibold mb-3">
                {sideTitle} ({sideList.length})
              </h3>
              {sideList.length === 0 && (
                <p className="text-sm text-muted-foreground py-3">{empty}</p>
              )}
              <div className="divide-y">
                {sideList.map((a) => {
                  const book = s.books.find((b) => b.id === a.bookId);
                  const kid = s.kids.find((k) => k.id === a.kidId);
                  const days = Math.floor((Date.now() - +new Date(a.dueDate)) / 86400000);
                  const meta = a.returnedAt
                    ? `Returned ${new Date(a.returnedAt).toLocaleDateString()}`
                    : isOverdue(a)
                      ? `${days}d overdue`
                      : `Due ${new Date(a.dueDate).toLocaleDateString()}`;
                  return (
                    <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{book?.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {kid?.name} · {meta}
                        </p>
                      </div>
                      {!a.returnedAt && (
                        <Button size="sm" variant="outline" onClick={() => api.returnBook(a.id)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Return
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <Dialog open={!!openDay} onOpenChange={(o) => !o && setOpenDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dayLabel}</DialogTitle>
          </DialogHeader>
          <div className="divide-y">
            {dayItems.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nothing due on this day.</p>
            )}
            {dayItems.map((a) => {
              const book = s.books.find((b) => b.id === a.bookId);
              const kid = s.kids.find((k) => k.id === a.kidId);
              const od = isOverdue(a);
              return (
                <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{book?.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{kid?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        a.returnedAt
                          ? "bg-muted text-muted-foreground"
                          : od
                            ? "bg-destructive/10 text-destructive"
                            : "bg-accent/20 text-accent-foreground"
                      }`}
                    >
                      {a.returnedAt ? "Returned" : od ? "Overdue" : "Active"}
                    </span>
                    {!a.returnedAt && (
                      <Button size="sm" variant="outline" onClick={() => api.returnBook(a.id)}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Mark returned
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
