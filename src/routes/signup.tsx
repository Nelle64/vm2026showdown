import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Lösenord måste vara minst 6 tecken");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/games` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Konto skapat!");
    navigate({ to: "/games" });
  };

  const onGoogle = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/games" });
    if (r.error) return toast.error(r.error.message);
    if (r.redirected) return;
    navigate({ to: "/games" });
  };

  return (
    <div className="min-h-screen bg-pitch px-4 py-12">
      <div className="mx-auto max-w-sm">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Tillbaka</Link>
        <h1 className="mt-6 text-3xl font-bold">Skapa konto</h1>
        <p className="mt-1 text-sm text-muted-foreground">Börja tippa på 30 sekunder.</p>

        <Button type="button" onClick={onGoogle} variant="outline" className="mt-8 w-full">
          Fortsätt med Google
        </Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> eller <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Visningsnamn" maxLength={40}
            className="h-11 w-full rounded-md border bg-card px-3 focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-post"
            className="h-11 w-full rounded-md border bg-card px-3 focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Lösenord (min 6 tecken)"
            className="h-11 w-full rounded-md border bg-card px-3 focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" disabled={loading} className="h-11 w-full bg-gold text-gold-foreground hover:bg-gold/90">
            {loading ? "Skapar..." : "Skapa konto"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Har du redan konto? <Link to="/login" className="text-gold hover:underline">Logga in</Link>
        </p>
      </div>
    </div>
  );
}
