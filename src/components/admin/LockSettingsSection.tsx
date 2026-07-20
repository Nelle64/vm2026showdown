import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { GameLockMode } from "@/lib/use-game-lock";
import { TeamFlag } from "@/components/TeamFlag";

export function LockSettingsSection({ gameId }: { gameId: string }) {
  const qc = useQueryClient();

  const { data: game } = useQuery({
    queryKey: ["game-lockmode-admin", gameId],
    queryFn: async () => {
      const { data } = await supabase
        .from("games")
        .select("lock_mode")
        .eq("id", gameId)
        .maybeSingle();
      return data as { lock_mode: GameLockMode } | null;
    },
  });

  const setMode = useMutation({
    mutationFn: async (mode: GameLockMode) => {
      const { error } = await supabase.from("games").update({ lock_mode: mode }).eq("id", gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Låsläge uppdaterat");
      qc.invalidateQueries({ queryKey: ["game-lockmode-admin", gameId] });
      qc.invalidateQueries({ queryKey: ["game-lockmode", gameId] });
      qc.invalidateQueries({ queryKey: ["round-locks", gameId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mode = game?.lock_mode ?? "per_match";

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 font-semibold">Låsläge för tips</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <ModeOption
          active={mode === "per_match"}
          title="Per match"
          description="Varje match låses 1 minut före avspark."
          onClick={() => setMode.mutate("per_match")}
        />
        <ModeOption
          active={mode === "per_round"}
          title="Per omgång"
          description="Du grupperar matcher i omgångar och bestämmer en gemensam låstid."
          onClick={() => setMode.mutate("per_round")}
        />
      </div>

      {mode === "per_round" && <RoundsManager gameId={gameId} />}
    </section>
  );
}

function ModeOption({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-lg border p-3 text-left transition " +
        (active ? "border-gold bg-gold/10" : "hover:border-foreground/30")
      }
    >
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{description}</div>
    </button>
  );
}

function RoundsManager({ gameId }: { gameId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: rounds } = useQuery({
    queryKey: ["admin-rounds", gameId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rounds")
        .select("id, name, lock_at, round_matches(match_id)")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const createRound = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n) throw new Error("Ange namn");
      const { error } = await supabase.from("rounds").insert({ game_id: gameId, name: n });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      toast.success("Omgång skapad");
      qc.invalidateQueries({ queryKey: ["admin-rounds", gameId] });
      qc.invalidateQueries({ queryKey: ["round-locks", gameId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Gruppspel omgång 1"
          className="h-10 flex-1 rounded-md border bg-background px-3"
        />
        <Button
          onClick={() => createRound.mutate()}
          disabled={createRound.isPending}
          className="bg-gold text-gold-foreground hover:bg-gold/90"
        >
          <Plus className="mr-1 h-4 w-4" /> Skapa
        </Button>
      </div>

      {!rounds?.length ? (
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Inga omgångar än.
        </div>
      ) : (
        <div className="space-y-2">
          {rounds.map((r: any) => (
            <RoundRow key={r.id} round={r} gameId={gameId} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoundRow({ round, gameId }: { round: any; gameId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [lockAtLocal, setLockAtLocal] = useState<string>(
    round.lock_at ? toLocalInput(round.lock_at) : "",
  );

  const update = useMutation({
    mutationFn: async (patch: { name?: string; lock_at?: string | null }) => {
      const { error } = await supabase.from("rounds").update(patch).eq("id", round.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sparat");
      qc.invalidateQueries({ queryKey: ["admin-rounds", gameId] });
      qc.invalidateQueries({ queryKey: ["round-locks", gameId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rounds").delete().eq("id", round.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Borttagen");
      qc.invalidateQueries({ queryKey: ["admin-rounds", gameId] });
      qc.invalidateQueries({ queryKey: ["round-locks", gameId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveLockAt = () => {
    const iso = lockAtLocal ? new Date(lockAtLocal).toISOString() : null;
    update.mutate({ lock_at: iso });
  };

  const matchCount = round.round_matches?.length ?? 0;

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-2 p-3">
        <button onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">{round.name}</span>
          <span className="text-xs text-muted-foreground">
            {matchCount} {matchCount === 1 ? "match" : "matcher"}
          </span>
        </button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            if (confirm(`Ta bort "${round.name}"?`)) del.mutate();
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {open && (
        <div className="space-y-3 border-t p-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Låstid{" "}
              {!lockAtLocal && (
                <span className="ml-1 normal-case text-[10px] text-gold">
                  (tom = 1 min före första match)
                </span>
              )}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="datetime-local"
                value={lockAtLocal}
                onChange={(e) => setLockAtLocal(e.target.value)}
                className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
              />
              <Button size="sm" onClick={saveLockAt}>
                Spara
              </Button>
              {lockAtLocal && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setLockAtLocal("");
                    update.mutate({ lock_at: null });
                  }}
                >
                  Auto
                </Button>
              )}
            </div>
          </div>

          <MatchPicker roundId={round.id} gameId={gameId} />
        </div>
      )}
    </div>
  );
}

function MatchPicker({ roundId, gameId }: { roundId: string; gameId: string }) {
  const qc = useQueryClient();

  const { data: matches } = useQuery({
    queryKey: ["picker-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select(
          "id, kickoff_at, stage, group_letter, home:teams!matches_home_team_id_fkey(code,flag_emoji), away:teams!matches_away_team_id_fkey(code,flag_emoji)",
        )
        .order("kickoff_at");
      return data ?? [];
    },
  });

  const { data: assigned } = useQuery({
    queryKey: ["picker-assigned", gameId],
    queryFn: async () => {
      const { data } = await supabase
        .from("round_matches")
        .select("match_id, round_id")
        .eq("game_id", gameId);
      const map = new Map<string, string>(); // matchId -> roundId
      (data ?? []).forEach((r: any) => map.set(r.match_id, r.round_id));
      return map;
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ matchId, checked }: { matchId: string; checked: boolean }) => {
      if (checked) {
        // ta bort eventuell befintlig tilldelning i annan omgång, lägg sedan till
        const existing = assigned?.get(matchId);
        if (existing && existing !== roundId) {
          await supabase
            .from("round_matches")
            .delete()
            .eq("game_id", gameId)
            .eq("match_id", matchId);
        }
        const { error } = await supabase
          .from("round_matches")
          .insert({ round_id: roundId, match_id: matchId, game_id: gameId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("round_matches")
          .delete()
          .eq("round_id", roundId)
          .eq("match_id", matchId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["picker-assigned", gameId] });
      qc.invalidateQueries({ queryKey: ["admin-rounds", gameId] });
      qc.invalidateQueries({ queryKey: ["round-locks", gameId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Matcher i omgången
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border bg-card p-2">
        {matches?.map((m: any) => {
          const inThis = assigned?.get(m.id) === roundId;
          const inOther = assigned?.get(m.id) && !inThis;
          return (
            <label
              key={m.id}
              className={
                "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50 " +
                (inOther ? "opacity-50" : "")
              }
            >
              <input
                type="checkbox"
                checked={inThis}
                onChange={(e) => toggle.mutate({ matchId: m.id, checked: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="flex flex-1 items-center gap-1.5 truncate">
                <TeamFlag code={m.home?.code} className="h-4 w-6" />
                <span>{m.home?.code}</span>
                <span className="text-muted-foreground">–</span>
                <span>{m.away?.code}</span>
                <TeamFlag code={m.away?.code} className="h-4 w-6" />
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {new Date(m.kickoff_at).toLocaleString("sv-SE", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {inOther && <span className="text-[10px] text-muted-foreground">(annan omg.)</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
