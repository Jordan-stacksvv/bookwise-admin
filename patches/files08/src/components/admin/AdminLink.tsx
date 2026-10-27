import { useConvexAuth, useQuery } from "convex/react";
import { ShieldCheck } from "lucide-react";
import { api } from "../../../convex/_generated/api";

/** Only shown to admins: jump from the teacher app to the admin app (full page load so the admin PWA manifest is used). */
export function AdminLink({ className = "" }: { className?: string }) {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.adminAuth.me, isAuthenticated ? {} : "skip");
  if (!me?.isAdmin) return null;
  return (
    <a href="/admin" className={className}>
      <ShieldCheck className="h-4 w-4" /> Admin app
    </a>
  );
}
