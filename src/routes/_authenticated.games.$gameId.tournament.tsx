import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeamFlag } from "@/components/TeamFlag";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/games/$gameId/tournament")({
  component: TournamentPage,
});

type Team = { id: string; name: string; code: string | null };
type Match = {
  id: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  stage: string;
  group_letter: string | null;
  home: Team | null;
  away: Team | null;
};

function TournamentPage() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["tournament-matches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches")
        .select("id, kickoff_at, status, home_score, away_score, stage, group_letter, home:teams!matches_home_team_id_fkey(id,name,code), away:teams!matches_away_team_id_fkey(id,name,code)")
        .order("kickoff_at");
      if (error) throw error;
      return data as unknown as Match[];
    },
  });

  const groupMatches = useMemo(
    () => (matches ?? []).filter((m) => m.stage === "group" && m.group_letter),
    [matches],
  );
  const knockoutMatches = useMemo(
    () => (matches ?? []).filter((m) => m.stage === "knockout"),
    [matches],
  );

  const groupLetters = useMemo(
    () => Array.from(new Set(groupMatches.map((m) => m.group_letter!).filter(Boolean))).sort(),
    [groupMatches],
  );

  const knockoutRounds = useMemo(() => splitKnockoutRounds(knockoutMatches), [knockoutMatches]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Laddar turnering…</p>;

  return (
    <div className="space-y-6 pb-20">
      <section>
        <h2 className="mb-2 text-lg font-semibold">Gruppspel</h2>
        <Accordion type="multiple" defaultValue={groupLetters.length ? [`group-${groupLetters[0]}`] : []} className="space-y-2">
          {groupLetters.map((letter) => {
            const ms = groupMatches.filter((m) => m.group_letter === letter);
            const standings = computeStandings(ms);
            return (
              <AccordionItem key={letter} value={`group-${letter}`} className="rounded-xl border bg-card">
                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-semibold">Grupp {letter}</span>
                    <span className="text-xs text-muted-foreground">{standings.length} lag</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <StandingsTable rows={standings} />
                  <div className="mt-3 space-y-1.5">
                    {ms.map((m) => (
                      <MiniMatch key={m.id} m={m} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
          {groupLetters.length === 0 && (
            <p className="text-sm text-muted-foreground">Inga gruppmatcher hittade.</p>
          )}
        </Accordion>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Slutspel</h2>
        <Accordion type="multiple" defaultValue={knockoutRounds.map((r) => r.key)} className="space-y-2">
          {knockoutRounds.map((round) => (
            <AccordionItem key={round.key} value={round.key} className="rounded-xl border bg-card">
              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-semibold">{round.label}</span>
                  <span className="text-xs text-muted-foreground">{round.matches.length} matcher</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <div className="space-y-1.5">
                  {round.matches.map((m) => (
                    <MiniMatch key={m.id} m={m} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
          {knockoutRounds.length === 0 && (
            <p className="text-sm text-muted-foreground">Slutspelets matcher dyker upp efter gruppspelet.</p>
          )}
        </Accordion>
      </section>
    </div>
  );
}

function MiniMatch({ m }: { m: Match }) {
  const finished = m.status === "finished" || m.status === "live";
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background/40 px-2.5 py-1.5 text-sm">
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
        <span className="truncate">{m.home?.name ?? "TBD"}</span>
        <TeamFlag code={m.home?.code} label={m.home?.name ?? undefined} />
      </div>
      <div className="w-16 shrink-0 text-center font-mono text-xs">
        {finished && m.home_score != null && m.away_score != null
          ? `${m.home_score} – ${m.away_score}`
          : new Date(m.kickoff_at).toLocaleDateString("sv-SE", { month: "short", day: "numeric" })}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TeamFlag code={m.away?.code} label={m.away?.name ?? undefined} />
        <span className="truncate">{m.away?.name ?? "TBD"}</span>
      </div>
    </div>
  );
}

type StandingRow = {
  team: Team;
  p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number;
};

function computeStandings(matches: Match[]): StandingRow[] {
  const map = new Map<string, StandingRow>();
  const ensure = (t: Team | null) => {
    if (!t) return null;
    if (!map.has(t.id)) {
      map.set(t.id, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
    }
    return map.get(t.id)!;
  };

  matches.forEach((m) => {
    ensure(m.home); ensure(m.away);
    if (m.status !== "finished" || m.home_score == null || m.away_score == null) return;
    const h = ensure(m.home), a = ensure(m.away);
    if (!h || !a) return;
    h.p++; a.p++;
    h.gf += m.home_score; h.ga += m.away_score;
    a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) { h.w++; h.pts += 3; a.l++; }
    else if (m.home_score < m.away_score) { a.w++; a.pts += 3; h.l++; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  });

  return Array.from(map.values())
    .map((r) => ({ ...r, gd: r.gf - r.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name));
}

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-1 text-left font-medium">#</th>
            <th className="py-1 text-left font-medium">Lag</th>
            <th className="py-1 text-center font-medium">S</th>
            <th className="py-1 text-center font-medium">V</th>
            <th className="py-1 text-center font-medium">O</th>
            <th className="py-1 text-center font-medium">F</th>
            <th className="py-1 text-center font-medium">+/−</th>
            <th className="py-1 text-center font-medium">P</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id} className="border-b last:border-0">
              <td className="py-1 pr-1 text-muted-foreground">{i + 1}</td>
              <td className="py-1">
                <span className="inline-flex items-center gap-1.5">
                  <TeamFlag code={r.team.code} label={r.team.name} />
                  <span className="truncate">{r.team.name}</span>
                </span>
              </td>
              <td className="py-1 text-center">{r.p}</td>
              <td className="py-1 text-center">{r.w}</td>
              <td className="py-1 text-center">{r.d}</td>
              <td className="py-1 text-center">{r.l}</td>
              <td className="py-1 text-center">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="py-1 text-center font-semibold text-gold">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Slutspelet: dela upp matcher i rundor utifrån antal/datum.
// VM 2026 har 32-lagsslutspel: 16 + 8 + 4 + 2 (SF) + 1 (3:e pris) + 1 (final).
function splitKnockoutRounds(matches: Match[]) {
  if (matches.length === 0) return [];
  const sorted = [...matches].sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));

  // VM 2026 har Round of 32 (16), Round of 16 (16), kvarts (8), semi (4), 3:e + final (2)
  const ROUND_SCHEMA: { label: string; size: number }[] = [
    { label: "Sextondelsfinaler", size: 16 },
    { label: "Åttondelsfinaler", size: 16 },
    { label: "Kvartsfinaler", size: 8 },
    { label: "Semifinaler", size: 4 },
    { label: "Bronsmatch & Final", size: 2 },
  ];

  // Om totalt antal matcher är <= 16, anta att det är åttondelsfinaler (32-lags playoff togs bort)
  let remaining = sorted.length;
  const schema = remaining <= 32
    ? ROUND_SCHEMA.slice(1) // hoppa över sextondelar
    : ROUND_SCHEMA;

  const rounds: { key: string; label: string; matches: Match[] }[] = [];
  let idx = 0;
  for (const r of schema) {
    if (idx >= sorted.length) break;
    const chunk = sorted.slice(idx, idx + r.size);
    rounds.push({ key: r.label, label: r.label, matches: chunk });
    idx += r.size;
    remaining -= r.size;
  }
  if (idx < sorted.length) {
    rounds.push({ key: "Övrigt", label: "Övriga slutspelsmatcher", matches: sorted.slice(idx) });
  }
  return rounds;
}
