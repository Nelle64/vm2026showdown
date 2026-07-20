import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GameLockMode = "per_match" | "per_round";

export interface MatchLockInfo {
  lockAt: string | null;
  roundName: string | null;
}

/**
 * Returnerar effektiv lås-tidpunkt + ev. omgångsnamn per match-id för ett spel.
 */
export function useGameLock(gameId: string) {
  const { data: game } = useQuery({
    queryKey: ["game-lockmode", gameId],
    queryFn: async () => {
      const { data } = await supabase
        .from("games")
        .select("lock_mode")
        .eq("id", gameId)
        .maybeSingle();
      return data as { lock_mode: GameLockMode } | null;
    },
  });

  const mode: GameLockMode = game?.lock_mode ?? "per_match";

  const { data: roundInfo } = useQuery({
    queryKey: ["round-locks", gameId],
    enabled: mode === "per_round",
    queryFn: async () => {
      const { data: rounds } = await supabase
        .from("rounds")
        .select("id, name, lock_at, round_matches(match_id, match:matches(kickoff_at))")
        .eq("game_id", gameId);
      const map = new Map<string, MatchLockInfo>();
      (rounds ?? []).forEach((r: any) => {
        let lockAt: string | null = r.lock_at;
        if (!lockAt && r.round_matches?.length) {
          const earliest = r.round_matches
            .map((rm: any) => rm.match?.kickoff_at)
            .filter(Boolean)
            .sort()[0];
          if (earliest) {
            lockAt = new Date(new Date(earliest).getTime() - 60_000).toISOString();
          }
        }
        r.round_matches?.forEach((rm: any) => {
          map.set(rm.match_id, { lockAt, roundName: r.name ?? null });
        });
      });
      return map;
    },
  });

  return {
    mode,
    getLockAt: (matchId: string): string | null => {
      if (mode === "per_round") return roundInfo?.get(matchId)?.lockAt ?? null;
      return null;
    },
    getRoundName: (matchId: string): string | null => {
      if (mode === "per_round") return roundInfo?.get(matchId)?.roundName ?? null;
      return null;
    },
  };
}
