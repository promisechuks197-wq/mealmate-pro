import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ScreenHeader } from "@/components/MobileShell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/add")({ component: Add });

const cats = [
  { value: "fridge", label: "Fridge", emoji: "🧊" },
  { value: "pantry", label: "Pantry", emoji: "🥫" },
  { value: "freezer", label: "Freezer", emoji: "❄️" },
] as const;

function Add() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [category, setCategory] = useState<"fridge"|"pantry"|"freezer">("fridge");
  const [expiry, setExpiry] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inventory").insert({
        user_id: user!.id, item_name: name.trim(), qty: Number(qty), unit, category, expiry_date: expiry || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${name} added`); qc.invalidateQueries({ queryKey: ["inventory", user!.id] }); nav({ to: "/inventory" }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <ScreenHeader subtitle="Quick add" title="New item" />
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="px-5 space-y-4">
        <Inp label="Item" value={name} onChange={setName} placeholder="e.g. Tomatoes" required />
        <div className="grid grid-cols-2 gap-3">
          <Inp label="Quantity" value={qty} onChange={setQty} type="number" />
          <Inp label="Unit" value={unit} onChange={setUnit} placeholder="pcs, g, ml" />
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Storage</span>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {cats.map((c) => (
              <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                className={`py-3 rounded-2xl border text-sm ${category === c.value ? "border-primary bg-primary/5 text-primary" : "border-border bg-card"}`}>
                <div className="text-xl">{c.emoji}</div>{c.label}
              </button>
            ))}
          </div>
        </div>
        <Inp label="Expiry date" value={expiry} onChange={setExpiry} type="date" />
        <button type="submit" disabled={m.isPending || !name} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-medium disabled:opacity-60">
          {m.isPending ? "Adding…" : "Add to inventory"}
        </button>
      </form>
    </>
  );
}

function Inp({ label, value, onChange, type = "text", placeholder, required }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <input type={type} required={required} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-4 py-3 rounded-2xl border border-border bg-card outline-none focus:border-primary" />
    </label>
  );
}