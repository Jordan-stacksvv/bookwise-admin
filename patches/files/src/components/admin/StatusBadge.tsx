import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; cls: string }> = {
  pending_parent: { label: "Waiting for parent", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  pending_admin: { label: "Waiting for admin", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  rejected: { label: "Declined", cls: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground" },
  lost: { label: "Lost", cls: "bg-destructive/15 text-destructive" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = MAP[status] ?? MAP.approved;
  return (
    <Badge variant="secondary" className={`shrink-0 self-start sm:self-center ${m.cls}`}>
      {m.label}
    </Badge>
  );
}
