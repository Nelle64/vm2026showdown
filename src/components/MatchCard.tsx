import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TeamFlag } from "@/components/TeamFlag";

export interface MatchRow {
  id: string;
  kickoff_at: string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  stage: string;
  group_letter: string | null;
  home: { code: string; name: string; flag_emoji: string | null };
  away: { code: string; name: string; flag_emoji: string | null };
}

interface Props {
  match: MatchRow;
  gameId: string;
  userId: string;
  prediction?: { home_score: number; away_score: number; points: number | null } | null;
  /** Effektiv låstid (ISO). Om angiven används denna istället för kickoff_at - 1 min. */
  lockAt?: string | null;
  /** Omgångsnamn (visas när spelet körs i per_round-läge). */
  roundName?: string | null;
}

export function MatchCard({ match, gameId, userId, prediction, lockAt, roundName }: Props) {
  const qc = useQueryClient();
  const [home, setHome] = useState<string>(prediction ? String(prediction.home_score) : "");
  const [away, setAway] = useState<string>(prediction ? String(prediction.away_score) : "");

  // Beräkna lås-status varje sekund för matcher nära avspark
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const lockTime = useMemo(() => {
    if (lockAt) return new Date(lockAt).getTime();
    return new Date(match.kickoff_at).getTime() - 60_000;
  }, [lockAt, match.kickoff_at]);
  const msToLock = lockTime - now;
  const locked = msToLock <= 0 || match.status !== "scheduled";
  const finished = match.status === "finished";

  const countdown = useMemo(() => {
    if (locked || msToLock > 6 * 3600_000) return null;
    const s = Math.floor(msToLock / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `Låser om ${h}h ${m}m` : m > 0 ? `Låser om ${m}m ${sec}s` : `Låser om ${sec}s`;
  }, [locked, msToLock]);

  const save = useMutation({
    mutationFn: async () => {
      const h = parseInt(home, 10);
      const a = parseInt(away, 10);
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) throw new Error("Ange siffror");
      const { error } = await supabase.from("predictions").upsert({
        game_id: gameId, user_id: userId, match_id: match.id, home_score: h, away_score: a,
      }, { onConflict: "game_id,user_id,match_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tips sparat");
      qc.invalidateQueries({ queryKey: ["predictions", gameId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const kickoff = new Date(match.kickoff_at);
  const points = prediction?.points;

  const deadline = new Date(lockTime);
  const stageLabel = match.stage === "group" ? `Grupp ${match.group_letter}` : match.stage;

  const hasPrediction = Boolean(prediction);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {stageLabel}
          {roundName && <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">{roundName}</span>}
        </span>
        <div className="flex items-center gap-2">
          {!locked && !hasPrediction && (
            <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-gold-foreground">Ej tippad</span>
          )}
          <span>{format(kickoff, "EEE d MMM HH:mm", { locale: sv })}</span>
          <StatusBadge status={match.status} kickoffAt={match.kickoff_at} />
        </div>
      </div>
      <div className="mb-3 text-[11px] text-muted-foreground">
        Sista tipp: <span className="font-medium text-foreground/80">{format(deadline, "EEE d MMM HH:mm", { locale: sv })}</span>
      </div>


      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide team={match.home} align="right" />
        <div className="text-center">
          {finished ? (
            <div className="text-2xl font-bold tabular-nums">{match.home_score}–{match.away_score}</div>
          ) : match.status === "live" ? (
            <div className="text-2xl font-bold tabular-nums text-live">{match.home_score ?? 0}–{match.away_score ?? 0}</div>
          ) : (
            <div className="text-sm text-muted-foreground">vs</div>
          )}
        </div>
        <TeamSide team={match.away} align="left" />
      </div>

      <div className="mt-4 rounded-lg bg-muted/50 p-3">
        {locked ? (
          <LockedView prediction={prediction ?? null} finished={finished} points={points ?? null} match={match} />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ditt tips</div>
              {countdown && <div className="mt-0.5 text-[10px] font-medium text-gold">{countdown}</div>}
            </div>
            <div className="flex items-center gap-2">
              <ScoreInput value={home} onChange={setHome} />
              <span className="text-muted-foreground">–</span>
              <ScoreInput value={away} onChange={setAway} />
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} className="bg-gold text-gold-foreground hover:bg-gold/90">
                {save.isPending ? "..." : "Spara"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {locked && <AllPicks matchId={match.id} gameId={gameId} finished={finished} match={match} />}
    </div>
  );
}

function AllPicks({ matchId, gameId, finished, match }: { matchId: string; gameId: string; finished: boolean; match: MatchRow }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["all-picks", gameId, matchId],
    enabled: open,
    queryFn: async () => {
      const { data: picks, error } = await supabase
        .from("predictions")
        .select("user_id, home_score, away_score, points")
        .eq("game_id", gameId)
        .eq("match_id", matchId);
      if (error) throw error;
      const list = picks ?? [];
      if (list.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", list.map((p) => p.user_id));
      const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return list
        .map((p) => ({ ...p, profile: map.get(p.user_id) ?? null }))
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    },
  });

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {open ? "Dölj alla gissningar" : "Visa alla gissningar"}
      </button>
      {open && (
        <div className="mt-2 overflow-hidden rounded-lg border">
          {isLoading ? (
            <div className="p-3 text-center text-xs text-muted-foreground">Laddar...</div>
          ) : !data?.length ? (
            <div className="p-3 text-center text-xs text-muted-foreground">Inga gissningar</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Spelare</th>
                  <th className="px-3 py-1.5 text-center font-medium">Gissning</th>
                  {finished && <th className="px-3 py-1.5 text-right font-medium">Poäng</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((p) => {
                  const exact = finished && p.home_score === match.home_score && p.away_score === match.away_score;
                  return (
                    <tr key={p.user_id} className="border-t">
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                            {p.profile?.avatar_url ? (
                              <img src={p.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-muted-foreground">
                                {(p.profile?.display_name ?? "??").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="font-medium">{p.profile?.display_name ?? "Okänd"}</span>
                        </div>
                      </td>
                      <td className={cn("px-3 py-1.5 text-center font-bold tabular-nums", exact && "text-gold")}>
                        {p.home_score}–{p.away_score}
                      </td>
                      {finished && (
                        <td className="px-3 py-1.5 text-right">
                          <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-bold",
                            p.points === 3 ? "bg-gold text-gold-foreground" :
                            p.points === 1 ? "bg-success/20 text-success" :
                            "bg-muted text-muted-foreground")}>
                            {p.points ?? 0}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function TeamSide({ team, align }: { team: MatchRow["home"]; align: "left" | "right" }) {
  return (
    <div className={cn("flex items-center gap-2", align === "right" ? "justify-end" : "justify-start")}>
      {align === "left" && <TeamFlag code={team.code} label={`${team.name} flagga`} className="h-6 w-8" />}
      <div className={cn(align === "right" ? "text-right" : "text-left")}>
        <div className="font-semibold leading-tight">{team.name}</div>
        <div className="text-xs text-muted-foreground">{team.code}</div>
      </div>
      {align === "right" && <TeamFlag code={team.code} label={`${team.name} flagga`} className="h-6 w-8" />}
    </div>
  );
}

function ScoreInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number" min={0} max={30} inputMode="numeric"
      value={value} onChange={(e) => onChange(e.target.value)}
      className="h-10 w-12 rounded-md border bg-background text-center text-lg font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function LockedView({ prediction, finished, points, match }: { prediction: { home_score: number; away_score: number } | null; finished: boolean; points: number | null; match: MatchRow }) {
  if (!prediction) {
    return <div className="text-center text-xs text-muted-foreground">Du tippade inte denna match</div>;
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ditt tips</div>
        <div className="text-lg font-bold tabular-nums">{prediction.home_score}–{prediction.away_score}</div>
      </div>
      {finished && (
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Resultat</div>
          <div className="text-lg font-bold tabular-nums">{match.home_score}–{match.away_score}</div>
        </div>
      )}
      {finished && (
        <div className={cn("rounded-full px-3 py-1 text-sm font-bold",
          points === 3 ? "bg-gold text-gold-foreground" :
          points === 1 ? "bg-success/20 text-success" :
          "bg-muted text-muted-foreground")}>
          {points ?? 0} p
        </div>
      )}
    </div>
  );
}
