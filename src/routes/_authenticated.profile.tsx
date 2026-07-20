import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) setName(profile.display_name ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name.trim() })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sparat");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 2_000_000) throw new Error("Max 2 MB");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user!.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user!.id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      toast.success("Profilbild uppdaterad");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const initials = (profile?.display_name ?? "?")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Profil</h1>
      </header>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative h-16 w-16 overflow-hidden rounded-full bg-gold text-2xl font-bold text-gold-foreground"
          title="Byt profilbild"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{initials}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Upload className="h-5 w-5 text-white" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadAvatar.mutate(f);
            e.target.value = "";
          }}
        />
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
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Visningsnamn
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="h-10 flex-1 rounded-md border bg-background px-3"
          />
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-gold text-gold-foreground hover:bg-gold/90"
          >
            Spara
          </Button>
        </div>
      </section>

      <Button
        variant="outline"
        className="w-full"
        onClick={async () => {
          await signOut();
          navigate({ to: "/" });
        }}
      >
        <LogOut className="mr-2 h-4 w-4" /> Logga ut
      </Button>
    </div>
  );
}
