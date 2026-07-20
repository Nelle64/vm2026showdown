import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/supabase-pagination";
import { Trophy, Zap, Clock, Target, Crosshair, Ghost, Sparkles, TrendingUp, TrendingDown, Repeat, Award, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/games/$gameId/summary")({ component: SummaryPage });

type Profile = { id: string; display_name: string | null; avatar_url: string | null };
type Pred = { user_id: string; match_id: string; home_score: number; away_score: number; points: number | null; created_at: string };
type Match = { id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null };
type Bonus = { user_id: string; points: number | null };

function SummaryPage() {
  const { gameId } = useParams({ from: "/_authenticated/games/$gameId/summary" });

  const { data, isLoading } = useQuery({
    queryKey: ["summary", gameId],
    queryFn: async () => {
      const { data: members } = await supabase.from("game_members").select("user_id").eq("game_id", gameId);
      const userIds = (members ?? []).map((m: any) => m.user_id);
      if (!userIds.length) return null;

      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
      const profMap = new Map<string, Profile>((profiles ?? []).map((p: any) => [p.id, p]));

      const preds = await fetchAllPages<Pred>((from, to) => supabase.from("predictions")
        .select("user_id, match_id, home_score, away_score, points, created_at")
        .eq("game_id", gameId).in("user_id", userIds)
        .order("created_at", { ascending: true }).order("id", { ascending: true }).range(from, to));

      const { data: matches } = await supabase.from("matches")
        .select("id, kickoff_at, status, home_score, away_score");
      const matchMap = new Map<string, Match>((matches ?? []).map((m: any) => [m.id, m]));
      const finishedMatches = (matches ?? []).filter((m: any) => m.status === "finished");

      const { data: bonusRows } = await supabase.from("bonus_answers")
        .select("user_id, points, question:bonus_questions!inner(game_id)")
        .eq("question.game_id", gameId).in("user_id", userIds);
      const bonus = (bonusRows ?? []) as unknown as Bonus[];

      return { userIds, profMap, preds, matches: matches ?? [], matchMap, finishedMatches, bonus };
    },
  });

  const facts = useMemo(() => data ? computeFacts(data) : null, [data]);

  if (isLoading || !facts) {
    return <div className="text-muted-foreground">Laddar sammanfattning…</div>;
  }

  if (!facts.rows.length) {
    return <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Ingen data att summera ännu.</div>;
  }

  const [gold, silver, bronze] = facts.rows;

  return (
    <div className="space-y-8 pb-24">
      {/* Hero */}
      <section className="rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/10 to-transparent p-5 text-center">
        <div className="mb-1 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          <Sparkles className="h-3.5 w-3.5" /> VM 2026 – Sammanfattning <Sparkles className="h-3.5 w-3.5" />
        </div>
        <h1 className="text-2xl font-bold">Så gick det!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {facts.finishedCount} matcher spelade · {facts.totalPreds} tips · {facts.rows.length} spelare
        </p>
      </section>

      {/* Podium */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Podium</h2>
        <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
          <PodiumSlot row={silver} place={2} height="h-28" />
          <PodiumSlot row={gold} place={1} height="h-36" />
          <PodiumSlot row={bronze} place={3} height="h-20" />
        </div>
      </section>

      {/* Fun facts */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fun facts</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FactCard icon={<Target className="h-5 w-5" />} title="Mest exakta" subtitle="Flest 3-poängare"
            winner={facts.mostExact} value={facts.mostExact && `${facts.mostExact.value} exakta`} tint="gold" />
          <FactCard icon={<Crosshair className="h-5 w-5" />} title="Bäst pricksäkerhet" subtitle="Andel exakt eller rätt utfall"
            winner={facts.bestAccuracy} value={facts.bestAccuracy && `${facts.bestAccuracy.value}%`} tint="gold" />
          <FactCard icon={<Zap className="h-5 w-5" />} title="Snabbast på avtryckaren" subtitle="Först in med sitt tips flest gånger"
            winner={facts.mostFirst} value={facts.mostFirst && `${facts.mostFirst.value} matcher först`} />
          <FactCard icon={<Clock className="h-5 w-5" />} title="Sista minuten-tippare" subtitle="Kortast snittid före avspark"
            winner={facts.latest} value={facts.latest && formatDuration(facts.latest.value)} />
          <FactCard icon={<Award className="h-5 w-5" />} title="Långtidsplanerare" subtitle="Längst snittid före avspark"
            winner={facts.earliest} value={facts.earliest && formatDuration(facts.earliest.value)} />
          <FactCard icon={<Ghost className="h-5 w-5" />} title="Slarvern" subtitle="Missade flest matcher"
            winner={facts.mostMissed} value={facts.mostMissed && `${facts.mostMissed.value} missade`} tint="muted" />
          <FactCard icon={<Flame className="h-5 w-5" />} title="Målsnöret" subtitle="Flest tips 1 mål från exakt resultat"
            winner={facts.mostNearMiss} value={facts.mostNearMiss && `${facts.mostNearMiss.value} nära`} />
          <FactCard icon={<TrendingUp className="h-5 w-5" />} title="Optimisten" subtitle="Högst snitt mål per tips"
            winner={facts.optimist} value={facts.optimist && `${facts.optimist.value.toFixed(2)} mål/tips`} />
          <FactCard icon={<TrendingDown className="h-5 w-5" />} title="Pessimisten" subtitle="Lägst snitt mål per tips"
            winner={facts.pessimist} value={facts.pessimist && `${facts.pessimist.value.toFixed(2)} mål/tips`} />
          <FactCard icon={<Repeat className="h-5 w-5" />} title="Favoritresultatet" subtitle="Mest tippade slutresultatet totalt"
            winner={null} value={facts.favoriteScore && `${facts.favoriteScore.score} (${facts.favoriteScore.count} ggr)`} />
          <FactCard icon={<Trophy className="h-5 w-5" />} title="Bonuskungen" subtitle="Mest bonuspoäng"
            winner={facts.bonusKing} value={facts.bonusKing && `${facts.bonusKing.value} p`} tint="gold" />
          <FactCard icon={<Target className="h-5 w-5" />} title="Utfallsmästaren" subtitle="Flest rätt utfall (1p)"
            winner={facts.mostOutcome} value={facts.mostOutcome && `${facts.mostOutcome.value} utfall`} />
        </div>
      </section>

      {/* Slutställning */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slutställning</h2>
        <div className="space-y-2">
          {facts.rows.map((r, i) => (
            <div key={r.user_id} className={cn("flex items-center gap-3 rounded-xl border bg-card p-3",
              i === 0 && "border-gold/50 bg-gold/5")}>
              <div className="w-6 text-center text-sm font-bold text-muted-foreground tabular-nums">{i + 1}</div>
              <Avatar profile={r.profile} size={9} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.profile?.display_name ?? "Okänd"}</div>
                <div className="text-xs text-muted-foreground">
                  {r.exact} exakt · {r.outcome} utfall · {r.wrong} fel{r.missed ? ` · ${r.missed} miss` : ""} · {r.accuracy}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold tabular-nums text-gold">{r.total}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">poäng</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PodiumSlot({ row, place, height }: { row: Row | undefined; place: 1 | 2 | 3; height: string }) {
  if (!row) return <div />;
  const medalColor = place === 1 ? "text-gold" : place === 2 ? "text-muted-foreground" : "text-amber-700";
  const bg = place === 1 ? "bg-gold/15 border-gold/50" : place === 2 ? "bg-card border-border" : "bg-card border-border";
  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar profile={row.profile} size={place === 1 ? 16 : 12} ring={place === 1} />
      <div className="max-w-full truncate text-center text-sm font-semibold">{row.profile?.display_name ?? "Okänd"}</div>
      <div className={cn("flex w-full flex-col items-center justify-end rounded-t-xl border p-2", height, bg)}>
        <Trophy className={cn("h-6 w-6", medalColor)} />
        <div className="mt-1 text-lg font-bold tabular-nums text-gold">{row.total}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{place === 1 ? "Vinnare" : `${place}:a`}</div>
      </div>
    </div>
  );
}

function Avatar({ profile, size = 9, ring }: { profile: Profile | undefined | null; size?: number; ring?: boolean }) {
  const cls = `h-${size} w-${size} shrink-0 overflow-hidden rounded-full bg-muted ${ring ? "ring-2 ring-gold ring-offset-2 ring-offset-background" : ""}`;
  const initials = (profile?.display_name ?? "??").slice(0, 2).toUpperCase();
  return (
    <div className={cls}>
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">{initials}</div>
      )}
    </div>
  );
}

function FactCard({ icon, title, subtitle, winner, value, tint }: {
  icon: React.ReactNode; title: string; subtitle: string;
  winner: { profile: Profile | undefined } | null; value: string | null | undefined;
  tint?: "gold" | "muted";
}) {
  const borderCls = tint === "gold" ? "border-gold/40" : "border-border";
  return (
    <div className={cn("rounded-xl border bg-card p-4", borderCls)}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className={tint === "gold" ? "text-gold" : "text-foreground"}>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="text-[11px] text-muted-foreground">{subtitle}</div>
      <div className="mt-3 flex items-center gap-3">
        {winner ? <Avatar profile={winner.profile} size={10} /> : <div className="h-10 w-10 rounded-full bg-muted" />}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{winner?.profile?.display_name ?? "—"}</div>
          <div className="truncate text-xs text-gold">{value ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}

type Row = {
  user_id: string;
  profile: Profile | undefined;
  total: number;
  bonus: number;
  exact: number;
  outcome: number;
  wrong: number;
  missed: number;
  picks: number;
  accuracy: number;
};

function computeFacts(d: NonNullable<Awaited<ReturnType<typeof loadDummy>>>) {
  const { userIds, profMap, preds, matchMap, finishedMatches, bonus } = d;

  // Base rows
  const rows: Row[] = userIds.map((uid) => {
    const my = preds.filter((p) => p.user_id === uid);
    const myFinished = my.filter((p) => matchMap.get(p.match_id)?.status === "finished");
    const exact = my.filter((p) => p.points === 3).length;
    const outcome = my.filter((p) => p.points === 1).length;
    const wrong = my.filter((p) => p.points === 0).length;
    const mainPts = my.reduce((s, p) => s + (p.points ?? 0), 0);
    const bonusPts = bonus.filter((b) => b.user_id === uid).reduce((s, b) => s + (b.points ?? 0), 0);
    const missed = Math.max(0, finishedMatches.length - myFinished.length);
    const scored = myFinished.length;
    return {
      user_id: uid,
      profile: profMap.get(uid),
      total: mainPts + bonusPts,
      bonus: bonusPts,
      exact, outcome, wrong, missed,
      picks: my.length,
      accuracy: scored ? Math.round(((exact + outcome) / scored) * 100) : 0,
    };
  });
  rows.sort((a, b) => b.total - a.total || b.exact - a.exact);

  // First-to-submit per match
  const firstByMatch = new Map<string, string>();
  const byMatch = new Map<string, Pred[]>();
  preds.forEach((p) => {
    if (!byMatch.has(p.match_id)) byMatch.set(p.match_id, []);
    byMatch.get(p.match_id)!.push(p);
  });
  byMatch.forEach((list, mid) => {
    const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (sorted[0]) firstByMatch.set(mid, sorted[0].user_id);
  });
  const firstCounts = new Map<string, number>();
  firstByMatch.forEach((uid) => firstCounts.set(uid, (firstCounts.get(uid) ?? 0) + 1));

  // Avg lead time (seconds before kickoff) for each user
  const leadByUser = new Map<string, number[]>();
  preds.forEach((p) => {
    const m = matchMap.get(p.match_id);
    if (!m) return;
    const lead = (new Date(m.kickoff_at).getTime() - new Date(p.created_at).getTime()) / 1000;
    if (lead < 0) return; // ignore tips after kickoff (shouldn't happen)
    if (!leadByUser.has(p.user_id)) leadByUser.set(p.user_id, []);
    leadByUser.get(p.user_id)!.push(lead);
  });
  const avgLead = new Map<string, number>();
  leadByUser.forEach((arr, uid) => {
    if (arr.length >= 5) avgLead.set(uid, arr.reduce((s, x) => s + x, 0) / arr.length);
  });

  // Near miss (off-by-1 goal, not exact) on finished matches
  const nearMissCounts = new Map<string, number>();
  const goalsPredicted = new Map<string, { sum: number; n: number }>();
  const scoreTally = new Map<string, number>();
  preds.forEach((p) => {
    const m = matchMap.get(p.match_id);
    if (!m || m.status !== "finished" || m.home_score == null || m.away_score == null) return;
    const dh = Math.abs(p.home_score - m.home_score);
    const da = Math.abs(p.away_score - m.away_score);
    const total = dh + da;
    if ((p.points ?? 0) !== 3 && total === 1) {
      nearMissCounts.set(p.user_id, (nearMissCounts.get(p.user_id) ?? 0) + 1);
    }
    const g = goalsPredicted.get(p.user_id) ?? { sum: 0, n: 0 };
    g.sum += p.home_score + p.away_score; g.n++;
    goalsPredicted.set(p.user_id, g);
    const key = `${p.home_score}-${p.away_score}`;
    scoreTally.set(key, (scoreTally.get(key) ?? 0) + 1);
  });

  const avgGoals = new Map<string, number>();
  goalsPredicted.forEach((v, uid) => { if (v.n >= 5) avgGoals.set(uid, v.sum / v.n); });

  const bonusByUser = new Map<string, number>();
  bonus.forEach((b) => bonusByUser.set(b.user_id, (bonusByUser.get(b.user_id) ?? 0) + (b.points ?? 0)));

  const mkWinner = (uid: string | undefined) => uid ? { profile: profMap.get(uid) } : null;
  const pickMax = <T,>(map: Map<string, T>, cmp: (a: T, b: T) => number) => {
    let best: [string, T] | null = null;
    map.forEach((v, k) => { if (!best || cmp(v, best[1]) > 0) best = [k, v]; });
    return best;
  };
  const pickMin = <T,>(map: Map<string, T>, cmp: (a: T, b: T) => number) => pickMax(map, (a, b) => -cmp(a, b));

  const winnerFromMap = <T,>(map: Map<string, T>, cmp: (a: T, b: T) => number, min = false) => {
    const best = (min ? pickMin : pickMax)(map, cmp);
    if (!best) return null;
    return { profile: profMap.get(best[0]), value: best[1] };
  };

  const numCmp = (a: number, b: number) => a - b;

  // Most exact / outcome / missed / bonus / accuracy from rows
  const withPickThreshold = rows.filter((r) => r.picks >= 5);
  const mostExactRow = [...rows].sort((a, b) => b.exact - a.exact)[0];
  const mostOutcomeRow = [...rows].sort((a, b) => b.outcome - a.outcome)[0];
  const mostMissedRow = [...rows].sort((a, b) => b.missed - a.missed)[0];
  const bestAccRow = [...withPickThreshold].sort((a, b) => b.accuracy - a.accuracy)[0];
  const bonusKingRow = [...rows].sort((a, b) => b.bonus - a.bonus)[0];

  const favoriteScore = (() => {
    let best: { score: string; count: number } | null = null;
    scoreTally.forEach((count, score) => { if (!best || count > best.count) best = { score, count }; });
    return best;
  })();

  return {
    rows,
    finishedCount: finishedMatches.length,
    totalPreds: preds.length,
    mostExact: mostExactRow ? { profile: mostExactRow.profile, value: mostExactRow.exact } : null,
    mostOutcome: mostOutcomeRow ? { profile: mostOutcomeRow.profile, value: mostOutcomeRow.outcome } : null,
    mostMissed: mostMissedRow && mostMissedRow.missed > 0 ? { profile: mostMissedRow.profile, value: mostMissedRow.missed } : null,
    bestAccuracy: bestAccRow ? { profile: bestAccRow.profile, value: bestAccRow.accuracy } : null,
    bonusKing: bonusKingRow && bonusKingRow.bonus > 0 ? { profile: bonusKingRow.profile, value: bonusKingRow.bonus } : null,
    mostFirst: winnerFromMap(firstCounts, numCmp),
    latest: winnerFromMap(avgLead, numCmp, true),
    earliest: winnerFromMap(avgLead, numCmp),
    mostNearMiss: winnerFromMap(nearMissCounts, numCmp),
    optimist: winnerFromMap(avgGoals, numCmp),
    pessimist: winnerFromMap(avgGoals, numCmp, true),
    favoriteScore,
  };
}

// Helper for type inference of computeFacts input
async function loadDummy() {
  return null as unknown as {
    userIds: string[];
    profMap: Map<string, Profile>;
    preds: Pred[];
    matches: Match[];
    matchMap: Map<string, Match>;
    finishedMatches: Match[];
    bonus: Bonus[];
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = seconds / 60;
  if (m < 60) return `${Math.round(m)} min`;
  const h = m / 60;
  if (h < 48) return `${h.toFixed(1)} h`;
  const d = h / 24;
  return `${d.toFixed(1)} dagar`;
}
