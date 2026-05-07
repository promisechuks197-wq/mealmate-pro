import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChefHat, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({ component: Dash });

function Dash() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [r, u] = await Promise.all([
        supabase.from("recipes").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { recipes: r.count ?? 0, users: u.count ?? 0 };
    },
  });
  return (
    <div className="px-5">
      <h1 className="font-serif text-3xl">Control center</h1>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <Link to="/admin/recipes" className="bg-card rounded-3xl p-5"><ChefHat className="size-6 text-primary" /><div className="font-serif text-3xl mt-3">{stats.data?.recipes ?? "·"}</div><div className="text-sm text-muted-foreground">Recipes</div></Link>
        <Link to="/admin/users" className="bg-card rounded-3xl p-5"><Users className="size-6 text-primary" /><div className="font-serif text-3xl mt-3">{stats.data?.users ?? "·"}</div><div className="text-sm text-muted-foreground">Users</div></Link>
      </div>
    </div>
  );
}
