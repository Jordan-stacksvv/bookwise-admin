import { useConvex, useQuery } from "convex/react";
import { Download } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Panel } from "@/components/admin-app/ui";
import { Button } from "@/components/ui/button";
import { csvDate, downloadCsv, toCsv } from "@/lib/csv";
import { friendlyError } from "@/lib/friendly-error";
import { loanStatus, useStore } from "@/lib/mock-store";

export type ActivityFilters = { role?: string; action?: string; search?: string; from?: string; to?: string };

/** One-tap CSV downloads for the admin. Everything is built in the browser from data the admin can already see. */
export function ExportPanel({ filters }: { filters: ActivityFilters }) {
  const s = useStore();
  const convex = useConvex();
  const members = useQuery(api.members.list);
  const [busy, setBusy] = useState("");
  const day = new Date().toISOString().slice(0, 10);

  const kid = (id: string) => s.kids.find((k) => k.id === id);
  const book = (id: string) => s.books.find((b) => b.id === id);
  const teacher = (id?: string) => (id ? s.teachers.find((t) => t.id === id)?.name : undefined);

  const jobs: { key: string; label: string; hint: string; run: () => Promise<void> | void }[] = [
    {
      key: "activity",
      label: "Activity log",
      hint: "Uses the filters above (up to 5,000 lines).",
      run: async () => {
        const res = await convex.query(api.activity.list, { ...filters, limit: 5000 });
        downloadCsv(
          `bookwise-activity-${day}`,
          toCsv(
            ["When", "Who", "Role", "What", "Details"],
            res.rows.map((r) => [csvDate(r.at), r.actorName, r.actorRole, r.action, r.summary]),
          ),
        );
        if (res.hasMore) alert("The file holds the newest 5,000 lines that match. Narrow the dates to get the rest.");
      },
    },
    {
      key: "loans",
      label: "Loans",
      hint: "Every loan with its parent and admin approvals and any fee.",
      run: () =>
        downloadCsv(
          `bookwise-loans-${day}`,
          toCsv(
            ["Assigned", "Book code", "Book", "Child", "Class", "Teacher", "Due", "Returned", "Status", "Parent approved by", "Parent approved at", "Policy version", "Admin approved by", "Admin approved at", "Declined reason", "Fee type", "Fee amount", "Fee status"],
            [...s.assignments]
              .sort((a, b) => +new Date(b.assignedAt) - +new Date(a.assignedAt))
              .map((a) => [
                csvDate(a.assignedAt), book(a.bookId)?.code, book(a.bookId)?.title, kid(a.kidId)?.name, kid(a.kidId)?.department, teacher(a.teacherId),
                a.dueDate, csvDate(a.returnedAt), loanStatus(a), a.parentApprovedName, csvDate(a.parentApprovedAt), a.policyVersion,
                a.adminApprovedBy, csvDate(a.adminApprovedAt), a.rejectedReason, a.feeKind, a.feeAmount, a.feeStatus,
              ]),
          ),
        ),
    },
    {
      key: "reviews",
      label: "Book reviews",
      hint: "Full names and review text, with who approved or declined.",
      run: () =>
        downloadCsv(
          `bookwise-reviews-${day}`,
          toCsv(
            ["Written", "Child", "Class", "Book", "Chapters", "Status", "Submitted", "Decided", "Decided by", "Declined reason", "Sent to parent", "Review"],
            [...s.reviews]
              .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
              .map((r) => [
                csvDate(r.createdAt), kid(r.kidId)?.name, kid(r.kidId)?.department, book(r.bookId)?.title, r.chapterRange,
                r.status === "approved" ? "published" : r.status === "pending" ? "waiting" : r.status === "rejected" ? "declined" : "not submitted",
                csvDate(r.submittedAt), csvDate(r.decidedAt), r.decidedBy, r.rejectedReason, csvDate(r.sentToParentAt), r.summary,
              ]),
          ),
        ),
    },
    {
      key: "fees",
      label: "Fees",
      hint: "Lost and damaged books and what has been paid.",
      run: () =>
        downloadCsv(
          `bookwise-fees-${day}`,
          toCsv(
            ["Date", "Child", "Parent", "Parent phone", "Book", "Type", "Amount", "Status", "Note"],
            s.assignments
              .filter((a) => a.feeStatus)
              .sort((a, b) => +new Date(b.feeAt ?? 0) - +new Date(a.feeAt ?? 0))
              .map((a) => [csvDate(a.feeAt), kid(a.kidId)?.name, kid(a.kidId)?.parentName, kid(a.kidId)?.parentPhone, book(a.bookId)?.title, a.feeKind, a.feeAmount, a.feeStatus, a.feeNote]),
          ),
        ),
    },
    {
      key: "people",
      label: "People",
      hint: "Everyone who has signed in and whether they were approved.",
      run: () =>
        downloadCsv(
          `bookwise-people-${day}`,
          toCsv(
            ["Name", "Email", "Access", "Teacher record", "First sign-in", "Last seen", "Approved", "Approved by"],
            (members ?? []).map((m) => [m.name, m.email, m.access, m.teacherName, csvDate(m.createdAt), csvDate(m.lastSeenAt), csvDate(m.approvedAt), m.approvedBy]),
          ),
        ),
    },
    {
      key: "books",
      label: "Books",
      hint: "The full book list with codes, copies and prices.",
      run: () =>
        downloadCsv(
          `bookwise-books-${day}`,
          toCsv(
            ["Code", "Title", "Author", "Category", "Age range", "Class", "Copies", "Price"],
            [...s.books].sort((a, b) => a.title.localeCompare(b.title)).map((b) => [b.code, b.title, b.author, b.category, b.ageRange, b.department, b.copies, b.price]),
          ),
        ),
    },
  ];

  const go = async (j: (typeof jobs)[number]) => {
    setBusy(j.key);
    try {
      await j.run();
    } catch (e) {
      alert(friendlyError(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <Panel title="Export to Excel (CSV)" className="mb-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {jobs.map((j) => (
          <div key={j.key} className="rounded-lg border p-3 flex flex-col gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">{j.label}</p>
              <p className="text-xs text-muted-foreground">{j.hint}</p>
            </div>
            <Button size="sm" variant="outline" disabled={busy !== ""} onClick={() => go(j)} className="self-start">
              <Download className="h-4 w-4 mr-1.5" /> {busy === j.key ? "Preparing..." : "Download"}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">These files contain children's full names and parents' phone numbers. Keep them private.</p>
    </Panel>
  );
}
