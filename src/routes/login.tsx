import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    navigate({ to: "/home" });
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/home" });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/home",
    });
    if (result.error) toast.error(result.error.message);
    if (!result.redirected && !result.error) navigate({ to: "/home" });
  };

  return (
    <AuthShell title="Welcome back">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required />
        <button disabled={busy} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-medium disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <Divider />
      <button onClick={google} className="w-full py-3 rounded-2xl border border-border">
        Continue with Google
      </button>
      <p className="text-center text-sm text-muted-foreground mt-6">
        New here? <Link to="/signup" className="text-primary underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Link to="/" className="p-6 flex items-center gap-2">
        <div className="size-9 rounded-2xl bg-primary text-primary-foreground grid place-items-center">
          <Leaf className="size-5" />
        </div>
        <span className="font-serif text-xl">MealMate</span>
      </Link>
      <main className="flex-1 grid place-items-center px-6 pb-12">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-4xl mb-6">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

export function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-4 py-3 rounded-2xl border border-border bg-background outline-none focus:border-primary"
      />
    </label>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
    </div>
  );
}