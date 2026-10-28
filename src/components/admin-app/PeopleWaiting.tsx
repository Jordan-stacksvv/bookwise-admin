import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

/** Overview strip: people who signed in and are waiting for approval. */
export function PeopleWaiting() {
  const members = useQuery(api.members.list);
  const n = (members ?? []).filter((m) => m.access === "pending").length;
  if (n === 0) return null;
  return (
    <Link to="/admin/people" className="block mb-6 rounded-xl border border-violet-500/40 bg-violet-500/10 p-4 text-sm font-medium hover:bg-violet-500/15 transition">
      {n} {n === 1 ? "person is" : "people are"} waiting to be approved →
    </Link>
  );
}
