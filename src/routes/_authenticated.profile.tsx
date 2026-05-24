import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => { if (profile) setName(profile.display_name ?? ""); }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sparat"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const initials = (profile?.display_name ?? "?").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Profil</h1>
      </header>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-2xl font-bold text-gold-foreground">
          {initials}
        </div>
        <div>
          <div className="text-xl font-semibold">{profile?.display_name ?? "—"}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
          <div className="mt-1 text-sm">
            <span className="font-bold text-gold">{profile?.total_points ?? 0}</span>
            <span className="text-muted-foreground"> totalpoäng</span>
          </div>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visningsnamn</label>
        <div className="mt-2 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
            className="h-10 flex-1 rounded-md border bg-background px-3" />
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gold text-gold-foreground hover:bg-gold/90">Spara</Button>
        </div>
      </section>

      <Button variant="outline" className="w-full" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
        <LogOut className="mr-2 h-4 w-4" /> Logga ut
      </Button>
    </div>
  );
}
