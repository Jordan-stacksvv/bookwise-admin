import { createFileRoute } from "@tanstack/react-router";
import { KidsPage } from "../_authenticated/kids";

export const Route = createFileRoute("/admin/kids")({
  validateSearch: (s: Record<string, unknown>) => ({ focus: typeof s.focus === "string" ? s.focus : undefined }),
  component: AdminPage,
});

/** The same screen teachers use, inside the admin app. Admins do not need approval for anything they add. */
function AdminPage() {
  return (
    <>
      <KidsPage />
    </>
  );
}
