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
      if (typeof window !== "undefined") localStorage.setItem("pending_invite", code);
      navigate({ to: "/login" });
      return;
    }
    ran.current = true;
    (async () => {
      const trimmed = code.trim().toUpperCase();
      const { data, error } = await supabase.rpc("request_join_by_code", { _code: trimmed });
      if (typeof window !== "undefined") localStorage.removeItem("pending_invite");
      if (error) {
        toast.error(error.message.includes("invalid code") ? "Ogiltig invite-länk" : error.message);
        navigate({ to: "/games" });
        return;
      }
      const row: any = Array.isArray(data) ? data[0] : data;
      if (row?.already_member || row?.status === "approved") {
        toast.success(`Du är med i ${row.game_name}!`);
        navigate({ to: `/games/${row.game_id}/matches` });
      } else if (row?.status === "pending") {
        toast.success(`Ansökan skickad till ${row.game_name}. Väntar på godkännande.`);
        navigate({ to: "/games" });
      } else {
        toast.error("Din ansökan blev avvisad. Kontakta admin.");
        navigate({ to: "/games" });
      }
    })();
  }, [user, loading, code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Skickar ansökan...
    </div>
  );
}
