import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type AdminState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "not-admin"; userId: string | null; email: string | null; name: string | null }
  | { status: "admin"; userId: string | null; email: string | null; name: string | null };

/** Combines Convex auth with the server-side admin check (convex/adminAuth.ts). */
export function useAdmin(): AdminState {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.adminAuth.me, isAuthenticated ? {} : "skip");
  if (isLoading) return { status: "loading" };
  if (!isAuthenticated) return { status: "signed-out" };
  if (me === undefined) return { status: "loading" };
  const base = { userId: me.userId, email: me.email, name: me.name };
  return me.isAdmin ? { status: "admin", ...base } : { status: "not-admin", ...base };
}
