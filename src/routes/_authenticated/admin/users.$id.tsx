import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users/$id")({ component: UserDetail });

function UserDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["admin-user", id], queryFn: async () => (await supabase.from("profiles").select("*").eq("id", id).maybeSingle()).data });
  const inv = useQuery({ queryKey: ["admin-user-inv", id], queryFn: async () => (await supabase.from("inventory").select("*").eq("user_id", id).order("expiry_date")).data ?? [] });
  const del = useMutation({ mutationFn: async (rid: string) => { await supabase.from("inventory").delete().eq("id", rid); }, onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["admin-user-inv", id] }); } });
  return (
    <div className="px-5">
      <Link to="/admin/users" className="text-sm text-muted-foreground">← Users</Link>
      <h1 className="font-serif text-3xl mt-2">{profile.data?.name}</h1>
      <div className="text-xs text-muted-foreground">{profile.data?.email}</div>
      <h2 className="font-serif text-xl mt-6">Inventory ({inv.data?.length ?? 0})</h2>
      <div className="mt-2 space-y-2">
        {inv.data?.map((i) => (
          <div key={i.id} className="bg-card rounded-2xl p-3 flex items-center gap-3">
            <div className="flex-1"><div className="font-medium">{i.item_name}</div><div className="text-xs text-muted-foreground">{i.qty} {i.unit} · {i.category} {i.expiry_date && `· ${i.expiry_date}`}</div></div>
            <button onClick={() => del.mutate(i.id)} className="text-destructive p-2"><Trash2 className="size-4" /></button>
          </div>
        ))}
        {inv.data?.length === 0 && <div className="text-sm text-muted-foreground">No items.</div>}
      </div>
    </div>
  );
}
