import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GameLockMode = "per_match" | "per_round";

/**
 * Returnerar effektiv lås-tidpunkt per match-id för ett spel.
 * - per_match: kickoff_at - 1 min (vi returnerar null så MatchCard kan falla tillbaka)
 * - per_round: round.lock_at, eller min(kickoff) - 1 min om null
 */
export function useGameLock(gameId: string) {
  const { data: game } = useQuery({
    queryKey: ["game-lockmode", gameId],
    queryFn: async () => {
      const { data } = await supabase.from("games").select("lock_mode").eq("id", gameId).maybeSingle();
      return data as { lock_mode: GameLockMode } | null;
    },
  });

  const mode: GameLockMode = game?.lock_mode ?? "per_match";

  const { data: roundLocks } = useQuery({
    queryKey: ["round-locks", gameId],
    enabled: mode === "per_round",
    queryFn: async () => {
      const { data: rounds } = await supabase
        .from("rounds")
        .select("id, lock_at, round_matches(match_id, match:matches(kickoff_at))")
        .eq("game_id", gameId);
      const map = new Map<string, string>(); // matchId -> lockAt ISO
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
        if (lockAt) {
          r.round_matches?.forEach((rm: any) => {
            map.set(rm.match_id, lockAt!);
          });
        }
      });
      return map;
    },
  });

  return {
    mode,
    getLockAt: (matchId: string): string | null => {
      if (mode === "per_round") return roundLocks?.get(matchId) ?? null;
      return null;
    },
  };
}
