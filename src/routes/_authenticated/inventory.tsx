import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ScreenHeader } from "@/components/MobileShell";
import { expiryStatus } from "@/lib/inventory-helpers";
import { format, parseISO } from "date-fns";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventory")({ component: Inventory });

function Inventory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["inventory", user!.id],
    queryFn: async () => (await supabase.from("inventory").select("*").eq("user_id", user!.id).order("expiry_date", { ascending: true, nullsFirst: false })).data ?? [],
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("inventory").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory", user!.id] }); toast.success("Removed"); },
  });
  return (
    <>
      <ScreenHeader subtitle="What's in your kitchen" title="Inventory"
        right={<Link to="/add" className="size-10 rounded-full bg-primary text-primary-foreground grid place-items-center"><Plus className="size-5" /></Link>} />
      <div className="px-5 space-y-2">
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="bg-card rounded-3xl p-8 text-center">
            <p className="text-muted-foreground">Your kitchen is empty.</p>
            <Link to="/add" className="inline-block mt-3 px-5 py-2 rounded-full bg-primary text-primary-foreground">Add your first item</Link>
          </div>
        )}
        {data?.map((item) => {
          const status = expiryStatus(item.expiry_date);
          return (
            <div key={item.id} className="bg-card rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium">{item.item_name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.qty} {item.unit} · {item.category}
                  {item.expiry_date && (
                    <span className={status === "expired" ? " text-destructive font-semibold" : status === "soon" ? " text-destructive" : ""}>
                      {" · "}{status === "expired" ? "Expired " : "Use by "}{format(parseISO(item.expiry_date), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => del.mutate(item.id)} className="text-muted-foreground hover:text-destructive p-2" aria-label="Remove"><Trash2 className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </>
  );
}
