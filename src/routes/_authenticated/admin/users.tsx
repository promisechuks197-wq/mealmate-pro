import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: Users });

function Users() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const adminSet = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
      return (profiles ?? []).map((p) => ({ ...p, isAdmin: adminSet.has(p.id) }));
    },
  });
  const toggleAdmin = useMutation({
    mutationFn: async (u: any) => {
      if (u.isAdmin) await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "admin");
      else await supabase.from("user_roles").insert({ user_id: u.id, role: "admin" });
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });
  const reset = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("inventory").delete().eq("user_id", id);
      await supabase.from("meal_plan").delete().eq("user_id", id);
      await supabase.from("grocery_list").delete().eq("user_id", id);
    },
    onSuccess: () => toast.success("User data reset"),
  });
  return (
    <div className="px-5">
      <h1 className="font-serif text-3xl">Users</h1>
      <div className="mt-4 space-y-2">
        {q.data?.map((u) => (
          <div key={u.id} className="bg-card rounded-2xl p-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center font-serif">{u.name?.[0]?.toUpperCase()}</div>
              <div className="flex-1"><div className="font-medium">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
              {u.isAdmin && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Admin</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link to="/admin/users/$id" params={{ id: u.id }} className="px-3 py-1.5 rounded-full bg-muted">View inventory</Link>
              <button onClick={() => toggleAdmin.mutate(u)} className="px-3 py-1.5 rounded-full bg-muted inline-flex items-center gap-1">
                {u.isAdmin ? <><ShieldOff className="size-3" /> Remove admin</> : <><ShieldCheck className="size-3" /> Make admin</>}
              </button>
              <button onClick={() => { if (confirm(`Reset ALL data for ${u.name}?`)) reset.mutate(u.id); }} className="px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">Reset data</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
