import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { normalize } from "@/lib/inventory-helpers";
import { ChevronLeft, Check, X, ShoppingBasket, Utensils, CalendarPlus, Heart, Minus, Plus, Flame, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/recipes/$id")({ component: RecipeDetail });

function RecipeDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [planOpen, setPlanOpen] = useState(false);
  const [servings, setServings] = useState<number | null>(null);
  const recipeQ = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => (await supabase.from("recipes").select("*, recipe_ingredients(*)").eq("id", id).maybeSingle()).data,
  });
  const inventoryQ = useQuery({
    queryKey: ["inventory", user!.id],
    queryFn: async () => (await supabase.from("inventory").select("*").eq("user_id", user!.id)).data ?? [],
  });
  const favQ = useQuery({
    queryKey: ["fav", user!.id, id],
    queryFn: async () => (await supabase.from("favourites").select("id").eq("user_id", user!.id).eq("recipe_id", id).maybeSingle()).data,
  });
  const invMap = new Map((inventoryQ.data ?? []).map((i: any) => [normalize(i.item_name), i]));

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (favQ.data) {
        await supabase.from("favourites").delete().eq("id", (favQ.data as any).id);
      } else {
        await supabase.from("favourites").insert({ user_id: user!.id, recipe_id: id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fav", user!.id, id] }),
  });

  const cook = useMutation({
    mutationFn: async () => {
      const ings = recipeQ.data!.recipe_ingredients as any[];
      for (const ing of ings) {
        const inv = invMap.get(normalize(ing.item_name));
        if (inv) {
          const newQty = Math.max(0, Number(inv.qty) - Number(ing.qty) * scale);
          if (newQty === 0) await supabase.from("inventory").delete().eq("id", inv.id);
          else await supabase.from("inventory").update({ qty: newQty }).eq("id", inv.id);
        }
      }
    },
    onSuccess: () => { toast.success("Enjoy! Inventory updated."); qc.invalidateQueries({ queryKey: ["inventory", user!.id] }); },
  });

  const addToShopping = useMutation({
    mutationFn: async () => {
      const ings = recipeQ.data!.recipe_ingredients as any[];
      const rows = ings.map((m) => ({ user_id: user!.id, item_name: m.item_name, qty: Number(m.qty) * scale, unit: m.unit, source_recipe_id: id }));
      const { error } = await supabase.from("grocery_list").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ["grocery", user!.id] }); toast.success(`Added ${n} items to shopping list`); },
  });

  const planAdd = useMutation({
    mutationFn: async ({ date, slot }: { date: string; slot: "breakfast"|"lunch"|"dinner" }) => {
      const { error } = await supabase.from("meal_plan").upsert({ user_id: user!.id, date, meal_slot: slot, recipe_id: id }, { onConflict: "user_id,date,meal_slot" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Added to plan"); qc.invalidateQueries({ queryKey: ["plan"] }); setPlanOpen(false); },
  });

  if (recipeQ.isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  if (!recipeQ.data) return <div className="p-6">Recipe not found.</div>;
  const r = recipeQ.data;
  const ings = r.recipe_ingredients as any[];
  const baseSrv = (r as any).base_servings ?? 4;
  const currentSrv = servings ?? baseSrv;
  const scale = currentSrv / baseSrv;
  const isFav = !!favQ.data;

  return (
    <div>
      {(r as any).image_url ? (
        <div className="relative h-64">
          <img src={(r as any).image_url} alt={r.title} className="w-full h-full object-cover" />
          <Link to="/recipes" className="absolute top-4 left-4 size-10 rounded-full bg-background/80 backdrop-blur grid place-items-center"><ChevronLeft className="size-5" /></Link>
          <button onClick={() => toggleFav.mutate()} className="absolute top-4 right-4 size-10 rounded-full bg-background/80 backdrop-blur grid place-items-center">
            <Heart className={`size-5 ${isFav ? "fill-primary text-primary" : "text-foreground"}`} />
          </button>
        </div>
      ) : (
        <div className="px-5 pt-6 flex items-center justify-between">
          <Link to="/recipes" className="inline-flex items-center gap-1 text-muted-foreground"><ChevronLeft className="size-4" /> Back</Link>
          <button onClick={() => toggleFav.mutate()} className="size-10 rounded-full bg-card grid place-items-center">
            <Heart className={`size-5 ${isFav ? "fill-primary text-primary" : ""}`} />
          </button>
        </div>
      )}
      <div className="px-5 pt-5">
        <h1 className="font-serif text-3xl">{r.title}</h1>
        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {r.prep_time_minutes} min</span>
          <span>· {(r as any).difficulty}</span>
          <span className="inline-flex items-center gap-1"><Flame className="size-3.5" /> {(r as any).spice_level}</span>
          {(r as any).meal_type && <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs capitalize">{(r as any).meal_type}</span>}
        </div>
        <div className="mt-5 flex items-center justify-between bg-card rounded-2xl p-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Servings</div>
            <div className="text-lg font-medium">{currentSrv}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setServings(Math.max(1, currentSrv - 1))} className="size-9 rounded-full bg-muted grid place-items-center"><Minus className="size-4" /></button>
            <button onClick={() => setServings(currentSrv + 1)} className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center"><Plus className="size-4" /></button>
          </div>
        </div>
        <h2 className="font-serif text-xl mt-6">Ingredients</h2>
        <ul className="mt-3 space-y-2">
          {ings.map((ing: any) => {
            const have = invMap.has(normalize(ing.item_name));
            const qty = Number(ing.qty) * scale;
            const display = qty < 10 ? Math.round(qty * 100) / 100 : Math.round(qty);
            return (
              <li key={ing.id} className="bg-card rounded-2xl px-4 py-3 flex items-center justify-between">
                <div><div className="font-medium">{ing.item_name}</div><div className="text-xs text-muted-foreground">{display} {ing.unit}</div></div>
                {have ? <span className="inline-flex items-center gap-1 text-xs text-primary"><Check className="size-4" /> In stock</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-destructive"><X className="size-4" /> Missing</span>}
              </li>
            );
          })}
        </ul>
        {(r as any).instructions && (<><h2 className="font-serif text-xl mt-6">Instructions</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{(r as any).instructions}</p></>)}
        <div className="mt-6 grid grid-cols-3 gap-2">
          <button onClick={() => cook.mutate()} className="py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-medium flex flex-col items-center gap-1"><Utensils className="size-4" /> Cook</button>
          <button onClick={() => setPlanOpen(true)} className="py-3 rounded-2xl bg-card text-sm font-medium flex flex-col items-center gap-1"><CalendarPlus className="size-4" /> Plan</button>
          <button onClick={() => addToShopping.mutate()} className="py-3 rounded-2xl bg-card text-sm font-medium flex flex-col items-center gap-1"><ShoppingBasket className="size-4" /> To shopping</button>
        </div>
      </div>
      {planOpen && <PlanPicker onPick={(date, slot) => planAdd.mutate({ date, slot })} onClose={() => setPlanOpen(false)} />}
    </div>
  );
}

function PlanPicker({ onPick, onClose }: { onPick: (date: string, slot: "breakfast"|"lunch"|"dinner") => void; onClose: () => void }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slot, setSlot] = useState<"breakfast"|"lunch"|"dinner">("dinner");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid items-end" onClick={onClose}>
      <div className="bg-background w-full max-w-md mx-auto rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-serif text-2xl">Plan this meal</h3>
        <label className="block mt-4"><span className="text-xs uppercase tracking-wide text-muted-foreground">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-2xl border border-border bg-card" /></label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["breakfast","lunch","dinner"] as const).map((s) => (<button key={s} onClick={() => setSlot(s)} className={`py-3 rounded-2xl text-sm capitalize ${slot === s ? "bg-primary text-primary-foreground" : "bg-card"}`}>{s}</button>))}
        </div>
        <button onClick={() => onPick(date, slot)} className="w-full mt-5 py-3 rounded-2xl bg-primary text-primary-foreground font-medium">Save to plan</button>
      </div>
    </div>
  );
}
