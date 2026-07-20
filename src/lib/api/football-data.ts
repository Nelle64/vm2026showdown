import type { FootballProvider, ApiMatch, ApiTeam } from "./provider";
import { flagFromFifaOrTla as flagFromTla } from "./fifa-iso";

// football-data.org provider. Gratisplanen täcker VM (competition code "WC").
// Auth: X-Auth-Token header.
const BASE = "https://api.football-data.org/v4";
const COMP = "WC";

export function footballDataProvider(apiKey: string): FootballProvider {
  const headers = { "X-Auth-Token": apiKey };

  return {
    name: "football-data",
    async fetchTeams() {
      const res = await fetch(`${BASE}/competitions/${COMP}/teams`, { headers });
      if (!res.ok) throw new Error(`football-data teams ${res.status}: ${await res.text()}`);
      const json = await res.json();
      return (json.teams ?? []).map(
        (t: any): ApiTeam => ({
          externalId: String(t.id),
          code: t.tla ?? (t.shortName ?? t.name).slice(0, 3).toUpperCase(),
          name: t.shortName ?? t.name,
          flag: flagFromTla(t.tla),
        }),
      );
    },
    async fetchMatches() {
      const res = await fetch(`${BASE}/competitions/${COMP}/matches`, { headers });
      if (!res.ok) throw new Error(`football-data matches ${res.status}: ${await res.text()}`);
      const json = await res.json();
      return (json.matches ?? []).map((m: any): ApiMatch => {
        // Vi tippar på resultat efter ordinarie tid (90 min) — inte ET/straffar.
        // football-data: score.regularTime finns när matchen gick till förlängning,
        // annars är score.fullTime redan 90 min-resultatet.
        const reg = m.score?.regularTime;
        const ft = m.score?.fullTime;
        const homeScore = reg?.home ?? ft?.home ?? null;
        const awayScore = reg?.away ?? ft?.away ?? null;
        return {
          externalId: String(m.id),
          homeTeamCode:
            m.homeTeam?.tla ??
            (m.homeTeam?.shortName ?? m.homeTeam?.name ?? "").slice(0, 3).toUpperCase(),
          awayTeamCode:
            m.awayTeam?.tla ??
            (m.awayTeam?.shortName ?? m.awayTeam?.name ?? "").slice(0, 3).toUpperCase(),
          kickoffISO: m.utcDate,
          status: mapStatus(m.status),
          homeScore,
          awayScore,
          stage: (m.stage ?? "GROUP_STAGE").toLowerCase().includes("group") ? "group" : "knockout",
          group: m.group ? String(m.group).replace(/^GROUP_/i, "") : undefined,
          venue: m.venue ?? undefined,
        };
      });
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
