import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Leaf, Sparkles, ChefHat, ShoppingBasket } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 pt-8 pb-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-2xl bg-primary text-primary-foreground grid place-items-center">
            <Leaf className="size-5" />
          </div>
          <span className="font-serif text-xl tracking-tight">MealMate</span>
        </div>
        <nav className="flex gap-2 text-sm">
          {user ? (
            <Link to="/home" className="px-4 py-2 rounded-full bg-primary text-primary-foreground">Open app</Link>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 rounded-full border border-border">Log in</Link>
              <Link to="/signup" className="px-4 py-2 rounded-full bg-primary text-primary-foreground">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-12 pb-24">
        <section className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-primary bg-card rounded-full px-3 py-1">
            <Sparkles className="size-3" /> Less waste. More flavor.
          </span>
          <h1 className="font-serif text-5xl md:text-6xl mt-6 leading-tight">
            Cook what you have.<br /><em className="text-primary not-italic">Waste nothing.</em>
          </h1>
          <p className="text-muted-foreground mt-5 text-lg">
            Track your fridge, plan your week, and discover meals you can make right now —
            from the ingredients already in your kitchen.
          </p>
          <div className="flex justify-center gap-3 mt-8">
            <Link to="/signup" className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium">
              Start cooking
            </Link>
            <Link to="/login" className="px-6 py-3 rounded-full border border-border">I have an account</Link>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4 mt-20">
          {[
            { icon: Leaf, title: "Smart inventory", desc: "Know what's expiring before it spoils." },
            { icon: ChefHat, title: "Recipes that match", desc: "We rank recipes by what's already in your kitchen." },
            { icon: ShoppingBasket, title: "Auto grocery list", desc: "Plan a meal — missing items appear in your list." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card rounded-3xl p-6">
              <Icon className="size-6 text-primary" />
              <h3 className="font-serif text-xl mt-3">{title}</h3>
              <p className="text-muted-foreground text-sm mt-2">{desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
