import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type AdminState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "not-admin"; email: string | null }
  | { status: "admin"; email: string | null; name: string | null };

/** Combines Convex auth with the server-side admin check (convex/adminAuth.ts). */
export function useAdmin(): AdminState {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.adminAuth.me, isAuthenticated ? {} : "skip");
  if (isLoading) return { status: "loading" };
  if (!isAuthenticated) return { status: "signed-out" };
  if (me === undefined) return { status: "loading" };
  if (!me.isAdmin) return { status: "not-admin", email: me.email };
  return { status: "admin", email: me.email, name: me.name };
}
