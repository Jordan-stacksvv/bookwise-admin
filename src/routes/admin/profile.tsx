import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProfileCard } from "@/components/admin/ProfileCard";

export const Route = createFileRoute("/admin/profile")({
  component: () => (
    <>
      <PageHeader title="My profile" />
      <ProfileCard app="admin" />
    </>
  ),
});
