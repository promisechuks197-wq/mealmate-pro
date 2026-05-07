import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { AuthShell, Field, Divider } from "./login";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/home`, data: { name } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome to MealMate!");
    navigate({ to: "/home" });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/home" });
    if (result.error) toast.error(result.error.message);
    if (!result.redirected && !result.error) navigate({ to: "/home" });
  };

  return (
    <AuthShell title="Create your account">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name" value={name} onChange={setName} required />
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required />
        <button disabled={busy} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-medium disabled:opacity-60">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <Divider />
      <button onClick={google} className="w-full py-3 rounded-2xl border border-border">Continue with Google</button>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have one? <Link to="/login" className="text-primary underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}