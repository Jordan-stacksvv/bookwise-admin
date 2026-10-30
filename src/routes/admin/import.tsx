import { createFileRoute } from "@tanstack/react-router";
import { ImportPanel } from "@/components/admin-app/ImportPanel";
import { PageHeader } from "@/components/admin/PageHeader";

export const Route = createFileRoute("/admin/import")({
  component: () => (
    <>
      <PageHeader title="Import" />
      <ImportPanel />
    </>
  ),
});
