import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Ing = { id?: string; item_name: string; qty: number; unit: string };
const TAGS = ["quick","vegetarian","low_carb","gluten_free"];

export function RecipeForm({ recipeId }: { recipeId?: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prep, setPrep] = useState(15);
  const [instructions, setInstructions] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [ings, setIngs] = useState<Ing[]>([{ item_name: "", qty: 1, unit: "pcs" }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!recipeId) return;
    supabase.from("recipes").select("*, recipe_ingredients(*)").eq("id", recipeId).maybeSingle().then(({ data }) => {
      if (!data) return;
      setTitle(data.title); setImageUrl(data.image_url ?? ""); setPrep(data.prep_time_minutes);
      setInstructions(data.instructions ?? ""); setTags(data.tags ?? []);
      setIngs((data.recipe_ingredients as any[]).map((i) => ({ id: i.id, item_name: i.item_name, qty: Number(i.qty), unit: i.unit })));
    });
  }, [recipeId]);

  const upload = async (file: File) => {
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("recipe-images").upload(path, file);
    if (error) return toast.error(error.message);
    setImageUrl(supabase.storage.from("recipe-images").getPublicUrl(path).data.publicUrl);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      let id = recipeId;
      const payload = { title, image_url: imageUrl || null, prep_time_minutes: prep, instructions, tags, created_by: user!.id };
      if (id) {
        const { error } = await supabase.from("recipes").update(payload).eq("id", id); if (error) throw error;
        await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
      } else {
        const { data, error } = await supabase.from("recipes").insert(payload).select("id").single(); if (error) throw error; id = data.id;
      }
      const rows = ings.filter((i) => i.item_name.trim()).map((i) => ({ recipe_id: id!, item_name: i.item_name.trim(), qty: i.qty, unit: i.unit }));
      if (rows.length) await supabase.from("recipe_ingredients").insert(rows);
      toast.success("Saved"); nav({ to: "/admin/recipes" });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="px-5 space-y-4">
      <F label="Title" value={title} onChange={setTitle} required />
      <div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Image</span>
        {imageUrl && <img src={imageUrl} alt="" className="mt-1 w-full h-40 object-cover rounded-2xl" />}
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="mt-2 text-sm" />
      </div>
      <F label="Prep time (min)" type="number" value={String(prep)} onChange={(v) => setPrep(Number(v))} />
      <div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Tags</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {TAGS.map((t) => (
            <button key={t} type="button" onClick={() => setTags((c) => c.includes(t) ? c.filter((x) => x !== t) : [...c, t])}
              className={`px-3 py-1.5 rounded-full text-sm ${tags.includes(t) ? "bg-primary text-primary-foreground" : "bg-card"}`}>{t.replace("_"," ")}</button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Ingredients</span>
        <div className="space-y-2 mt-1">
          {ings.map((ing, idx) => (
            <div key={idx} className="flex gap-2">
              <input className="flex-1 px-3 py-2 rounded-xl border border-border bg-card" placeholder="Name" value={ing.item_name}
                onChange={(e) => setIngs((c) => c.map((x,i) => i===idx ? {...x, item_name: e.target.value} : x))} />
              <input type="number" step="0.1" className="w-16 px-2 py-2 rounded-xl border border-border bg-card" value={ing.qty}
                onChange={(e) => setIngs((c) => c.map((x,i) => i===idx ? {...x, qty: Number(e.target.value)} : x))} />
              <input className="w-16 px-2 py-2 rounded-xl border border-border bg-card" value={ing.unit}
                onChange={(e) => setIngs((c) => c.map((x,i) => i===idx ? {...x, unit: e.target.value} : x))} />
              <button type="button" onClick={() => setIngs((c) => c.filter((_,i) => i!==idx))} className="p-2 text-destructive"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setIngs((c) => [...c, { item_name: "", qty: 1, unit: "pcs" }])} className="text-sm text-primary inline-flex items-center gap-1"><Plus className="size-4" /> Add ingredient</button>
        </div>
      </div>
      <div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Instructions</span>
        <textarea className="mt-1 w-full px-4 py-3 rounded-2xl border border-border bg-card min-h-32" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>
      <button disabled={busy} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-medium disabled:opacity-60">{busy ? "Saving…" : "Save recipe"}</button>
    </form>
  );
}

function F({ label, value, onChange, type = "text", required }: any) {
  return (<label className="block"><span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-2xl border border-border bg-card outline-none focus:border-primary" /></label>);
}
