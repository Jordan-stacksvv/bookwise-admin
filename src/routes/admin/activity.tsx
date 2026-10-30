import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { ExportPanel } from "@/components/admin-app/ExportPanel";
import { Empty, Panel, fmtDateTime } from "@/components/admin-app/ui";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/activity")({
  component: Activity,
});

const ROLES: [string, string][] = [
  ["all", "Everyone"],
  ["teacher", "Teachers"],
  ["admin", "Admins"],
  ["parent", "Parents"],
  ["pending", "Waiting for approval"],
  ["system", "System"],
];

const AREAS: [string, string][] = [
  ["all", "Everything"],
  ["loan.", "Loans"],
  ["review.", "Reviews"],
  ["book.", "Books"],
  ["kid.", "Kids"],
  ["teacher.", "Teachers"],
  ["member.", "Sign-ins and approvals"],
  ["admin.", "Admin changes"],
  ["announcement.", "Announcements"],
  ["reading.", "Class reading"],
  ["policy.", "Policy and fees"],
  ["settings.", "Lists (classes, categories)"],
];

const roleTone = (r: string) =>
  r === "admin" ? "bg-violet-500/15 text-violet-700 dark:text-violet-300" : r === "teacher" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : r === "parent" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : r === "pending" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "";

const startOfDay = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined);
const endOfDay = (d: string) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined);

function Activity() {
  const [role, setRole] = useState("all");
  const [area, setArea] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(200);

  const filters = useMemo(
    () => ({
      role: role === "all" ? undefined : role,
      action: area === "all" ? undefined : area,
      search: search.trim() || undefined,
      from: startOfDay(from),
      to: endOfDay(to),
    }),
    [role, area, search, from, to],
  );
  const data = useQuery(api.activity.list, { ...filters, limit });

  return (
    <>
      <PageHeader title="Activity" />

      <ExportPanel filters={filters} />

      <Panel title="Activity log">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-4">
          <div>
            <Label className="mb-1.5 block">Who</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">What</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AREAS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">Search</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Name or book" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {data === undefined ? (
          <Empty>Loading...</Empty>
        ) : data.rows.length === 0 ? (
          <Empty>Nothing here yet. New activity shows up as soon as it happens.</Empty>
        ) : (
          <>
            <ul className="divide-y">
              {data.rows.map((r) => (
                <li key={r._id} className="py-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm break-words">{r.summary}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.actorName} · {fmtDateTime(r.at)}
                    </p>
                  </div>
                  <Badge variant="secondary" className={`shrink-0 ${roleTone(r.actorRole)}`}>{r.actorRole}</Badge>
                </li>
              ))}
            </ul>
            {data.hasMore && limit < 2000 && (
              <div className="pt-4 text-center">
                <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + 200)}>Show more</Button>
              </div>
            )}
            {data.hasMore && limit >= 2000 && (
              <p className="pt-4 text-xs text-muted-foreground text-center">Showing the latest 2,000. Narrow the dates to see more.</p>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
