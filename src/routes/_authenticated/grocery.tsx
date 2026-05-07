import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ScreenHeader } from "@/components/MobileShell";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/grocery")({ component: Grocery });

function Grocery() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const q = useQuery({
    queryKey: ["grocery", user!.id],
    queryFn: async () => (await supabase.from("grocery_list").select("*").eq("user_id", user!.id).order("checked").order("created_at")).data ?? [],
  });
  const toggle = useMutation({ mutationFn: async (row: any) => { await supabase.from("grocery_list").update({ checked: !row.checked }).eq("id", row.id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["grocery", user!.id] }) });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("grocery_list").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["grocery", user!.id] }) });
  const add = useMutation({ mutationFn: async () => { if (!name.trim()) return; await supabase.from("grocery_list").insert({ user_id: user!.id, item_name: name.trim() }); setName(""); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["grocery", user!.id] }) });
  const clearChecked = useMutation({ mutationFn: async () => { await supabase.from("grocery_list").delete().eq("user_id", user!.id).eq("checked", true); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["grocery", user!.id] }) });

  return (
    <>
      <ScreenHeader subtitle="Need to buy" title="Grocery list" right={<button onClick={() => clearChecked.mutate()} className="text-xs text-muted-foreground">Clear ✓</button>} />
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="px-5 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add item…" className="flex-1 px-4 py-3 rounded-2xl border border-border bg-card outline-none focus:border-primary" />
        <button type="submit" className="size-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center"><Plus /></button>
      </form>
      <div className="px-5 mt-4 space-y-2">
        {q.data?.length === 0 && <div className="text-center text-sm text-muted-foreground py-12">Nothing to buy. Plan some meals!</div>}
        {q.data?.map((row: any) => (
          <div key={row.id} className="bg-card rounded-2xl p-3 flex items-center gap-3">
            <button onClick={() => toggle.mutate(row)} className={`size-6 rounded-full border-2 grid place-items-center ${row.checked ? "bg-primary border-primary" : "border-border"}`}>{row.checked && <span className="text-primary-foreground text-xs">✓</span>}</button>
            <div className={`flex-1 ${row.checked ? "line-through text-muted-foreground" : ""}`}>
              <div className="font-medium">{row.item_name}</div>
              <div className="text-xs text-muted-foreground">{row.qty} {row.unit}</div>
            </div>
            <button onClick={() => del.mutate(row.id)} className="text-muted-foreground p-1"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
}
