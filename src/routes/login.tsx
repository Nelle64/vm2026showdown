import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const postLogin = () => {
    const pending = typeof window !== "undefined" ? localStorage.getItem("pending_invite") : null;
    if (pending) { navigate({ to: `/join/${pending}` }); return; }
    navigate({ to: "/games" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Välkommen tillbaka!");
    postLogin();
  };

  const onGoogle = async () => {
    const pending = typeof window !== "undefined" ? localStorage.getItem("pending_invite") : null;
    const target = pending ? `/join/${pending}` : "/games";
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + target });
    if (r.error) return toast.error(r.error.message);
    if (r.redirected) return;
    postLogin();
  };

  return (
    <div className="min-h-screen bg-pitch px-4 py-12">
      <div className="mx-auto max-w-sm">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Tillbaka</Link>
        <h1 className="mt-6 text-3xl font-bold">Logga in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Fortsätt med ditt konto.</p>

        <Button type="button" onClick={onGoogle} variant="outline" className="mt-8 w-full">
          Logga in med Google
        </Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> eller <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-post"
            className="h-11 w-full rounded-md border bg-card px-3 focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Lösenord"
            className="h-11 w-full rounded-md border bg-card px-3 focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" disabled={loading} className="h-11 w-full bg-gold text-gold-foreground hover:bg-gold/90">
            {loading ? "Loggar in..." : "Logga in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Har du inget konto? <Link to="/signup" className="text-gold hover:underline">Registrera dig</Link>
        </p>
      </div>
    </div>
  );
}
