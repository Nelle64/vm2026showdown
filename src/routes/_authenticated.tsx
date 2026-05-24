import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated")({ component: AuthLayout });

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Laddar...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
