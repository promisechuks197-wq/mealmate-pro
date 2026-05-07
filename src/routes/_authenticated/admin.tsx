import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminLayout });

function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !isAdmin) nav({ to: "/home" }); }, [loading, isAdmin, nav]);
  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return null;
  return (
    <div>
      <header className="px-5 pt-6 pb-3 flex items-center gap-2">
        <Link to="/profile" className="size-9 rounded-full bg-card grid place-items-center"><ChevronLeft className="size-4" /></Link>
        <div className="text-xs uppercase tracking-widest text-primary">Admin</div>
      </header>
      <Outlet />
    </div>
  );
}
