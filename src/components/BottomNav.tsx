import { Link, useParams, useLocation } from "@tanstack/react-router";
import { CalendarDays, Trophy, Sparkles, ListChecks, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const params = useParams({ strict: false }) as { gameId?: string };
  const loc = useLocation();
  const gameId = params.gameId;

  const items = gameId
    ? [
        { to: `/games/${gameId}/matches`, label: "Matcher", icon: CalendarDays },
        { to: `/games/${gameId}/my-picks`, label: "Mina tips", icon: ListChecks },
        { to: `/games/${gameId}/bonus`, label: "Bonus", icon: Sparkles },
        { to: `/games/${gameId}/leaderboard`, label: "Tabell", icon: Trophy },
        { to: `/profile`, label: "Profil", icon: User },
      ]
    : [
        { to: `/games`, label: "Spel", icon: Trophy },
        { to: `/profile`, label: "Profil", icon: User },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium",
                active ? "text-gold" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
