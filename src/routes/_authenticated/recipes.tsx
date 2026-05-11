import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/MobileShell";
import { Clock, Flame, Search } from "lucide-react";
import { Stars } from "@/components/StarRating";

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
    queryFn: async () => (await (supabase as any).from("recipes").select("id, title, image_url, prep_time_minutes, tags, meal_type, difficulty, spice_level, recipe_ingredients(item_name), reviews(rating)")).data ?? [],
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
      <div className="px-5 mt-3">
        {recipesQ.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!recipesQ.isLoading && list.length === 0 && <div className="bg-card rounded-3xl p-8 text-center text-muted-foreground text-sm">No dishes match these filters.</div>}
        <div className="grid grid-cols-2 gap-3">
          {list.map((r: any) => (
            <Link key={r.id} to="/recipes/$id" params={{ id: r.id }} className="group block">
              <DishThumb title={r.title} image={r.image_url} mealType={r.meal_type} reviews={r.reviews ?? []} />
              <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-2 px-1">
                <span className="inline-flex items-center gap-0.5"><Clock className="size-3" /> {r.prep_time_minutes}m</span>
                <span className="inline-flex items-center gap-0.5"><Flame className="size-3" /> {r.spice_level}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function DishThumb({ title, image, mealType, reviews }: { title: string; image?: string | null; mealType?: string | null; reviews?: { rating: number }[] }) {
  const [failed, setFailed] = useState(!image);
  const avg = reviews && reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-primary to-secondary shadow-sm">
      {!failed && image && (
        <img
          src={image}
          alt={title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      {mealType && (
        <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background/85 text-foreground capitalize">
          {mealType}
        </span>
      )}
      {avg > 0 && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background/85 text-foreground">
          <Stars value={avg} size={10} /> {avg.toFixed(1)}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="font-serif text-base leading-tight text-white drop-shadow">{title}</h3>
      </div>
    </div>
  );
}
