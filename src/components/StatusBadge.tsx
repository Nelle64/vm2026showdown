import { cn } from "@/lib/utils";

type Status = "scheduled" | "locked" | "live" | "finished" | "postponed" | "cancelled";

const labels: Record<Status, string> = {
  scheduled: "Öppen",
  locked: "Låst",
  live: "Live",
  finished: "Avslutad",
  postponed: "Skjuten",
  cancelled: "Inställd",
};

export function StatusBadge({ status, kickoffAt }: { status: Status; kickoffAt?: string }) {
  // Härleda "locked" om scheduled och < 1 min till avspark
  let s = status;
  if (s === "scheduled" && kickoffAt) {
    const diff = new Date(kickoffAt).getTime() - Date.now();
    if (diff <= 60_000) s = "locked";
  }
  const styles: Record<Status, string> = {
    scheduled: "bg-muted text-muted-foreground border-border",
    locked: "bg-secondary text-foreground border-border",
    live: "bg-live text-live-foreground border-live live-pulse",
    finished: "bg-success/20 text-success border-success/40",
    postponed: "bg-muted text-muted-foreground",
    cancelled: "bg-destructive/20 text-destructive border-destructive/40",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", styles[s])}>
      {s === "live" && <span className="h-1.5 w-1.5 rounded-full bg-live-foreground" />}
      {labels[s]}
    </span>
  );
}
