import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/recipes")({ component: AdminRecipes });

function AdminRecipes() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-recipes"],
    queryFn: async () => (await supabase.from("recipes").select("id, title, prep_time_minutes, image_url").order("created_at", { ascending: false })).data ?? [],
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("recipes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-recipes"] }); qc.invalidateQueries({ queryKey: ["recipes-with-ing"] }); },
  });
  return (
    <div className="px-5">
      <div className="flex items-end justify-between">
        <h1 className="font-serif text-3xl">Recipes</h1>
        <Link to="/admin/recipes/new" className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm flex items-center gap-1"><Plus className="size-4" /> New</Link>
      </div>
      <div className="mt-4 space-y-2">
        {q.data?.length === 0 && <div className="text-sm text-muted-foreground">No recipes yet.</div>}
        {q.data?.map((r) => (
          <div key={r.id} className="bg-card rounded-2xl p-3 flex items-center gap-3">
            {r.image_url ? <img src={r.image_url} alt="" className="size-12 rounded-xl object-cover" /> : <div className="size-12 rounded-xl bg-muted" />}
            <div className="flex-1"><div className="font-medium">{r.title}</div><div className="text-xs text-muted-foreground">{r.prep_time_minutes} min</div></div>
            <Link to="/admin/recipes/$id" params={{ id: r.id }} className="p-2 text-muted-foreground"><Pencil className="size-4" /></Link>
            <button onClick={() => { if (confirm(`Delete "${r.title}"?`)) del.mutate(r.id); }} className="p-2 text-destructive"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
