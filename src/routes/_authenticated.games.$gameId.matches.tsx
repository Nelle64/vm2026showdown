import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MatchCard, type MatchRow } from "@/components/MatchCard";
import { useGameLock } from "@/lib/use-game-lock";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMemo } from "react";

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

  const groups = useMemo(() => {
    if (!matches) return [];
    const buckets = new Map<string, MatchRow[]>();
    matches.forEach((m) => {
      const key = getRoundName(m.id) ?? fallbackBucket(m);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(m);
    });
    return Array.from(buckets.entries()).map(([name, list]) => {
      const unpicked = list.filter((m) => !predictions?.get(m.id) && m.status === "scheduled").length;
      return {
        name,
        list,
        earliest: list[0]?.kickoff_at ?? "",
        tippable: list.some((m) => m.status === "scheduled"),
        unpicked,
      };
    });
  }, [matches, getRoundName, predictions]);


  const defaultOpen = useMemo(() => {
    const now = Date.now();
    const next = groups.find((g) => g.list.some((m) => new Date(m.kickoff_at).getTime() > now));
    return next?.name ? [next.name] : groups[0]?.name ? [groups[0].name] : [];
  }, [groups]);

  if (isLoading) return <div className="text-muted-foreground">Laddar matcher...</div>;
  if (!matches?.length) return <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Inga matcher ännu.</div>;

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
      {groups.map((g) => (
        <AccordionItem key={g.name} value={g.name} className="rounded-xl border bg-card px-3">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-sm font-semibold">{g.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {g.list.length} matcher
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-2">
              {g.list.map((m) => (
                <MatchCard key={m.id} match={m} gameId={gameId} userId={user!.id} prediction={predictions?.get(m.id) ?? null} lockAt={getLockAt(m.id)} roundName={getRoundName(m.id)} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function fallbackBucket(m: MatchRow): string {
  if (m.stage === "group") return m.group_letter ? `Grupp ${m.group_letter}` : "Gruppspel";
  return "Slutspel";
}
