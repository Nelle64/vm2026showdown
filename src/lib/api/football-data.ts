import type { FootballProvider, ApiMatch, ApiTeam } from "./provider";

// football-data.org provider. Gratisplanen täcker VM (competition code "WC").
// Auth: X-Auth-Token header.
const BASE = "https://api.football-data.org/v4";
const COMP = "WC";

// ISO landskod -> flagg-emoji
function flagFromTla(tla?: string | null): string | undefined {
  if (!tla || tla.length < 2) return undefined;
  const two = tla.slice(0, 2).toUpperCase();
  const A = 0x41, base = 0x1f1e6;
  const cps = [...two].map((c) => base + (c.charCodeAt(0) - A));
  if (cps.some((cp) => cp < base || cp > base + 25)) return undefined;
  return String.fromCodePoint(...cps);
}

export function footballDataProvider(apiKey: string): FootballProvider {
  const headers = { "X-Auth-Token": apiKey };

  return {
    name: "football-data",
    async fetchTeams() {
      const res = await fetch(`${BASE}/competitions/${COMP}/teams`, { headers });
      if (!res.ok) throw new Error(`football-data teams ${res.status}: ${await res.text()}`);
      const json = await res.json();
      return (json.teams ?? []).map((t: any): ApiTeam => ({
        externalId: String(t.id),
        code: t.tla ?? (t.shortName ?? t.name).slice(0, 3).toUpperCase(),
        name: t.shortName ?? t.name,
        flag: flagFromTla(t.tla),
      }));
    },
    async fetchMatches() {
      const res = await fetch(`${BASE}/competitions/${COMP}/matches`, { headers });
      if (!res.ok) throw new Error(`football-data matches ${res.status}: ${await res.text()}`);
      const json = await res.json();
      return (json.matches ?? []).map((m: any): ApiMatch => ({
        externalId: String(m.id),
        homeTeamCode: m.homeTeam?.tla ?? (m.homeTeam?.shortName ?? m.homeTeam?.name ?? "").slice(0, 3).toUpperCase(),
        awayTeamCode: m.awayTeam?.tla ?? (m.awayTeam?.shortName ?? m.awayTeam?.name ?? "").slice(0, 3).toUpperCase(),
        kickoffISO: m.utcDate,
        status: mapStatus(m.status),
        homeScore: m.score?.fullTime?.home ?? null,
        awayScore: m.score?.fullTime?.away ?? null,
        stage: (m.stage ?? "GROUP_STAGE").toLowerCase().includes("group") ? "group" : "knockout",
        group: m.group ? String(m.group).replace(/^GROUP_/i, "") : undefined,
        venue: m.venue ?? undefined,
      }));
    },
  };
}

function mapStatus(s: string): ApiMatch["status"] {
  switch (s) {
    case "FINISHED":
    case "AWARDED":
      return "finished";
    case "IN_PLAY":
    case "PAUSED":
    case "LIVE":
      return "live";
    case "POSTPONED":
    case "SUSPENDED":
      return "postponed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "scheduled";
  }
}
