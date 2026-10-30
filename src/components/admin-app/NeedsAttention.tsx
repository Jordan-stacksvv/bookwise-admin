import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Panel } from "@/components/admin-app/ui";
import { useStore } from "@/lib/mock-store";

/** One list of everything waiting for the admin, instead of a coloured banner for each. */
export function NeedsAttention({ loans }: { loans: number }) {
  const s = useStore();
  const members = useQuery(api.members.list);
  const rows = [
    { to: "/admin/approvals", label: "Loans waiting for final approval", n: loans },
    { to: "/admin/reviews", label: "Reviews waiting to be published", n: s.reviews.filter((r) => r.status === "pending").length },
    { to: "/admin/people", label: "People waiting for access", n: (members ?? []).filter((m) => m.access === "pending").length },
    { to: "/admin/books", label: "Books waiting for approval", n: s.books.filter((b) => b.status === "pending").length },
  ] as const;
  const open = rows.filter((r) => r.n > 0);
  if (open.length === 0) return null;
  return (
    <Panel title="Needs your attention" className="mb-6">
      <ul className="divide-y -my-2">
        {open.map((r) => (
          <li key={r.to}>
            <Link to={r.to} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary transition-colors">
              <span>{r.label}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="min-w-6 rounded-full bg-primary/10 px-2 py-0.5 text-center text-xs font-medium text-primary tabular-nums">{r.n}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
