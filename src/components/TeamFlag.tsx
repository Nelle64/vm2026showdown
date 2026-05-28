import "flag-icons/css/flag-icons.min.css";
import { FIFA_TO_ISO2 } from "@/lib/api/fifa-iso";
import { cn } from "@/lib/utils";

const SPECIAL_FLAG_CODES: Record<string, string> = {
  ENG: "gb-eng",
  SCO: "gb-sct",
  WAL: "gb-wls",
  NIR: "gb-nir",
};

function flagClassFromCode(code?: string | null) {
  if (!code) return null;
  const up = code.toUpperCase();
  const special = SPECIAL_FLAG_CODES[up];
  if (special) return special;
  const iso2 = FIFA_TO_ISO2[up] ?? (up.length === 2 ? up : null);
  return iso2 && iso2.length === 2 ? iso2.toLowerCase() : null;
}

export function TeamFlag({ code, label, className }: { code?: string | null; label?: string; className?: string }) {
  const flagCode = flagClassFromCode(code);

  if (!flagCode) {
    return <span className={cn("inline-block h-4 w-6 rounded-sm bg-muted align-middle", className)} aria-label={label ?? code ?? "Flagga"} />;
  }

  return (
    <span
      className={cn("fi fis rounded-[2px] shadow-sm", `fi-${flagCode}`, className)}
      aria-label={label ?? code ?? "Flagga"}
      role="img"
    />
  );
}