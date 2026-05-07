import { Link, useLocation } from "@tanstack/react-router";
import { Home, Calendar, Plus, ChefHat, User } from "lucide-react";

const tabs = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/plan", icon: Calendar, label: "Plan" },
  { to: "/add", icon: Plus, label: "Add", primary: true },
  { to: "/recipes", icon: ChefHat, label: "Recipes" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border">
      <div className="max-w-md mx-auto grid grid-cols-5 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {tabs.map(({ to, icon: Icon, label, primary }) => {
          const active = loc.pathname.startsWith(to);
          if (primary) {
            return (
              <Link key={to} to={to} className="grid place-items-center" aria-label={label}>
                <span className="size-12 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-lg -mt-6">
                  <Icon className="size-6" />
                </span>
              </Link>
            );
          }
          return (
            <Link key={to} to={to} className="flex flex-col items-center gap-0.5 py-2" aria-current={active ? "page" : undefined}>
              <Icon className={`size-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] ${active ? "text-primary font-medium" : "text-muted-foreground"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}