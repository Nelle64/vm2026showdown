import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/supabase-pagination";
import { Trophy, Zap, Clock, Target, Crosshair, Ghost, Sparkles, TrendingUp, TrendingDown, Repeat, Award, Flame, Handshake, Home, Plane, Users, Snowflake, Shield, Star, Swords, UserX, Compass, Shuffle, ListOrdered, Goal, Flag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/games/$gameId/summary")({ component: SummaryPage });

type Profile = { id: string; display_name: string | null; avatar_url: string | null };
type Pred = { user_id: string; match_id: string; home_score: number; away_score: number; points: number | null; created_at: string };
type Match = { id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; home_team_id: string | null; away_team_id: string | null };
type Bonus = { user_id: string; points: number | null };
type Team = { id: string; name: string };

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
        .select("id, kickoff_at, status, home_score, away_score, home_team_id, away_team_id");
      const matchMap = new Map<string, Match>(((matches ?? []) as Match[]).map((m) => [m.id, m]));
      const finishedMatches = ((matches ?? []) as Match[]).filter((m) => m.status === "finished");

      const teamIds = Array.from(new Set(((matches ?? []) as Match[]).flatMap((m) => [m.home_team_id, m.away_team_id]).filter(Boolean) as string[]));
      const { data: teams } = teamIds.length
        ? await supabase.from("teams").select("id, name").in("id", teamIds)
        : { data: [] as Team[] };
      const teamMap = new Map<string, Team>(((teams ?? []) as Team[]).map((t) => [t.id, t]));

      const { data: bonusRows } = await supabase.from("bonus_answers")
        .select("user_id, points, question:bonus_questions!inner(game_id)")
        .eq("question.game_id", gameId).in("user_id", userIds);
      const bonus = (bonusRows ?? []) as unknown as Bonus[];

      return { userIds, profMap, preds, matches: (matches ?? []) as Match[], matchMap, finishedMatches, bonus, teamMap };
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
          <FactCard icon={<Trophy className="h-5 w-5" />} title="Bonuskungen" subtitle="Mest bonuspoäng (räknas separat)"
            winner={facts.bonusKing} value={facts.bonusKing && `${facts.bonusKing.value} p`} tint="gold" />
          <FactCard icon={<Target className="h-5 w-5" />} title="Utfallsmästaren" subtitle="Flest rätt utfall (1p)"
            winner={facts.mostOutcome} value={facts.mostOutcome && `${facts.mostOutcome.value} utfall`} />
          <FactCard icon={<Handshake className="h-5 w-5" />} title="Oavgjord-troende" subtitle="Störst andel oavgjorda tips"
            winner={facts.drawLover} value={facts.drawLover && `${facts.drawLover.value}% oavgjorda`} />
          <FactCard icon={<Home className="h-5 w-5" />} title="Hemmasugen" subtitle="Störst andel hemmavinst-tips"
            winner={facts.homer} value={facts.homer && `${facts.homer.value}% hemmavinst`} />
          <FactCard icon={<Plane className="h-5 w-5" />} title="Bortasugen" subtitle="Störst andel bortavinst-tips"
            winner={facts.awayer} value={facts.awayer && `${facts.awayer.value}% bortavinst`} />
          <FactCard icon={<Flame className="h-5 w-5" />} title="Het strimma" subtitle="Längst svit i rad med poäng"
            winner={facts.hotStreak} value={facts.hotStreak && `${facts.hotStreak.value} matcher i rad`} tint="gold" />
          <FactCard icon={<Snowflake className="h-5 w-5" />} title="Kall strimma" subtitle="Längst svit utan poäng"
            winner={facts.coldStreak} value={facts.coldStreak && `${facts.coldStreak.value} matcher i rad`} tint="muted" />
          <FactCard icon={<Users className="h-5 w-5" />} title="Tvillingarna" subtitle="Paret med flest identiska tips"
            winner={null} value={facts.twins && `${facts.twins.a} & ${facts.twins.b} – ${facts.twins.count} likadana`} />
          <FactCard icon={<Shield className="h-5 w-5" />} title="Kontrarian" subtitle="Flest unika resultat ingen annan tippade"
            winner={facts.contrarian} value={facts.contrarian && `${facts.contrarian.value} unika`} />
          <FactCard icon={<Swords className="h-5 w-5" />} title="Modigast exakta" subtitle="Rätt exakt resultat med flest mål"
            winner={facts.boldestExact} value={facts.boldestExact && facts.boldestExact.value} />
          <FactCard icon={<Star className="h-5 w-5" />} title="Kvällens match" subtitle="Match som gav flest 3-poängare"
            winner={null} value={facts.matchOfTournament ?? "—"} />
          <FactCard icon={<Compass className="h-5 w-5" />} title="Rebellen" subtitle="Tippade mest olikt alla andra"
            winner={facts.mostDifferent} value={facts.mostDifferent && `${facts.mostDifferent.value}% olika`} />
          <FactCard icon={<UserX className="h-5 w-5" />} title="Ensamvargen" subtitle="Poäng när ingen annan fick något"
            winner={facts.lonePoints} value={facts.lonePoints && `${facts.lonePoints.value} ensam-poäng`} tint="gold" />
          <FactCard icon={<Shuffle className="h-5 w-5" />} title="Rätt siffror – fel lag" subtitle="Tippade omvänt resultat (t.ex. 2–1 istället för 1–2)"
            winner={facts.reversedScore} value={facts.reversedScore && `${facts.reversedScore.value} gånger`} />
          <FactCard icon={<Swords className="h-5 w-5" />} title="Mest emot Sverige" subtitle="Tippade oftast att Sverige inte skulle vinna"
            winner={facts.antiSweden} value={facts.antiSweden && `${facts.antiSweden.value} matcher`} tint="muted" />
          <FactCard icon={<TrendingDown className="h-5 w-5" />} title="Underdog-troende" subtitle="Tippade förloraren till vinst flest gånger"
            winner={facts.underdog} value={facts.underdog && `${facts.underdog.value} gånger`} />
        </div>
      </section>

      {/* Personliga signaturer */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personliga signaturer</h2>
        <p className="mb-3 text-xs text-muted-foreground">Varje spelares egen lilla grej – mest tippade slutresultat.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {facts.signatures.map((s) => (
            <div key={s.user_id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <Avatar profile={s.profile} size={10} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{s.profile?.display_name ?? "Okänd"}</div>
                <div className="truncate text-xs text-muted-foreground">{s.label}</div>
              </div>
              <div className="text-right text-sm font-bold text-gold tabular-nums">{s.value}</div>
            </div>
          ))}
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
                  {r.bonus > 0 ? ` · ${r.bonus} bonus` : ""}
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
  const { userIds, profMap, preds, matchMap, finishedMatches, bonus, teamMap } = d;

  // Base rows — total EXCLUDES bonus points (bonus shown separately)
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
      total: mainPts,
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

  // Avg lead time
  const leadByUser = new Map<string, number[]>();
  preds.forEach((p) => {
    const m = matchMap.get(p.match_id);
    if (!m) return;
    const lead = (new Date(m.kickoff_at).getTime() - new Date(p.created_at).getTime()) / 1000;
    if (lead < 0) return;
    if (!leadByUser.has(p.user_id)) leadByUser.set(p.user_id, []);
    leadByUser.get(p.user_id)!.push(lead);
  });
  const avgLead = new Map<string, number>();
  leadByUser.forEach((arr, uid) => {
    if (arr.length >= 5) avgLead.set(uid, arr.reduce((s, x) => s + x, 0) / arr.length);
  });

  // Near miss + goal averages + favorite score
  const nearMissCounts = new Map<string, number>();
  const goalsPredicted = new Map<string, { sum: number; n: number }>();
  const scoreTally = new Map<string, number>();
  preds.forEach((p) => {
    const m = matchMap.get(p.match_id);
    if (!m || m.status !== "finished" || m.home_score == null || m.away_score == null) return;
    const dh = Math.abs(p.home_score - m.home_score);
    const da = Math.abs(p.away_score - m.away_score);
    if ((p.points ?? 0) !== 3 && dh + da === 1) {
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

  // Draw / home / away preference (% of user's tips)
  const outcomeShare = new Map<string, { draw: number; home: number; away: number; total: number }>();
  preds.forEach((p) => {
    const rec = outcomeShare.get(p.user_id) ?? { draw: 0, home: 0, away: 0, total: 0 };
    rec.total++;
    if (p.home_score === p.away_score) rec.draw++;
    else if (p.home_score > p.away_score) rec.home++;
    else rec.away++;
    outcomeShare.set(p.user_id, rec);
  });
  const drawPct = new Map<string, number>();
  const homePct = new Map<string, number>();
  const awayPct = new Map<string, number>();
  outcomeShare.forEach((v, uid) => {
    if (v.total < 5) return;
    drawPct.set(uid, Math.round((v.draw / v.total) * 100));
    homePct.set(uid, Math.round((v.home / v.total) * 100));
    awayPct.set(uid, Math.round((v.away / v.total) * 100));
  });

  // Hot / cold streaks — walk through each user's finished-match predictions in kickoff order
  const hotStreak = new Map<string, number>();
  const coldStreak = new Map<string, number>();
  userIds.forEach((uid) => {
    const seq = preds
      .filter((p) => p.user_id === uid && matchMap.get(p.match_id)?.status === "finished")
      .map((p) => ({ p, kickoff: matchMap.get(p.match_id)!.kickoff_at }))
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    let hot = 0, coldRun = 0, bestHot = 0, bestCold = 0;
    seq.forEach(({ p }) => {
      if ((p.points ?? 0) > 0) { hot++; coldRun = 0; }
      else { coldRun++; hot = 0; }
      if (hot > bestHot) bestHot = hot;
      if (coldRun > bestCold) bestCold = coldRun;
    });
    if (bestHot > 0) hotStreak.set(uid, bestHot);
    if (bestCold > 0) coldStreak.set(uid, bestCold);
  });

  // Twins — pair with most identical predictions on the same match
  let twins: { a: string; b: string; count: number } | null = null;
  const pairCount = new Map<string, number>();
  byMatch.forEach((list) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].home_score === list[j].home_score && list[i].away_score === list[j].away_score) {
          const [x, y] = [list[i].user_id, list[j].user_id].sort();
          const k = `${x}|${y}`;
          pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
        }
      }
    }
  });
  pairCount.forEach((count, key) => {
    if (!twins || count > twins.count) {
      const [x, y] = key.split("|");
      twins = { a: profMap.get(x)?.display_name ?? "Okänd", b: profMap.get(y)?.display_name ?? "Okänd", count };
    }
  });

  // Contrarian — unique scorelines per match (only one user tipped it)
  const contrarianCounts = new Map<string, number>();
  byMatch.forEach((list) => {
    const tally = new Map<string, string[]>();
    list.forEach((p) => {
      const k = `${p.home_score}-${p.away_score}`;
      if (!tally.has(k)) tally.set(k, []);
      tally.get(k)!.push(p.user_id);
    });
    tally.forEach((users) => {
      if (users.length === 1) contrarianCounts.set(users[0], (contrarianCounts.get(users[0]) ?? 0) + 1);
    });
  });

  // Boldest exact — highest-scoring match tipped exactly right
  let boldestExact: { profile: Profile | undefined; value: string } | null = null;
  let boldestTotal = -1;
  preds.forEach((p) => {
    if (p.points !== 3) return;
    const total = p.home_score + p.away_score;
    if (total > boldestTotal) {
      boldestTotal = total;
      boldestExact = { profile: profMap.get(p.user_id), value: `${p.home_score}–${p.away_score} (${total} mål)` };
    }
  });

  // Most active — total tips submitted
  const activeCounts = new Map<string, number>();
  rows.forEach((r) => activeCounts.set(r.user_id, r.picks));

  // Match of the tournament — finished match where most players got 3 points
  let matchOfTournament: string | null = null;
  let bestMatchExact = 0;
  finishedMatches.forEach((m) => {
    const exactHere = preds.filter((p) => p.match_id === m.id && p.points === 3).length;
    if (exactHere > bestMatchExact) {
      bestMatchExact = exactHere;
      const home = m.home_team_id ? teamMap.get(m.home_team_id)?.name ?? "?" : "?";
      const away = m.away_team_id ? teamMap.get(m.away_team_id)?.name ?? "?" : "?";
      matchOfTournament = `${home}–${away} ${m.home_score}–${m.away_score} (${exactHere} exakt)`;
    }
  });

  // Rebellen — average % of other users on the same match who tipped a different scoreline
  const diffRates = new Map<string, number>();
  const diffAccum = new Map<string, { sum: number; n: number }>();
  byMatch.forEach((list) => {
    if (list.length < 2) return;
    list.forEach((p) => {
      const others = list.filter((o) => o.user_id !== p.user_id);
      if (!others.length) return;
      const different = others.filter((o) => o.home_score !== p.home_score || o.away_score !== p.away_score).length;
      const share = different / others.length;
      const acc = diffAccum.get(p.user_id) ?? { sum: 0, n: 0 };
      acc.sum += share; acc.n++;
      diffAccum.set(p.user_id, acc);
    });
  });
  diffAccum.forEach((v, uid) => { if (v.n >= 5) diffRates.set(uid, Math.round((v.sum / v.n) * 100)); });

  // Ensamvargen — total points scored on finished matches where no other user got any points
  const lonePointsMap = new Map<string, number>();
  finishedMatches.forEach((m) => {
    const list = byMatch.get(m.id) ?? [];
    const scorers = list.filter((p) => (p.points ?? 0) > 0);
    if (scorers.length === 1) {
      const p = scorers[0];
      lonePointsMap.set(p.user_id, (lonePointsMap.get(p.user_id) ?? 0) + (p.points ?? 0));
    }
  });

  // Rätt siffror – fel lag — tipped scoreline reversed matches actual, and not exact
  const reversedMap = new Map<string, number>();
  preds.forEach((p) => {
    const m = matchMap.get(p.match_id);
    if (!m || m.status !== "finished" || m.home_score == null || m.away_score == null) return;
    if (m.home_score === m.away_score) return; // reversed == exact for draws
    if (p.home_score === m.home_score && p.away_score === m.away_score) return;
    if (p.home_score === m.away_score && p.away_score === m.home_score) {
      reversedMap.set(p.user_id, (reversedMap.get(p.user_id) ?? 0) + 1);
    }
  });

  // Anti-Sverige — tipped that Sweden would not win (loss or draw) in matches where Sweden plays
  const swedenTeam = Array.from(teamMap.values()).find((t) => /sverige|sweden/i.test(t.name));
  const antiSwedenMap = new Map<string, number>();
  if (swedenTeam) {
    preds.forEach((p) => {
      const m = matchMap.get(p.match_id);
      if (!m) return;
      const isHome = m.home_team_id === swedenTeam.id;
      const isAway = m.away_team_id === swedenTeam.id;
      if (!isHome && !isAway) return;
      const swePredWins = isHome ? p.home_score > p.away_score : p.away_score > p.home_score;
      if (!swePredWins) {
        antiSwedenMap.set(p.user_id, (antiSwedenMap.get(p.user_id) ?? 0) + 1);
      }
    });
  }

  // Underdog — tipped the losing team to win (finished matches, not draws, user picked the eventual loser)
  const underdogMap = new Map<string, number>();
  preds.forEach((p) => {
    const m = matchMap.get(p.match_id);
    if (!m || m.status !== "finished" || m.home_score == null || m.away_score == null) return;
    if (m.home_score === m.away_score) return;
    const actualHomeWon = m.home_score > m.away_score;
    const predHomeWin = p.home_score > p.away_score;
    const predAwayWin = p.away_score > p.home_score;
    if (!predHomeWin && !predAwayWin) return; // draw prediction is not "picking a loser"
    if ((predHomeWin && !actualHomeWon) || (predAwayWin && actualHomeWon)) {
      underdogMap.set(p.user_id, (underdogMap.get(p.user_id) ?? 0) + 1);
    }
  });

  function pickBest(map: Map<string, number>, min = false): { profile: Profile | undefined; value: number } | null {
    let bestKey: string | null = null;
    let bestVal = 0;
    for (const [k, v] of map) {
      if (bestKey === null || (min ? v < bestVal : v > bestVal)) { bestKey = k; bestVal = v; }
    }
    return bestKey === null ? null : { profile: profMap.get(bestKey), value: bestVal };
  }

  const withPickThreshold = rows.filter((r) => r.picks >= 5);
  const mostExactRow = [...rows].sort((a, b) => b.exact - a.exact)[0];
  const mostOutcomeRow = [...rows].sort((a, b) => b.outcome - a.outcome)[0];
  const mostMissedRow = [...rows].sort((a, b) => b.missed - a.missed)[0];
  const bestAccRow = [...withPickThreshold].sort((a, b) => b.accuracy - a.accuracy)[0];
  const bonusKingRow = [...rows].sort((a, b) => b.bonus - a.bonus)[0];

  let favoriteScore: { score: string; count: number } | null = null;
  for (const [score, count] of scoreTally) {
    if (!favoriteScore || count > favoriteScore.count) favoriteScore = { score, count };
  }

  // Personal signatures — each user's most tipped scoreline (guarantees every player gets a fact)
  const perUserScore = new Map<string, Map<string, number>>();
  preds.forEach((p) => {
    const key = `${p.home_score}–${p.away_score}`;
    if (!perUserScore.has(p.user_id)) perUserScore.set(p.user_id, new Map());
    const m = perUserScore.get(p.user_id)!;
    m.set(key, (m.get(key) ?? 0) + 1);
  });
  const signatures = userIds
    .map((uid) => {
      const m = perUserScore.get(uid);
      if (!m || m.size === 0) {
        return { user_id: uid, profile: profMap.get(uid), label: "Har inte tippat något ännu", value: "—" };
      }
      let bestKey = ""; let bestCount = 0;
      m.forEach((c, k) => { if (c > bestCount) { bestCount = c; bestKey = k; } });
      return {
        user_id: uid,
        profile: profMap.get(uid),
        label: `Älskar resultatet ${bestKey}`,
        value: `${bestCount} ggr`,
      };
    })
    .sort((a, b) => (a.profile?.display_name ?? "").localeCompare(b.profile?.display_name ?? ""));

  return {
    rows,
    finishedCount: finishedMatches.length,
    totalPreds: preds.length,
    signatures,
    mostExact: mostExactRow ? { profile: mostExactRow.profile, value: mostExactRow.exact } : null,
    mostOutcome: mostOutcomeRow ? { profile: mostOutcomeRow.profile, value: mostOutcomeRow.outcome } : null,
    mostMissed: mostMissedRow && mostMissedRow.missed > 0 ? { profile: mostMissedRow.profile, value: mostMissedRow.missed } : null,
    bestAccuracy: bestAccRow ? { profile: bestAccRow.profile, value: bestAccRow.accuracy } : null,
    bonusKing: bonusKingRow && bonusKingRow.bonus > 0 ? { profile: bonusKingRow.profile, value: bonusKingRow.bonus } : null,
    mostFirst: pickBest(firstCounts),
    latest: pickBest(avgLead, true),
    earliest: pickBest(avgLead),
    mostNearMiss: pickBest(nearMissCounts),
    optimist: pickBest(avgGoals),
    pessimist: pickBest(avgGoals, true),
    favoriteScore,
    drawLover: pickBest(drawPct),
    homer: pickBest(homePct),
    awayer: pickBest(awayPct),
    hotStreak: pickBest(hotStreak),
    coldStreak: pickBest(coldStreak),
    twins: twins as { a: string; b: string; count: number } | null,
    contrarian: pickBest(contrarianCounts),
    boldestExact: boldestExact as { profile: Profile | undefined; value: string } | null,
    mostActive: pickBest(activeCounts),
    matchOfTournament,
    mostDifferent: pickBest(diffRates),
    lonePoints: pickBest(lonePointsMap),
    reversedScore: pickBest(reversedMap),
    antiSweden: pickBest(antiSwedenMap),
    underdog: pickBest(underdogMap),
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
    teamMap: Map<string, Team>;
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
