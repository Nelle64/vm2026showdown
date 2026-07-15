import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGameLock } from "@/lib/use-game-lock";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { TeamFlag } from "@/components/TeamFlag";

interface MatchRow {
  id: string;
  kickoff_at: string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  home: { code: string; flag_emoji: string | null };
  away: { code: string; flag_emoji: string | null };
}

interface MemberRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface PredRow {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
}

export function PredictionsMatrix({ gameId }: { gameId: string }) {
  const { getLockAt } = useGameLock(gameId);

  const { data, isLoading } = useQuery({
    queryKey: ["predictions-matrix", gameId],
    queryFn: async () => {
      const { data: matches, error: mErr } = await supabase
        .from("matches")
        .select("id, kickoff_at, status, home_score, away_score, home:teams!matches_home_team_id_fkey(code,flag_emoji), away:teams!matches_away_team_id_fkey(code,flag_emoji)")
        .order("kickoff_at");
      if (mErr) throw mErr;

      const { data: members, error: memErr } = await supabase
        .from("game_members")
        .select("user_id")
        .eq("game_id", gameId);
      if (memErr) throw memErr;

      const ids = (members ?? []).map((m: any) => m.user_id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids)
        : { data: [] as any[] };
      const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const memberRows: MemberRow[] = ids.map((id) => ({
        user_id: id,
        display_name: profMap.get(id)?.display_name ?? "Okänd",
        avatar_url: profMap.get(id)?.avatar_url ?? null,
      })).sort((a, b) => a.display_name.localeCompare(b.display_name, "sv"));

      const { data: preds } = await supabase
        .from("predictions")
        .select("user_id, match_id, home_score, away_score, points")
        .eq("game_id", gameId);

      const predMap = new Map<string, PredRow>();
      (preds ?? []).forEach((p: any) => predMap.set(`${p.user_id}:${p.match_id}`, p));

      return { matches: (matches ?? []) as unknown as MatchRow[], members: memberRows, predMap };
    },
  });

  if (isLoading) return <div className="text-xs text-muted-foreground">Laddar gissningar...</div>;
  if (!data || !data.matches.length || !data.members.length) {
    return <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">Inga matcher eller medlemmar.</div>;
  }

  const now = Date.now();
  const isLocked = (m: MatchRow) => {
    if (m.status !== "scheduled") return true;
    const lockAt = getLockAt(m.id);
    const t = lockAt ? new Date(lockAt).getTime() : new Date(m.kickoff_at).getTime() - 60_000;
    return t <= now;
  };

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-medium">Match</th>
            <th className="px-2 py-2 text-center font-medium">Resultat</th>
            {data.members.map((m) => (
              <th key={m.user_id} className="px-2 py-2 text-center font-medium">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-6 w-6 overflow-hidden rounded-full bg-muted">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-muted-foreground">
                        {m.display_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="max-w-[60px] truncate text-[10px] normal-case">{m.display_name.split(" ")[0]}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.matches.map((m) => {
            const locked = isLocked(m);
            const finished = m.status === "finished";
            return (
              <tr key={m.id} className="border-t">
                <td className="sticky left-0 z-10 bg-card px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <TeamFlag code={m.home.code} className="h-4 w-6" />
                    <span className="font-semibold">{m.home.code}</span>
                    <span className="text-muted-foreground">–</span>
                    <span className="font-semibold">{m.away.code}</span>
                    <TeamFlag code={m.away.code} className="h-4 w-6" />
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {format(new Date(m.kickoff_at), "d MMM HH:mm", { locale: sv })}
                  </div>
                </td>
                <td className="px-2 py-2 text-center text-xs font-bold tabular-nums">
                  {finished ? `${m.home_score}–${m.away_score}` : <span className="text-muted-foreground">–</span>}
                </td>
                {data.members.map((mem) => {
                  const p = data.predMap.get(`${mem.user_id}:${m.id}`);
                  if (!locked) {
                    return (
                      <td key={mem.user_id} className="px-2 py-2 text-center text-xs">
                        {p ? <span className="text-success" title="Har tippat">✓</span> : <span className="text-muted-foreground">–</span>}
                      </td>
                    );
                  }
                  if (!p) {
                    return <td key={mem.user_id} className="px-2 py-2 text-center text-xs text-muted-foreground">–</td>;
                  }
                  const exact = finished && p.home_score === m.home_score && p.away_score === m.away_score;
                  return (
                    <td key={mem.user_id} className={cn("px-2 py-2 text-center text-xs font-bold tabular-nums", exact && "text-gold")}>
                      {p.home_score}–{p.away_score}
                      {finished && (
                        <div className={cn("mt-0.5 text-[9px] font-bold",
                          p.points === 3 ? "text-gold" : p.points === 1 ? "text-success" : "text-muted-foreground")}>
                          {p.points ?? 0}p
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
