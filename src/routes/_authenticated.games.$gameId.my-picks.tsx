import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MatchCard, type MatchRow } from "@/components/MatchCard";

export const Route = createFileRoute("/_authenticated/games/$gameId/my-picks")({ component: MyPicksPage });

function MyPicksPage() {
  const { gameId } = useParams({ from: "/_authenticated/games/$gameId/my-picks" });
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["my-picks", gameId, user!.id],
    queryFn: async () => {
      const { data: preds, error } = await supabase.from("predictions")
        .select("match_id, home_score, away_score, points, match:matches(id, kickoff_at, status, home_score, away_score, stage, group_letter, home:teams!matches_home_team_id_fkey(code,name,flag_emoji), away:teams!matches_away_team_id_fkey(code,name,flag_emoji))")
        .eq("game_id", gameId).eq("user_id", user!.id);
      if (error) throw error;
      return preds;
    },
  });

  const exact = data?.filter((p) => p.points === 3).length ?? 0;
  const partial = data?.filter((p) => p.points === 1).length ?? 0;
  const wrong = data?.filter((p) => p.points === 0).length ?? 0;
  const total = (data ?? []).reduce((s, p) => s + (p.points ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Poäng" value={total} highlight />
        <Stat label="Exakta" value={exact} />
        <Stat label="Utfall" value={partial} />
        <Stat label="Fel" value={wrong} />
      </div>

      {!data?.length ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Du har inte tippat något ännu.</div>
      ) : (
        <div className="space-y-3">
          {data.map((p: any) => p.match && (
            <MatchCard key={p.match_id} match={p.match as MatchRow} gameId={gameId} userId={user!.id}
              prediction={{ home_score: p.home_score, away_score: p.away_score, points: p.points }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={"rounded-xl border bg-card p-3 " + (highlight ? "border-gold/40" : "")}>
      <div className={"text-2xl font-bold tabular-nums " + (highlight ? "text-gold" : "")}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
