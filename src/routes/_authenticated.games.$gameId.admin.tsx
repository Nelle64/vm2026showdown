import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, UserCheck, RefreshCw, Copy, Plus, X, Check, XCircle } from "lucide-react";
import { LockSettingsSection } from "@/components/admin/LockSettingsSection";

export const Route = createFileRoute("/_authenticated/games/$gameId/admin")({ component: AdminPage });

function AdminPage() {
  const { gameId } = useParams({ from: "/_authenticated/games/$gameId/admin" });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: game } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const { data } = await supabase.from("games").select("name, invite_code").eq("id", gameId).maybeSingle();
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["admin-members", gameId],
    queryFn: async () => {
      const { data } = await supabase.from("game_members")
        .select("id, user_id, is_admin, profile:profiles(display_name)")
        .eq("game_id", gameId);
      return data ?? [];
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["join-requests", gameId],
    queryFn: async () => {
      const { data } = await supabase
        .from("game_join_requests")
        .select("id, user_id, status, created_at, profile:profiles(display_name, avatar_url)")
        .eq("game_id", gameId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const decideRequest = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase
        .from("game_join_requests")
        .update({ status: approve ? "approved" : "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.approve ? "Godkänd" : "Avvisad");
      qc.invalidateQueries({ queryKey: ["join-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: questions } = useQuery({
    queryKey: ["admin-bonus", gameId],
    queryFn: async () => {
      const { data } = await supabase.from("bonus_questions").select("*").eq("game_id", gameId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("game_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Borttagen"); qc.invalidateQueries({ queryKey: ["admin-members"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("game_members").update({ is_admin: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-members"] }),
  });

  // Synka API-Football
  const sync = useMutation({
    mutationFn: async () => {
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const res = await fetch("/api/public/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anon },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Synk misslyckades");
      return json as { teams: number; matches: number };
    },
    onSuccess: (r) => {
      toast.success(`Synkat: ${r.teams} lag, ${r.matches} matcher`);
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Bonusfråga
  type Draft = { question: string; points: number; lockHours: number; answer_type: "text" | "number" | "player" | "team" | "multiple_choice"; options: string[] };
  const [bq, setBq] = useState<Draft>({ question: "", points: 5, lockHours: 24, answer_type: "text", options: ["", ""] });

  const createBonus = useMutation({
    mutationFn: async () => {
      if (!bq.question.trim()) throw new Error("Ange fråga");
      const lockAt = new Date(Date.now() + bq.lockHours * 3600_000).toISOString();
      const options = bq.answer_type === "multiple_choice"
        ? bq.options.map((o) => o.trim()).filter(Boolean)
        : null;
      if (bq.answer_type === "multiple_choice" && (!options || options.length < 2)) {
        throw new Error("Ange minst 2 svarsalternativ");
      }
      const { error } = await supabase.from("bonus_questions").insert({
        game_id: gameId, question: bq.question.trim(), points: bq.points,
        lock_at: lockAt, answer_type: bq.answer_type, options,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fråga skapad");
      setBq({ question: "", points: 5, lockHours: 24, answer_type: "text", options: ["", ""] });
      qc.invalidateQueries({ queryKey: ["admin-bonus"] });
      qc.invalidateQueries({ queryKey: ["bonus"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settle = useMutation({
    mutationFn: async ({ id, answer }: { id: string; answer: string }) => {
      const { error } = await supabase.from("bonus_questions")
        .update({ status: "settled", correct_answer: { value: answer.trim() } }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rättad"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyInvite = () => {
    if (!game?.invite_code) return;
    const url = `${window.location.origin}/join/${game.invite_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite-länk kopierad");
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Bjud in</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 truncate rounded-md border bg-background px-3 py-2 font-mono text-sm">
            {typeof window !== "undefined" ? `${window.location.origin}/join/${game?.invite_code ?? ""}` : ""}
          </div>
          <Button size="icon" variant="outline" onClick={copyInvite} title="Kopiera länk">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Kod: <span className="font-mono text-gold">{game?.invite_code}</span></div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Synka matchdata</h2>
          <Button size="sm" onClick={() => sync.mutate()} disabled={sync.isPending} className="bg-gold text-gold-foreground hover:bg-gold/90">
            <RefreshCw className={"mr-1 h-4 w-4 " + (sync.isPending ? "animate-spin" : "")} />
            {sync.isPending ? "Synkar..." : "Synka nu"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Hämtar lag och matcher från API-Football. Sker även automatiskt i bakgrunden.</p>
      </section>

      <ResultsSection />

      <section>
        <h2 className="mb-3 font-semibold">
          Ansökningar {requests && requests.length > 0 && <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-xs text-gold-foreground">{requests.length}</span>}
        </h2>
        {!requests?.length ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Inga väntande ansökningar.</div>
        ) : (
          <div className="space-y-2">
            {requests.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                    {r.profile?.avatar_url ? (
                      <img src={r.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {(r.profile?.display_name ?? "??").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{r.profile?.display_name ?? "Okänd"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => decideRequest.mutate({ id: r.id, approve: true })} title="Godkänn">
                    <Check className="h-4 w-4 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => decideRequest.mutate({ id: r.id, approve: false })} title="Avvisa">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Medlemmar</h2>
        <div className="space-y-2">
          {members?.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div>
                <div className="font-medium">{m.profile?.display_name ?? "Okänd"}</div>
                {m.is_admin && <div className="text-xs text-gold">Admin</div>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => toggleAdmin.mutate({ id: m.id, value: !m.is_admin })} title="Växla admin">
                  <UserCheck className={"h-4 w-4 " + (m.is_admin ? "text-gold" : "")} />
                </Button>
                {m.user_id !== user!.id && (
                  <Button size="icon" variant="ghost" onClick={() => removeMember.mutate(m.id)} title="Ta bort">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Skapa bonusfråga</h2>
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <input value={bq.question} onChange={(e) => setBq({ ...bq, question: e.target.value })}
            placeholder="ex. Vem gör flest mål i turneringen?" className="h-11 w-full rounded-md border bg-background px-3" />
          <div className="grid grid-cols-3 gap-2">
            <select value={bq.answer_type} onChange={(e) => setBq({ ...bq, answer_type: e.target.value as Draft["answer_type"] })}
              className="h-11 rounded-md border bg-background px-2">
              <option value="text">Fritext</option>
              <option value="number">Antal</option>
              <option value="player">Spelare</option>
              <option value="team">Lag</option>
              <option value="multiple_choice">Flerval</option>
            </select>
            <input type="number" min={1} max={100} value={bq.points} onChange={(e) => setBq({ ...bq, points: +e.target.value })}
              placeholder="Poäng" className="h-11 rounded-md border bg-background px-3" />
            <input type="number" min={1} value={bq.lockHours} onChange={(e) => setBq({ ...bq, lockHours: +e.target.value })}
              placeholder="Lås om (h)" className="h-11 rounded-md border bg-background px-3" />
          </div>

          {bq.answer_type === "multiple_choice" && (
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Svarsalternativ</div>
              {bq.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={opt} onChange={(e) => {
                    const next = [...bq.options]; next[i] = e.target.value; setBq({ ...bq, options: next });
                  }} placeholder={`Alternativ ${i + 1}`} className="h-10 flex-1 rounded-md border bg-background px-3" />
                  {bq.options.length > 2 && (
                    <Button size="icon" variant="ghost" onClick={() => setBq({ ...bq, options: bq.options.filter((_, j) => j !== i) })}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setBq({ ...bq, options: [...bq.options, ""] })}>
                <Plus className="mr-1 h-3 w-3" /> Lägg till
              </Button>
            </div>
          )}

          <Button onClick={() => createBonus.mutate()} disabled={createBonus.isPending} className="bg-gold text-gold-foreground hover:bg-gold/90">
            Skapa
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Rätta bonusfrågor</h2>
        <div className="space-y-2">
          {questions?.map((q: any) => <SettleRow key={q.id} q={q} onSettle={(ans) => settle.mutate({ id: q.id, answer: ans })} />)}
          {!questions?.length && <div className="text-sm text-muted-foreground">Inga frågor ännu.</div>}
        </div>
      </section>
    </div>
  );
}

function SettleRow({ q, onSettle }: { q: any; onSettle: (ans: string) => void }) {
  const [ans, setAns] = useState(q.correct_answer?.value ?? "");
  const isMC = q.answer_type === "multiple_choice" && Array.isArray(q.options);
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="min-w-0">
        <div className="truncate font-medium">{q.question}</div>
        <div className="text-xs text-muted-foreground">{q.status} · {q.points} p · {q.answer_type}</div>
      </div>
      {q.status !== "settled" && (
        <div className="mt-2 flex gap-2">
          {isMC ? (
            <select value={ans} onChange={(e) => setAns(e.target.value)} className="h-9 flex-1 rounded-md border bg-background px-2 text-sm">
              <option value="">Välj rätt svar</option>
              {q.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input value={ans} onChange={(e) => setAns(e.target.value)} placeholder="Rätt svar"
              className="h-9 flex-1 rounded-md border bg-background px-3 text-sm" />
          )}
          <Button size="sm" onClick={() => onSettle(ans)} className="bg-gold text-gold-foreground hover:bg-gold/90">Rätta</Button>
        </div>
      )}
    </div>
  );
}

function ResultsSection() {
  const qc = useQueryClient();
  const { data: matches } = useQuery({
    queryKey: ["admin-matches-results"],
    queryFn: async () => {
      const { data } = await supabase.from("matches")
        .select("id, kickoff_at, status, home_score, away_score, home:teams!matches_home_team_id_fkey(code,flag_emoji), away:teams!matches_away_team_id_fkey(code,flag_emoji)")
        .order("kickoff_at");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async ({ id, h, a }: { id: string; h: number; a: number }) => {
      const { error } = await supabase.from("matches")
        .update({ home_score: h, away_score: a, status: "finished" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resultat sparat – poäng räknas");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!matches?.length) return null;

  return (
    <section>
      <h2 className="mb-3 font-semibold">Mata in resultat</h2>
      <div className="space-y-2">
        {matches.map((m: any) => (
          <ResultRow key={m.id} m={m} onSave={(h, a) => save.mutate({ id: m.id, h, a })} pending={save.isPending} />
        ))}
      </div>
    </section>
  );
}

function ResultRow({ m, onSave, pending }: { m: any; onSave: (h: number, a: number) => void; pending: boolean }) {
  const [h, setH] = useState<string>(m.home_score != null ? String(m.home_score) : "");
  const [a, setA] = useState<string>(m.away_score != null ? String(m.away_score) : "");
  const finished = m.status === "finished";
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {m.home?.flag_emoji} {m.home?.code} – {m.away?.code} {m.away?.flag_emoji}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {new Date(m.kickoff_at).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {finished && <span className="ml-1 text-success">· färdig</span>}
        </div>
      </div>
      <input type="number" min={0} value={h} onChange={(e) => setH(e.target.value)} className="h-9 w-12 rounded-md border bg-background text-center font-semibold tabular-nums" />
      <span className="text-muted-foreground">–</span>
      <input type="number" min={0} value={a} onChange={(e) => setA(e.target.value)} className="h-9 w-12 rounded-md border bg-background text-center font-semibold tabular-nums" />
      <Button size="sm" disabled={pending || h === "" || a === ""} onClick={() => onSave(parseInt(h, 10), parseInt(a, 10))}
        className="bg-gold text-gold-foreground hover:bg-gold/90">
        {finished ? "Uppdatera" : "Spara"}
      </Button>
    </div>
  );
}
