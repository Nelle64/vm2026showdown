import { createFileRoute, Outlet, Link, useParams, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/games/$gameId")({ component: GameLayout });

function GameLayout() {
  const { gameId } = useParams({ from: "/_authenticated/games/$gameId" });
  const { user } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();

  const { data: game } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: membership } = useQuery({
    queryKey: ["membership", gameId, user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("game_members")
        .select("is_admin").eq("game_id", gameId).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const isAdmin = membership?.is_admin || game?.owner_id === user!.id;

  // Redirect /games/:id → /games/:id/matches
  if (loc.pathname === `/games/${gameId}` || loc.pathname === `/games/${gameId}/`) {
    navigate({ to: `/games/${gameId}/matches`, replace: true });
  }

  const tabs = [
    { to: `/games/${gameId}/matches`, label: "Matcher" },
    { to: `/games/${gameId}/my-picks`, label: "Mina tips" },
    { to: `/games/${gameId}/bonus`, label: "Bonus" },
    { to: `/games/${gameId}/leaderboard`, label: "Tabell" },
    ...(isAdmin ? [{ to: `/games/${gameId}/admin`, label: "Admin" }] : []),
  ];

  const copyCode = () => {
    if (!game) return;
    navigator.clipboard.writeText(game.invite_code);
    toast.success("Kod kopierad");
  };

  return (
    <div>
      <header className="mb-4">
        <Link to="/games" className="text-xs text-muted-foreground hover:text-foreground">← Mina spel</Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{game?.name ?? "..."}</h1>
            {game?.description && <p className="truncate text-sm text-muted-foreground">{game.description}</p>}
          </div>
          <button onClick={copyCode} className="flex shrink-0 items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs hover:border-gold/40">
            <span className="font-mono font-bold text-gold">{game?.invite_code}</span>
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="-mx-4 mb-4 overflow-x-auto px-4">
        <div className="flex gap-1 border-b">
          {tabs.map((t) => {
            const active = loc.pathname === t.to;
            return (
              <Link key={t.to} to={t.to} className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition",
                active ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
