import { createFileRoute } from "@tanstack/react-router";
import { BooksPage } from "../_authenticated/books";
import { PendingBooks } from "@/components/admin-app/PendingBooks";

export const Route = createFileRoute("/admin/books")({
  validateSearch: (s: Record<string, unknown>) => ({ focus: typeof s.focus === "string" ? s.focus : undefined }),
  component: AdminPage,
});

/** The same screen teachers use, inside the admin app. Admins do not need approval for anything they add. */
function AdminPage() {
  return (
    <>
      <PendingBooks />
      <BooksPage />
    </>
  );
}
