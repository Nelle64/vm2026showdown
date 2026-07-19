import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { sv } from "date-fns/locale";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/games/$gameId/bonus")({ component: BonusPage });

function BonusPage() {
  const { gameId } = useParams({ from: "/_authenticated/games/$gameId/bonus" });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ["bonus", gameId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bonus_questions")
        .select("*").eq("game_id", gameId).order("lock_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: myAnswers } = useQuery({
    queryKey: ["bonus-answers", gameId, user!.id],
    queryFn: async () => {
      const ids = questions?.map((q) => q.id) ?? [];
      if (!ids.length) return new Map<string, any>();
      const { data } = await supabase.from("bonus_answers")
        .select("*").eq("user_id", user!.id).in("question_id", ids);
      const map = new Map<string, any>();
      (data ?? []).forEach((a) => map.set(a.question_id, a));
      return map;
    },
    enabled: !!questions,
  });

  return (
    <div className="space-y-3">
      {isLoading && <div className="text-muted-foreground">Laddar...</div>}
      {!isLoading && !questions?.length && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Inga bonusfrågor ännu. Admin kan skapa dem från Admin-fliken.</p>
        </div>
      )}
      {questions?.map((q) => (
        <BonusQuestionCard key={q.id} q={q} gameId={gameId} answer={myAnswers?.get(q.id)} onAnswered={() => qc.invalidateQueries({ queryKey: ["bonus-answers", gameId] })} />
      ))}
    </div>
  );
}

function BonusQuestionCard({ q, gameId, answer, onAnswered }: { q: any; gameId: string; answer: any; onAnswered: () => void }) {
  const { user } = useAuth();
  const [value, setValue] = useState<string>(answer?.answer?.value ?? "");
  const locked = q.status !== "open" || new Date(q.lock_at).getTime() <= Date.now();
  const settled = q.status === "settled";
  const isMC = q.answer_type === "multiple_choice" && Array.isArray(q.options);

  const save = useMutation({
    mutationFn: async () => {
      if (!value.trim()) throw new Error("Ange ett svar");
      const { error } = await supabase.from("bonus_answers").upsert({
        question_id: q.id, user_id: user!.id, answer: { value: value.trim() },
      }, { onConflict: "question_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Svar sparat"); onAnswered(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: allAnswers } = useQuery({
    queryKey: ["bonus-all-answers", q.id, gameId],
    enabled: locked,
    queryFn: async () => {
      const { data: ans } = await supabase.from("bonus_answers")
        .select("user_id, answer, points").eq("question_id", q.id);
      const uids = (ans ?? []).map((a) => a.user_id);
      if (!uids.length) return [];
      const { data: profs } = await supabase.from("profiles")
        .select("id, display_name, avatar_url").in("id", uids);
      const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (ans ?? []).map((a: any) => ({
        user_id: a.user_id,
        name: pmap.get(a.user_id)?.display_name ?? "Okänd",
        avatar: pmap.get(a.user_id)?.avatar_url ?? null,
        value: a.answer?.value ?? "—",
        points: a.points,
      }));
    },
  });

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{q.question}</h3>
        <div className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">{q.points} p</div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {settled ? "Avgjord" : locked ? "Låst" : `Stänger om ${formatDistanceToNowStrict(new Date(q.lock_at), { locale: sv })}`}
      </div>

      {settled && q.correct_answer && (
        <div className="mt-3 rounded-md bg-muted/50 p-2 text-sm">
          <span className="text-muted-foreground">Rätt svar: </span>
          <span className="font-semibold">{q.correct_answer.value ?? JSON.stringify(q.correct_answer)}</span>
        </div>
      )}

      <div className="mt-3">
        {locked ? (
          <div className="text-sm">
            <span className="text-muted-foreground">Ditt svar: </span>
            <span className="font-semibold">{answer?.answer?.value ?? "—"}</span>
            {answer?.points != null && (
              <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold">+{answer.points} p</span>
            )}
          </div>
        ) : isMC ? (
          <div className="space-y-2">
            <div className="grid gap-2">
              {q.options.map((o: string) => (
                <button key={o} onClick={() => setValue(o)}
                  className={"rounded-md border px-3 py-2 text-left text-sm transition " + (value === o ? "border-gold bg-gold/10 font-semibold" : "hover:border-gold/40")}>
                  {o}
                </button>
              ))}
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !value} className="bg-gold text-gold-foreground hover:bg-gold/90">
              Spara
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ditt svar"
              type={q.answer_type === "number" ? "number" : "text"}
              className="h-10 flex-1 rounded-md border bg-background px-3" />
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gold text-gold-foreground hover:bg-gold/90">
              Spara
            </Button>
          </div>
        )}
      </div>

      {locked && allAnswers && allAnswers.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Allas svar ({allAnswers.length})
          </div>
          <div className="space-y-1.5">
            {allAnswers.map((a) => {
              const correct = settled && q.correct_answer && String(a.value) === String(q.correct_answer.value);
              return (
                <div key={a.user_id} className="flex items-center gap-2 text-sm">
                  <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                    {a.avatar ? (
                      <img src={a.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-muted-foreground">
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.name}</span>
                  <span className={"font-semibold " + (correct ? "text-gold" : "")}>{a.value}</span>
                  {a.points != null && a.points > 0 && (
                    <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">+{a.points}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

