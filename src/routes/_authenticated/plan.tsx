import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ScreenHeader } from "@/components/MobileShell";
import { addDays, format, startOfWeek } from "date-fns";
import { normalize } from "@/lib/inventory-helpers";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plan")({ component: Plan });

function Plan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const range = { from: format(days[0], "yyyy-MM-dd"), to: format(days[6], "yyyy-MM-dd") };

  const planQ = useQuery({
    queryKey: ["plan", user!.id, range.from],
    queryFn: async () => (await supabase.from("meal_plan").select("id, date, meal_slot, recipe:recipes(id, title)").eq("user_id", user!.id).gte("date", range.from).lte("date", range.to)).data ?? [],
  });
  const inventoryQ = useQuery({ queryKey: ["inventory", user!.id], queryFn: async () => (await supabase.from("inventory").select("*").eq("user_id", user!.id)).data ?? [] });
  const recipesQ = useQuery({ queryKey: ["recipes-with-ing"], queryFn: async () => (await supabase.from("recipes").select("id, title, recipe_ingredients(item_name, qty, unit)")).data ?? [] });

  const remove = useMutation({ mutationFn: async (id: string) => { await supabase.from("meal_plan").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", user!.id, range.from] }) });

  const autoPlan = useMutation({
    mutationFn: async () => {
      const inv = (inventoryQ.data ?? []).slice().sort((a: any, b: any) => !a.expiry_date ? 1 : !b.expiry_date ? -1 : a.expiry_date.localeCompare(b.expiry_date));
      const expirySoon = new Set(inv.slice(0, 10).map((i: any) => normalize(i.item_name)));
      const recipes = (recipesQ.data ?? []).map((r: any) => {
        const ings = r.recipe_ingredients as any[];
        return { ...r, score: ings.filter((i) => expirySoon.has(normalize(i.item_name))).length };
      }).sort((a: any, b: any) => b.score - a.score);
      if (recipes.length === 0) throw new Error("No recipes available yet");
      const slots: ("breakfast"|"lunch"|"dinner")[] = ["breakfast","lunch","dinner"];
      const rows: any[] = [];
      let idx = 0;
      for (const day of days) for (const slot of slots) { const r = recipes[idx++ % recipes.length]; rows.push({ user_id: user!.id, date: format(day, "yyyy-MM-dd"), meal_slot: slot, recipe_id: r.id }); }
      await supabase.from("meal_plan").delete().eq("user_id", user!.id).gte("date", range.from).lte("date", range.to);
      const { error } = await supabase.from("meal_plan").insert(rows); if (error) throw error;
      const invSet = new Set((inventoryQ.data ?? []).map((i: any) => normalize(i.item_name)));
      const missing: any[] = []; const seen = new Set<string>();
      for (const r of recipes.slice(0, Math.min(recipes.length, 7))) {
        for (const ing of (r.recipe_ingredients as any[])) {
          const key = normalize(ing.item_name);
          if (!invSet.has(key) && !seen.has(key)) { seen.add(key); missing.push({ user_id: user!.id, item_name: ing.item_name, qty: ing.qty, unit: ing.unit }); }
        }
      }
      if (missing.length) await supabase.from("grocery_list").insert(missing);
    },
    onSuccess: () => { toast.success("Week planned!"); qc.invalidateQueries({ queryKey: ["plan", user!.id, range.from] }); qc.invalidateQueries({ queryKey: ["grocery", user!.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const byDateSlot = new Map<string, any>();
  (planQ.data ?? []).forEach((p: any) => byDateSlot.set(`${p.date}_${p.meal_slot}`, p));

  return (
    <>
      <ScreenHeader subtitle="This week" title="Meal plan"
        right={<button onClick={() => autoPlan.mutate()} disabled={autoPlan.isPending} className="px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs flex items-center gap-1 disabled:opacity-60"><Sparkles className="size-3" /> {autoPlan.isPending ? "Planning…" : "Auto-plan"}</button>} />
      <div className="px-5 space-y-3">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          return (
            <div key={dateStr} className="bg-card rounded-3xl p-4">
              <div className="font-serif text-lg">{format(day, "EEEE")} <span className="text-muted-foreground text-sm font-sans">{format(day, "MMM d")}</span></div>
              <div className="mt-2 space-y-1.5">
                {(["breakfast","lunch","dinner"] as const).map((slot) => {
                  const e = byDateSlot.get(`${dateStr}_${slot}`);
                  return (
                    <div key={slot} className="flex items-center justify-between text-sm">
                      <span className="text-xs uppercase text-muted-foreground w-20">{slot}</span>
                      <div className="flex-1">{e ? <Link to="/recipes/$id" params={{ id: e.recipe.id }}>{e.recipe.title}</Link> : <Link to="/recipes" className="text-muted-foreground italic">Pick a recipe</Link>}</div>
                      {e && <button onClick={() => remove.mutate(e.id)} className="text-muted-foreground p-1"><Trash2 className="size-3.5" /></button>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
