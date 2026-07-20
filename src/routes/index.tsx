import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Trophy, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/games" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-pitch">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="text-lg font-bold tracking-tight">⚽ VM-tipset</div>
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Logga in
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold">
            FIFA World Cup 2026
          </div>
          <h1 className="mt-4 text-5xl font-bold tracking-tight md:text-7xl">
            Tippa <span className="text-gradient-gold">VM</span>
            <br /> med vännerna.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Skapa en privat liga, bjud in dina vänner och tävla om vem som tippar mest rätt på alla
            104 matcher.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-gold px-6 py-3 font-semibold text-gold-foreground shadow-lg shadow-gold/20 transition hover:bg-gold/90"
            >
              Kom igång
            </Link>
            <Link to="/login" className="rounded-xl border px-6 py-3 font-semibold hover:bg-accent">
              Jag har redan konto
            </Link>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            <Feature
              icon={Users}
              title="Privata ligor"
              text="Skapa ett rum med invite-kod. Bara medlemmar ser tips."
            />
            <Feature
              icon={Trophy}
              title="Smart poäng"
              text="3 p exakt resultat, 1 p rätt utfall. Auto-räknat."
            />
            <Feature
              icon={Sparkles}
              title="Bonusfrågor"
              text="Hörnor, första målskytt och fler live-frågor."
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border bg-card/60 p-4 backdrop-blur">
      <Icon className="h-5 w-5 text-gold" />
      <div className="mt-2 font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{text}</div>
    </div>
  );
}
