import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ScreenHeader } from "@/components/MobileShell";
import { normalize } from "@/lib/inventory-helpers";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recipes")({ component: Recipes });

const FILTERS = [
  { key: "all", label: "All" },
  { key: "quick", label: "Quick" },
  { key: "vegetarian", label: "Veg" },
  { key: "low_carb", label: "Low Carb" },
  { key: "gluten_free", label: "GF" },
] as const;

function Recipes() {
  const matchRoute = useMatchRoute();
  const isDetail = matchRoute({ to: "/_authenticated/recipes/$id", fuzzy: true });
  if (isDetail) return <Outlet />;

  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const recipesQ = useQuery({
    queryKey: ["recipes-with-ing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, image_url, prep_time_minutes, tags, recipe_ingredients(item_name)");
      if (error) throw error;
      return data;
    },
  });

  const inventoryQ = useQuery({
    queryKey: ["inventory", user!.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory").select("item_name").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const invSet = useMemo(
    () => new Set((inventoryQ.data ?? []).map((i) => normalize(i.item_name))),
    [inventoryQ.data]
  );

  const list = (recipesQ.data ?? [])
    .map((r) => {
      const ings = r.recipe_ingredients as { item_name: string }[];
      const matched = ings.filter((i) => invSet.has(normalize(i.item_name))).length;
      return { ...r, matchPct: ings.length ? Math.round((matched / ings.length) * 100) : 0, total: ings.length };
    })
    .filter((r) => {
      if (filter === "all") return true;
      if (filter === "quick") return r.prep_time_minutes <= 20;
      return (r.tags ?? []).includes(filter);
    })
    .sort((a, b) => b.matchPct - a.matchPct);

  return (
    <>
      <ScreenHeader subtitle="Discover" title="Recipes" />
      <div className="px-5 flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="px-5 mt-3 space-y-3">
        {recipesQ.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!recipesQ.isLoading && list.length === 0 && (
          <div className="bg-card rounded-3xl p-8 text-center text-muted-foreground text-sm">
            No recipes yet. Ask an admin to add some.
          </div>
        )}
        {list.map((r) => (
          <Link key={r.id} to="/recipes/$id" params={{ id: r.id }} className="block bg-card rounded-3xl overflow-hidden">
            {r.image_url && <img src={r.image_url} alt={r.title} className="w-full h-40 object-cover" loading="lazy" />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-lg leading-tight">{r.title}</h3>
                <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${r.matchPct === 100 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {r.matchPct}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <Clock className="size-3" /> {r.prep_time_minutes} min · {r.total} ingredients
              </div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${r.matchPct}%` }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}