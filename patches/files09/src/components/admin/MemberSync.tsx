import { useUser } from "@clerk/clerk-react";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";

/** Invisible. Records who is using the app (see convex/members.ts) once per visit. */
export function MemberSync() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const sync = useMutation(api.members.sync);
  const done = useRef("");

  useEffect(() => {
    if (!isAuthenticated || !user || done.current === user.id) return;
    done.current = user.id;
    let role: "teacher" | "admin" | undefined;
    try {
      const r = localStorage.getItem("bw-role");
      if (r === "teacher" || r === "admin") role = r;
    } catch {
      /* private mode */
    }
    sync({ name: user.fullName ?? undefined, email: user.primaryEmailAddress?.emailAddress, imageUrl: user.imageUrl, role }).catch(() => {});
  }, [isAuthenticated, user, sync]);

  return null;
}
