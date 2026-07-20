import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PredictionsMatrix } from "@/components/PredictionsMatrix";
import { fetchAllPages } from "@/lib/supabase-pagination";

export const Route = createFileRoute("/_authenticated/games/$gameId/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { gameId } = useParams({ from: "/_authenticated/games/$gameId/leaderboard" });
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`lb-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions", filter: `game_id=eq.${gameId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["leaderboard", gameId] });
          qc.invalidateQueries({ queryKey: ["predictions-matrix", gameId] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "bonus_answers" }, () =>
        qc.invalidateQueries({ queryKey: ["leaderboard", gameId] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () =>
        qc.invalidateQueries({ queryKey: ["leaderboard", gameId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, qc]);

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", gameId],
    queryFn: async () => {
      // hämta medlemmar + deras predictions/bonus i detta spel
      const { data: members, error } = await supabase
        .from("game_members")
        .select("user_id")
        .eq("game_id", gameId);
      if (error) throw error;

      const userIds = (members ?? []).map((m: any) => m.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
        : { data: [] as any[] };
      const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      const preds = userIds.length
        ? await fetchAllPages<{ user_id: string; points: number | null }>((from, to) =>
            supabase
              .from("predictions")
              .select("user_id, points")
              .eq("game_id", gameId)
              .in("user_id", userIds)
              .order("created_at", { ascending: true })
              .order("id", { ascending: true })
              .range(from, to),
          )
        : [];
      const { data: bonus } = await supabase
        .from("bonus_answers")
        .select("user_id, points, question:bonus_questions!inner(game_id)")
        .eq("question.game_id", gameId)
        .in("user_id", userIds);

      type Row = {
        user_id: string;
        name: string;
        avatar: string | null;
        total: number;
        bonus: number;
        exact: number;
        outcome: number;
        wrong: number;
        picks: number;
        accuracy: number;
      };
      const rows: Row[] = (members ?? []).map((m: any) => {
        const prof = profMap.get(m.user_id);

        const myPreds = preds.filter((p: any) => p.user_id === m.user_id);
        const myBonus = (bonus ?? []).filter((b: any) => b.user_id === m.user_id);
        const scored = myPreds.filter((p: any) => p.points !== null);
        const exact = myPreds.filter((p: any) => p.points === 3).length;
        const outcome = myPreds.filter((p: any) => p.points === 1).length;
        const wrong = myPreds.filter((p: any) => p.points === 0).length;
        const mainPts = myPreds.reduce((s: number, p: any) => s + (p.points ?? 0), 0);
        const bonusPts = myBonus.reduce((s: number, p: any) => s + (p.points ?? 0), 0);
        return {
          user_id: m.user_id,
          name: prof?.display_name ?? "Okänd",
          avatar: prof?.avatar_url ?? null,

          total: mainPts,
          bonus: bonusPts,
          exact,
          outcome,
          wrong,
          picks: myPreds.length,
          accuracy: scored.length ? Math.round(((exact + outcome) / scored.length) * 100) : 0,
        };
      });
      rows.sort((a, b) => b.total - a.total || b.exact - a.exact);
      return rows;
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Laddar tabell...</div>;

  const bonusRows = data ? [...data].sort((a, b) => b.bonus - a.bonus) : [];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Poängställning – matcher
        </h2>
        <div className="space-y-2">
          {data?.map((r, i) => (
            <div
              key={r.user_id}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card p-3",
                r.user_id === user!.id && "border-gold/50 bg-gold/5",
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {i === 0 ? (
                  <Trophy className="h-5 w-5 text-gold" />
                ) : i === 1 ? (
                  <Medal className="h-5 w-5 text-muted-foreground" />
                ) : i === 2 ? (
                  <Medal className="h-5 w-5 text-amber-700" />
                ) : (
                  <span className="text-muted-foreground">{i + 1}</span>
                )}
              </div>
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                {r.avatar ? (
                  <img src={r.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                    {r.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {r.name}
                  {r.user_id === user!.id ? " (du)" : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.exact} exakt · {r.outcome} utfall · {r.wrong} fel · {r.accuracy}% träff
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold tabular-nums text-gold">{r.total}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  poäng
                </div>
              </div>
            </div>
          ))}
          {!data?.length && (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              Inga medlemmar ännu.
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Poängställning – bonusfrågor
        </h2>
        <div className="space-y-2">
          {bonusRows.map((r, i) => (
            <div
              key={r.user_id}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card p-3",
                r.user_id === user!.id && "border-gold/50 bg-gold/5",
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {i === 0 ? (
                  <Trophy className="h-5 w-5 text-gold" />
                ) : i === 1 ? (
                  <Medal className="h-5 w-5 text-muted-foreground" />
                ) : i === 2 ? (
                  <Medal className="h-5 w-5 text-amber-700" />
                ) : (
                  <span className="text-muted-foreground">{i + 1}</span>
                )}
              </div>
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                {r.avatar ? (
                  <img src={r.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                    {r.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {r.name}
                  {r.user_id === user!.id ? " (du)" : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold tabular-nums text-gold">{r.bonus}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  bonus
                </div>
              </div>
            </div>
          ))}
          {!bonusRows.length && (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Inga bonuspoäng ännu.
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Allas gissningar
        </h2>
        <PredictionsMatrix gameId={gameId} />
      </section>
    </div>
  );
}
