import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DripDock" },
      { name: "description", content: "Sign in or create your DripDock wardrobe account." },
      { property: "og:title", content: "Sign in — DripDock" },
      { property: "og:description", content: "Access your DripDock wardrobe." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | "confirm" | "reset">(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/looks", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/looks", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const parsed =
      mode === "forgot"
        ? z.object({ email: schema.shape.email }).safeParse({ email })
        : schema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setFormError("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName.trim() || parsed.data.email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) await navigate({ to: "/looks", replace: true });
        else setSent("confirm");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password,
        });
        if (error) throw error;
        await navigate({ to: "/looks", replace: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not complete your request.";
      setFormError(
        /fetch|network|timeout|timed out/i.test(message)
          ? "DripDock could not connect. Check your connection and try again."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="display text-xl">
          DripDock
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="rise w-full max-w-sm">
          <span className="eyebrow">
            {mode === "signup" ? "New here" : mode === "forgot" ? "Recovery" : "Welcome back"}
          </span>
          <h1 className="mt-3 text-4xl">
            {mode === "signup"
              ? "Build your dock"
              : mode === "forgot"
                ? "Reset password"
                : "Sign in"}
          </h1>

          {sent ? (
            <div className="surface mt-8 p-6 text-sm text-muted-foreground" role="status">
              {sent === "confirm"
                ? "Check your inbox and spam folder. Confirm your email to finish creating your account, then return here to sign in."
                : "If that email exists, a reset link is on its way."}
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate aria-busy={busy} className="mt-8 space-y-4">
              {formError && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {formError}
                </p>
              )}
              {mode === "signup" ? (
                <div className="space-y-2">
                  <Label htmlFor="display-name">Name</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    maxLength={80}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex"
                    className="rounded-lg bg-card"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  maxLength={255}
                  required
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="rounded-lg bg-card"
                />
              </div>
              {mode !== "forgot" ? (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    maxLength={72}
                    required
                    disabled={busy}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-lg bg-card"
                  />
                </div>
              ) : null}
              <Button type="submit" disabled={busy} size="lg" className="w-full rounded-full">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {busy
                  ? "Please wait…"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Sign in"}
              </Button>
            </form>
          )}

          <div className="mt-8 space-y-2 text-sm text-muted-foreground">
            {mode !== "signup" ? (
              <button
                disabled={busy}
                className="underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("signup");
                  setSent(null);
                  setFormError(null);
                }}
              >
                Don't have an account? Create one
              </button>
            ) : (
              <button
                disabled={busy}
                className="underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("signin");
                  setSent(null);
                  setFormError(null);
                }}
              >
                Already have an account? Sign in
              </button>
            )}
            {mode !== "forgot" ? (
              <button
                disabled={busy}
                className="block underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("forgot");
                  setSent(null);
                  setFormError(null);
                }}
              >
                Forgot your password?
              </button>
            ) : (
              <button
                disabled={busy}
                className="block underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("signin");
                  setSent(null);
                  setFormError(null);
                }}
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
