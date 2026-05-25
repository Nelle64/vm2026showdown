import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Users, KeyRound, ChevronRight, Share2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/games/")({ component: GamesPage });

function GamesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");

  const { data: games, isLoading } = useQuery({
    queryKey: ["my-games", user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_members")
        .select("is_admin, game:games(id, name, description, invite_code, created_at, owner_id)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const createGame = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Ange ett namn");
      const { data, error } = await supabase.from("games").insert({
        name: name.trim(), description: desc.trim() || null, owner_id: user!.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (g) => {
      toast.success("Spel skapat");
      qc.invalidateQueries({ queryKey: ["my-games"] });
      setMode("none"); setName(""); setDesc("");
      navigate({ to: `/games/${g.id}/matches` });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const joinGame = useMutation({
    mutationFn: async () => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) throw new Error("Ange en kod");
      const { data, error } = await supabase.rpc("request_join_by_code", { _code: trimmed });
      if (error) {
        if (error.message.includes("invalid code")) throw new Error("Hittade inget spel med den koden");
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return row as { game_id: string; game_name: string; status: "pending" | "approved" | "rejected"; already_member: boolean };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["my-games"] });
      qc.invalidateQueries({ queryKey: ["my-requests"] });
      setMode("none"); setCode("");
      if (r.already_member || r.status === "approved") {
        toast.success("Du är med!");
        navigate({ to: `/games/${r.game_id}/matches` });
      } else if (r.status === "pending") {
        toast.success(`Ansökan skickad till ${r.game_name}. Väntar på godkännande.`);
      } else {
        toast.error("Din ansökan blev avvisad tidigare. Kontakta admin.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: myRequests } = useQuery({
    queryKey: ["my-requests", user!.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("game_join_requests")
        .select("id, status, created_at, game_id")
        .eq("user_id", user!.id)
        .in("status", ["pending", "rejected"]);
      return data ?? [];
    },
  });

  const cancelRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("game_join_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ansökan tillbakadragen"); qc.invalidateQueries({ queryKey: ["my-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-gold">VM-tipset 2026</div>
          <h1 className="mt-1 text-3xl font-bold">Mina spel</h1>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-2">
        <Button onClick={() => setMode("create")} className="h-12 bg-gold text-gold-foreground hover:bg-gold/90">
          <Plus className="mr-1 h-4 w-4" /> Skapa spel
        </Button>
        <Button onClick={() => setMode("join")} variant="outline" className="h-12">
          <KeyRound className="mr-1 h-4 w-4" /> Gå med
        </Button>
      </div>

      {mode === "create" && (
        <div className="mb-4 rounded-xl border bg-card p-4">
          <h3 className="mb-3 font-semibold">Nytt spel</h3>
          <div className="space-y-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Namn på spelet" maxLength={60}
              className="h-11 w-full rounded-md border bg-background px-3" />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Beskrivning (valfri)" maxLength={200}
              className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2" />
            <div className="flex gap-2">
              <Button onClick={() => createGame.mutate()} disabled={createGame.isPending} className="bg-gold text-gold-foreground hover:bg-gold/90">
                {createGame.isPending ? "Skapar..." : "Skapa"}
              </Button>
              <Button variant="ghost" onClick={() => setMode("none")}>Avbryt</Button>
            </div>
          </div>
        </div>
      )}

      {mode === "join" && (
        <div className="mb-4 rounded-xl border bg-card p-4">
          <h3 className="mb-3 font-semibold">Gå med via kod</h3>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD1234" maxLength={16}
              className="h-11 flex-1 rounded-md border bg-background px-3 font-mono uppercase tracking-wider" />
            <Button onClick={() => joinGame.mutate()} disabled={joinGame.isPending} className="bg-gold text-gold-foreground hover:bg-gold/90">
              Gå med
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode("none")} className="mt-2">Avbryt</Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground">Laddar...</div>
      ) : !games?.length ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Du är inte med i något spel än. Skapa ett nytt eller gå med via kod.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((m: any) => m.game && (
            <div key={m.game.id} className="group flex items-center justify-between rounded-xl border bg-card p-4 transition hover:border-gold/40">
              <Link to={`/games/${m.game.id}/matches`} className="min-w-0 flex-1">
                <div className="font-semibold">{m.game.name}</div>
                {m.game.description && <div className="text-sm text-muted-foreground">{m.game.description}</div>}
                <div className="mt-1 text-xs text-muted-foreground">Kod: <span className="font-mono text-gold">{m.game.invite_code}</span></div>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const url = `${window.location.origin}/join/${m.game.invite_code}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Invite-länk kopierad");
                }}
                className="mr-1 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-gold"
                title="Kopiera invite-länk"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}