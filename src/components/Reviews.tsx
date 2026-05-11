import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Stars, StarPicker } from "./StarRating";
import { PenSquare, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
};

export function Reviews({ recipeId }: { recipeId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const reviewsQ = useQuery({
    queryKey: ["reviews", recipeId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("reviews")
        .select("id, reviewer_name, rating, comment, created_at, user_id")
        .eq("recipe_id", recipeId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Review[];
    },
  });

  const reviews = reviewsQ.data ?? [];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const recent = reviews.slice(0, 3);
  const userReview = reviews.find((r) => r.user_id === user?.id);

  return (
    <section className="mt-6">
      <div className="flex items-end justify-between">
        <h2 className="font-serif text-xl">Reviews</h2>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#FF6A00] hover:underline"
        >
          <PenSquare className="size-4" /> {userReview ? "Edit your review" : "Write a review"}
        </button>
      </div>

      <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-serif tabular-nums">{avg ? avg.toFixed(1) : "—"}</div>
          <div>
            <Stars value={avg} size={16} />
            <div className="text-xs text-muted-foreground mt-0.5">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {reviewsQ.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!reviewsQ.isLoading && recent.length === 0 && (
          <div className="text-sm text-muted-foreground">Be the first to review this dish.</div>
        )}
        {recent.map((r) => (
          <article key={r.id} className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/10 border border-amber-200/50 p-3">
            <header className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{r.reviewer_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </div>
              </div>
              <Stars value={r.rating} size={13} />
            </header>
            {r.comment && <p className="text-sm mt-2 leading-relaxed">{r.comment}</p>}
          </article>
        ))}
      </div>

      {open && (
        <ReviewModal
          recipeId={recipeId}
          existing={userReview}
          onClose={() => setOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["reviews", recipeId] });
            qc.invalidateQueries({ queryKey: ["recipes-list"] });
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}

function ReviewModal({
  recipeId,
  existing,
  onClose,
  onSaved,
}: {
  recipeId: string;
  existing?: Review;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [name, setName] = useState(existing?.reviewer_name ?? user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "");

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to leave a review");
      if (!name.trim()) throw new Error("Please enter your name");
      const payload = {
        recipe_id: recipeId,
        user_id: user.id,
        reviewer_name: name.trim(),
        rating,
        comment: comment.trim() || null,
      };
      const { error } = await (supabase as any)
        .from("reviews")
        .upsert(payload, { onConflict: "recipe_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(existing ? "Review updated" : "Thanks for your review!");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save review"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid items-end" onClick={onClose}>
      <div className="bg-background w-full max-w-md mx-auto rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-2xl">{existing ? "Edit your review" : "Write a review"}</h3>
          <button onClick={onClose} className="size-9 rounded-full bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <div className="mt-4 flex justify-center"><StarPicker value={rating} onChange={setRating} /></div>
        <label className="block mt-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-2xl border border-border bg-card text-sm"
            placeholder="e.g. Chiamaka"
          />
        </label>
        <label className="block mt-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Comment</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="mt-1 w-full px-4 py-3 rounded-2xl border border-border bg-card text-sm resize-none"
            placeholder="Share your experience…"
          />
        </label>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full mt-5 py-3 rounded-2xl bg-[#FF6A00] text-white font-medium disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Post review"}
        </button>
      </div>
    </div>
  );
}