import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MatchCard, type MatchRow } from "@/components/MatchCard";
import { useGameLock } from "@/lib/use-game-lock";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/games/$gameId/my-picks")({ component: MyPicksPage });

interface PickRow {
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  match: MatchRow | null;
}

function MyPicksPage() {
  const { gameId } = useParams({ from: "/_authenticated/games/$gameId/my-picks" });
  const { user } = useAuth();
  const { getLockAt, getRoundName } = useGameLock(gameId);

  const { data } = useQuery({
    queryKey: ["my-picks", gameId, user!.id],
    queryFn: async () => {
      const { data: preds, error } = await supabase.from("predictions")
        .select("match_id, home_score, away_score, points, match:matches(id, kickoff_at, status, home_score, away_score, stage, group_letter, home:teams!matches_home_team_id_fkey(code,name,flag_emoji), away:teams!matches_away_team_id_fkey(code,name,flag_emoji))")
        .eq("game_id", gameId).eq("user_id", user!.id);
      if (error) throw error;
      return preds as unknown as PickRow[];
    },
  });

  const exact = data?.filter((p) => p.points === 3).length ?? 0;
  const partial = data?.filter((p) => p.points === 1).length ?? 0;
  const wrong = data?.filter((p) => p.points === 0).length ?? 0;
  const total = (data ?? []).reduce((s, p) => s + (p.points ?? 0), 0);

  const groups = useMemo(() => {
    const rows = (data ?? []).filter((p) => p.match);
    rows.sort((a, b) => (a.match!.kickoff_at < b.match!.kickoff_at ? -1 : 1));
    const buckets = new Map<string, PickRow[]>();
    rows.forEach((p) => {
      const key = getRoundName(p.match!.id) ?? fallbackBucket(p.match!);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(p);
    });
    return Array.from(buckets.entries()).map(([name, list]) => ({ name, list }));
  }, [data, getRoundName]);

  const defaultOpen = useMemo(() => {
    const now = Date.now();
    const next = groups.find((g) => g.list.some((p) => new Date(p.match!.kickoff_at).getTime() > now));
    return next?.name ? [next.name] : groups[0]?.name ? [groups[0].name] : [];
  }, [groups]);

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
        <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
          {groups.map((g) => {
            const pts = g.list.reduce((s, p) => s + (p.points ?? 0), 0);
            return (
              <AccordionItem key={g.name} value={g.name} className="rounded-xl border bg-card px-3">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-3 pr-2">
                    <span className="text-sm font-semibold">{g.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {g.list.length} tips · <span className="text-gold">{pts}p</span>
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pb-2">
                    {g.list.map((p) => (
                      <MatchCard key={p.match_id} match={p.match as MatchRow} gameId={gameId} userId={user!.id}
                        prediction={{ home_score: p.home_score, away_score: p.away_score, points: p.points }}
                        lockAt={getLockAt(p.match_id)} roundName={getRoundName(p.match_id)} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

function fallbackBucket(m: MatchRow): string {
  if (m.stage === "group") return m.group_letter ? `Grupp ${m.group_letter}` : "Gruppspel";
  return "Slutspel";
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={"rounded-xl border bg-card p-3 " + (highlight ? "border-gold/40" : "")}>
      <div className={"text-2xl font-bold tabular-nums " + (highlight ? "text-gold" : "")}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
