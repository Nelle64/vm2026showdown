import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, UserCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/games/$gameId/admin")({ component: AdminPage });

function AdminPage() {
  const { gameId } = useParams({ from: "/_authenticated/games/$gameId/admin" });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ["admin-members", gameId],
    queryFn: async () => {
      const { data } = await supabase.from("game_members")
        .select("id, user_id, is_admin, profile:profiles(display_name)")
        .eq("game_id", gameId);
      return data ?? [];
    },
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

  // Skapa bonusfråga
  const [bq, setBq] = useState({ question: "", points: 5, lockHours: 24, answer_type: "text" });
  const createBonus = useMutation({
    mutationFn: async () => {
      if (!bq.question.trim()) throw new Error("Ange fråga");
      const lockAt = new Date(Date.now() + bq.lockHours * 3600_000).toISOString();
      const { error } = await supabase.from("bonus_questions").insert({
        game_id: gameId, question: bq.question.trim(), points: bq.points,
        lock_at: lockAt, answer_type: bq.answer_type as any, created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fråga skapad"); setBq({ question: "", points: 5, lockHours: 24, answer_type: "text" });
      qc.invalidateQueries({ queryKey: ["admin-bonus"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Rätta bonusfråga
  const settle = useMutation({
    mutationFn: async ({ id, answer }: { id: string; answer: string }) => {
      const { error } = await supabase.from("bonus_questions")
        .update({ status: "settled", correct_answer: { value: answer.trim() } }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rättad"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
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
            <select value={bq.answer_type} onChange={(e) => setBq({ ...bq, answer_type: e.target.value })}
              className="h-11 rounded-md border bg-background px-2">
              <option value="text">Fritext</option>
              <option value="number">Antal</option>
              <option value="player">Spelare</option>
              <option value="team">Lag</option>
            </select>
            <input type="number" min={1} max={100} value={bq.points} onChange={(e) => setBq({ ...bq, points: +e.target.value })}
              placeholder="Poäng" className="h-11 rounded-md border bg-background px-3" />
            <input type="number" min={1} value={bq.lockHours} onChange={(e) => setBq({ ...bq, lockHours: +e.target.value })}
              placeholder="Lås om (timmar)" className="h-11 rounded-md border bg-background px-3" />
          </div>
          <Button onClick={() => createBonus.mutate()} className="bg-gold text-gold-foreground hover:bg-gold/90">Skapa</Button>
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
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{q.question}</div>
          <div className="text-xs text-muted-foreground">{q.status} · {q.points} p</div>
        </div>
      </div>
      {q.status !== "settled" && (
        <div className="mt-2 flex gap-2">
          <input value={ans} onChange={(e) => setAns(e.target.value)} placeholder="Rätt svar"
            className="h-9 flex-1 rounded-md border bg-background px-3 text-sm" />
          <Button size="sm" onClick={() => onSettle(ans)} className="bg-gold text-gold-foreground hover:bg-gold/90">Rätta</Button>
        </div>
      )}
    </div>
  );
}
