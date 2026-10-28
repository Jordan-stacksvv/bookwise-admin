import { createFileRoute } from "@tanstack/react-router";
import { PeoplePanel } from "@/components/admin-app/PeoplePanel";
import { PageHeader } from "@/components/admin/PageHeader";

export const Route = createFileRoute("/admin/people")({
  component: () => (
    <>
      <PageHeader title="People" subtitle="Approve new sign-ins as teachers or admins. Nobody gets in until you do." />
      <PeoplePanel />
    </>
  ),
});
