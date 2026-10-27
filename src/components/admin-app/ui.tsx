import type { ReactNode } from "react";

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-card rounded-xl border p-4 sm:p-6 ${className}`} style={{ boxShadow: "var(--shadow-soft)" }}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="font-display text-lg font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
}

export function Stat({ label, value, tone = "default", hint }: { label: string; value: ReactNode; tone?: "default" | "warn" | "bad" | "good"; hint?: string }) {
  const color =
    tone === "bad" ? "text-destructive" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground";
  return (
    <div className="bg-card rounded-xl border p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl sm:text-3xl font-display font-semibold mt-1 ${color}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "-");
export const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");
export const daysBetween = (from: Date, to: Date) => Math.floor((+to - +from) / 86400000);
