import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
}

export function MatchCard({ match, gameId, userId, prediction }: Props) {
  const qc = useQueryClient();
  const [home, setHome] = useState<string>(prediction ? String(prediction.home_score) : "");
  const [away, setAway] = useState<string>(prediction ? String(prediction.away_score) : "");

  // Beräkna lås-status varje sekund för matcher nära avspark
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msToLock = useMemo(() => new Date(match.kickoff_at).getTime() - 60_000 - now, [match.kickoff_at, now]);
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

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{match.stage === "group" ? `Grupp ${match.group_letter}` : match.stage}</span>
        <div className="flex items-center gap-2">
          <span>{format(kickoff, "EEE d MMM HH:mm", { locale: sv })}</span>
          <StatusBadge status={match.status} kickoffAt={match.kickoff_at} />
        </div>
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
    </div>
  );
}

function TeamSide({ team, align }: { team: MatchRow["home"]; align: "left" | "right" }) {
  return (
    <div className={cn("flex items-center gap-2", align === "right" ? "justify-end" : "justify-start")}>
      {align === "left" && <span className="text-2xl">{team.flag_emoji ?? "🏳️"}</span>}
      <div className={cn(align === "right" ? "text-right" : "text-left")}>
        <div className="font-semibold leading-tight">{team.name}</div>
        <div className="text-xs text-muted-foreground">{team.code}</div>
      </div>
      {align === "right" && <span className="text-2xl">{team.flag_emoji ?? "🏳️"}</span>}
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
