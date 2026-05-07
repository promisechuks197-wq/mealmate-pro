import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ScreenHeader } from "@/components/MobileShell";
import { greeting, expiryStatus, normalize } from "@/lib/inventory-helpers";
import { format } from "date-fns";
import { ChefHat, AlertTriangle, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({ component: Home });

function Home() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const inventoryQ = useQuery({
    queryKey: ["inventory", user!.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory").select("*").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

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

  const planQ = useQuery({
    queryKey: ["plan-today", user!.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan")
        .select("meal_slot, recipe:recipes(id, title, image_url)")
        .eq("user_id", user!.id)
        .eq("date", today);
      if (error) throw error;
      return data;
    },
  });

  const profile = useQuery({
    queryKey: ["profile", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const inv = inventoryQ.data ?? [];
  const invNames = new Set(inv.filter((i) => Number(i.qty) > 0).map((i) => normalize(i.item_name)));
  const cookable = (recipesQ.data ?? []).filter((r) => {
    const ings = r.recipe_ingredients as { item_name: string }[];
    return ings.length > 0 && ings.every((ing) => invNames.has(normalize(ing.item_name)));
  });
  const expiring = inv.filter((i) => expiryStatus(i.expiry_date) === "soon" || expiryStatus(i.expiry_date) === "expired");
  const slotMap = Object.fromEntries((planQ.data ?? []).map((p) => [p.meal_slot, p.recipe]));

  return (
    <>
      <ScreenHeader subtitle={greeting() + ","} title={profile.data?.name ?? "Friend"} />

      <section className="px-5">
        <Link to="/recipes" className="block bg-primary text-primary-foreground rounded-3xl p-5">
          <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
            <ChefHat className="size-4" /> Cookable now
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-5xl">{cookable.length}</span>
            <span className="text-primary-foreground/80">meal{cookable.length === 1 ? "" : "s"} ready</span>
          </div>
          <p className="text-primary-foreground/70 text-sm mt-2">
            {cookable.length > 0 ? "Tap to see what you can make right now." : "Add recipes and inventory to unlock matches."}
          </p>
        </Link>
      </section>

      {expiring.length > 0 && (
        <section className="px-5 mt-4">
          <Link to="/inventory" className="bg-card rounded-3xl p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-destructive/10 text-destructive grid place-items-center">
              <AlertTriangle className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{expiring.length} item{expiring.length === 1 ? "" : "s"} expiring soon</div>
              <div className="text-xs text-muted-foreground">Use them before they spoil.</div>
            </div>
          </Link>
        </section>
      )}

      <section className="px-5 mt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Calendar className="size-4" /> Today's plan
        </div>
        <div className="space-y-2">
          {(["breakfast", "lunch", "dinner"] as const).map((slot) => {
            const r = slotMap[slot];
            return (
              <div key={slot} className="bg-card rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{slot}</div>
                  <div className="font-medium mt-0.5">{r ? (r as any).title : <span className="text-muted-foreground">No meal planned</span>}</div>
                </div>
                <Link to="/plan" className="text-sm text-primary">{r ? "Change" : "Plan"}</Link>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}