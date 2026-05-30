import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MatchCard, type MatchRow } from "@/components/MatchCard";
import { useGameLock } from "@/lib/use-game-lock";

export const Route = createFileRoute("/_authenticated/games/$gameId/matches")({ component: MatchesPage });

function MatchesPage() {
  const { gameId } = useParams({ from: "/_authenticated/games/$gameId/matches" });
  const { user } = useAuth();
  const { getLockAt, getRoundName } = useGameLock(gameId);

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches")
        .select("id, kickoff_at, status, home_score, away_score, stage, group_letter, home:teams!matches_home_team_id_fkey(code,name,flag_emoji), away:teams!matches_away_team_id_fkey(code,name,flag_emoji)")
        .order("kickoff_at");
      if (error) throw error;
      return data as unknown as MatchRow[];
    },
  });

  const { data: predictions } = useQuery({
    queryKey: ["predictions", gameId, user!.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("predictions")
        .select("match_id, home_score, away_score, points").eq("game_id", gameId).eq("user_id", user!.id);
      if (error) throw error;
      const map = new Map<string, { home_score: number; away_score: number; points: number | null }>();
      data.forEach((p) => map.set(p.match_id, p));
      return map;
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Laddar matcher...</div>;
  if (!matches?.length) return <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Inga matcher ännu.</div>;

  // Gruppera per dag
  const groups: Record<string, MatchRow[]> = {};
  matches.forEach((m) => {
    const d = new Date(m.kickoff_at).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
    groups[d] = groups[d] ?? [];
    groups[d].push(m);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day}</h2>
          <div className="space-y-3">
            {list.map((m) => (
              <MatchCard key={m.id} match={m} gameId={gameId} userId={user!.id} prediction={predictions?.get(m.id) ?? null} lockAt={getLockAt(m.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
