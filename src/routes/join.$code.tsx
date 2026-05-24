import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/join/$code")({ component: JoinPage });

function JoinPage() {
  const { code } = useParams({ from: "/join/$code" });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (loading || ran.current) return;
    if (!user) {
      // Spara invite-koden så vi kan slutföra efter login
      if (typeof window !== "undefined") localStorage.setItem("pending_invite", code);
      navigate({ to: "/login" });
      return;
    }
    ran.current = true;
    (async () => {
      const trimmed = code.trim().toUpperCase();
      const { data: g, error } = await supabase.from("games").select("id, name").eq("invite_code", trimmed).maybeSingle();
      if (error || !g) {
        toast.error("Ogiltig invite-länk");
        navigate({ to: "/games" });
        return;
      }
      const { error: e2 } = await supabase.from("game_members").insert({ game_id: g.id, user_id: user.id });
      if (e2 && !e2.message.includes("duplicate")) {
        toast.error(e2.message);
      } else {
        toast.success(`Du är med i ${g.name}!`);
      }
      if (typeof window !== "undefined") localStorage.removeItem("pending_invite");
      navigate({ to: `/games/${g.id}/matches` });
    })();
  }, [user, loading, code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Ansluter till spel...
    </div>
  );
}
