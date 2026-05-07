import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto pb-28">{children}</div>
      <BottomNav />
    </div>
  );
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="px-5 pt-8 pb-4 flex items-end justify-between gap-3">
      <div>
        {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        <h1 className="font-serif text-3xl leading-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}