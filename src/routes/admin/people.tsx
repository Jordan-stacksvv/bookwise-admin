import { createFileRoute } from "@tanstack/react-router";
import { PeoplePanel } from "@/components/admin-app/PeoplePanel";
import { PageHeader } from "@/components/admin/PageHeader";

export const Route = createFileRoute("/admin/people")({
  component: () => (
    <>
      <PageHeader title="People" />
      <PeoplePanel />
    </>
  ),
});
