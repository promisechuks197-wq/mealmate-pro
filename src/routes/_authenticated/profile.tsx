import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ScreenHeader } from "@/components/MobileShell";
import { LogOut, ShoppingBasket, Package, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

function Profile() {
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const profile = useQuery({
    queryKey: ["profile", user!.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  return (
    <>
      <ScreenHeader subtitle="Your account" title="Profile" />
      <div className="px-5">
        <div className="bg-card rounded-3xl p-5 flex items-center gap-4">
          <div className="size-14 rounded-full bg-primary text-primary-foreground grid place-items-center text-xl font-serif">
            {(profile.data?.name ?? user!.email)?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-medium">{profile.data?.name}</div>
            <div className="text-xs text-muted-foreground">{user!.email}</div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Link to="/inventory" className="bg-card rounded-2xl p-4 flex items-center gap-3"><Package className="size-5 text-primary" /> <span>My inventory</span></Link>
          <Link to="/grocery" className="bg-card rounded-2xl p-4 flex items-center gap-3"><ShoppingBasket className="size-5 text-primary" /> <span>Grocery list</span></Link>
          {isAdmin && <Link to="/admin/dashboard" className="bg-primary text-primary-foreground rounded-2xl p-4 flex items-center gap-3"><ShieldCheck className="size-5" /> <span className="font-medium">Admin panel</span></Link>}
        </div>
        <button onClick={async () => { await signOut(); nav({ to: "/" }); }} className="mt-6 w-full py-3 rounded-2xl border border-border flex items-center justify-center gap-2 text-muted-foreground">
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </>
  );
}
