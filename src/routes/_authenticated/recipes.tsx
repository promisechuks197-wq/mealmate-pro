import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/MobileShell";
import { Clock, Flame, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recipes")({ component: Recipes });

const MEAL_TABS = [
  { key: "all", label: "All" },
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
] as const;
const TIME_FILTERS = [
  { key: "any", label: "Any time" },
  { key: "30", label: "≤ 30 min" },
  { key: "60", label: "≤ 60 min" },
] as const;
const SPICE_FILTERS = ["any", "Mild", "Medium", "Hot"] as const;

function Recipes() {
  const matchRoute = useMatchRoute();
  const isDetail = matchRoute({ to: "/_authenticated/recipes/$id" as any, fuzzy: true });
  if (isDetail) return <Outlet />;
  const [meal, setMeal] = useState<(typeof MEAL_TABS)[number]["key"]>("all");
  const [time, setTime] = useState<(typeof TIME_FILTERS)[number]["key"]>("any");
  const [spice, setSpice] = useState<(typeof SPICE_FILTERS)[number]>("any");
  const [q, setQ] = useState("");
  const recipesQ = useQuery({
    queryKey: ["recipes-list"],
    queryFn: async () => (await supabase.from("recipes").select("id, title, image_url, prep_time_minutes, tags, meal_type, difficulty, spice_level, recipe_ingredients(item_name)")).data ?? [],
  });
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (recipesQ.data ?? []).filter((r: any) => {
      if (meal !== "all" && r.meal_type !== meal) return false;
      if (time === "30" && r.prep_time_minutes > 30) return false;
      if (time === "60" && r.prep_time_minutes > 60) return false;
      if (spice !== "any" && r.spice_level !== spice) return false;
      if (needle) {
        const inTitle = r.title.toLowerCase().includes(needle);
        const inIng = (r.recipe_ingredients as any[]).some((i) => i.item_name.toLowerCase().includes(needle));
        if (!inTitle && !inIng) return false;
      }
      return true;
    });
  }, [recipesQ.data, meal, time, spice, q]);

  return (
    <>
      <ScreenHeader subtitle="Naija kitchen" title="Recipes" />
      <div className="px-5">
        <div className="relative">
          <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dish or ingredient…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-card outline-none focus:border-primary text-sm" />
        </div>
      </div>
      <div className="px-5 mt-3 flex gap-2 overflow-x-auto pb-1">
        {MEAL_TABS.map((f) => (
          <button key={f.key} onClick={() => setMeal(f.key)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${meal === f.key ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>{f.label}</button>
        ))}
      </div>
      <div className="px-5 mt-2 flex gap-2 overflow-x-auto pb-1">
        {TIME_FILTERS.map((t) => (
          <button key={t.key} onClick={() => setTime(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${time === t.key ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}>{t.label}</button>
        ))}
        {SPICE_FILTERS.map((s) => (
          <button key={s} onClick={() => setSpice(s)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap capitalize ${spice === s ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}>{s === "any" ? "Any spice" : s}</button>
        ))}
      </div>
      <div className="px-5 mt-3 space-y-3">
        {recipesQ.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!recipesQ.isLoading && list.length === 0 && <div className="bg-card rounded-3xl p-8 text-center text-muted-foreground text-sm">No dishes match these filters.</div>}
        {list.map((r: any) => (
          <Link key={r.id} to="/recipes/$id" params={{ id: r.id }} className="block bg-card rounded-3xl overflow-hidden">
            {r.image_url ? (
              <img src={r.image_url} alt={r.title} className="w-full h-40 object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-secondary/20 grid place-items-center text-4xl">🍲</div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-lg leading-tight">{r.title}</h3>
                {r.meal_type && <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">{r.meal_type}</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {r.prep_time_minutes} min</span>
                <span>· {r.difficulty}</span>
                <span className="inline-flex items-center gap-1"><Flame className="size-3" /> {r.spice_level}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
