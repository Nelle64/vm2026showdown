import type { FootballProvider, ApiMatch, ApiTeam } from "./provider";

// Skeleton för API-Football (RapidAPI).
// VM 2026 har league-ID 1 hos API-Football.
// Lägg din nyckel i secrets som API_FOOTBALL_KEY så aktiveras providern automatiskt.

const BASE = "https://v3.football.api-sports.io";
const WC_LEAGUE = 1;
const SEASON = 2026;

export function apiFootballProvider(apiKey: string): FootballProvider {
  const headers = { "x-apisports-key": apiKey };

  return {
    name: "api-football",
    async fetchTeams() {
      const res = await fetch(`${BASE}/teams?league=${WC_LEAGUE}&season=${SEASON}`, { headers });
      const json = await res.json();
      return (json.response ?? []).map(
        (t: any): ApiTeam => ({
          externalId: String(t.team.id),
          code: t.team.code ?? t.team.name.slice(0, 3).toUpperCase(),
          name: t.team.name,
          flag: t.team.flag,
        }),
      );
    },
    async fetchMatches() {
      const res = await fetch(`${BASE}/fixtures?league=${WC_LEAGUE}&season=${SEASON}`, { headers });
      const json = await res.json();
      return (json.response ?? []).map((f: any): ApiMatch => {
        // Tippning baseras på 90 min — score.fulltime, inte goals (som inkluderar ET/straffar).
        const home = f.score?.fulltime?.home ?? f.goals?.home ?? null;
        const away = f.score?.fulltime?.away ?? f.goals?.away ?? null;
        return {
          externalId: String(f.fixture.id),
          homeTeamCode: f.teams.home.code ?? f.teams.home.name.slice(0, 3).toUpperCase(),
          awayTeamCode: f.teams.away.code ?? f.teams.away.name.slice(0, 3).toUpperCase(),
          kickoffISO: f.fixture.date,
          status: mapStatus(f.fixture.status.short),
          homeScore: home,
          awayScore: away,
          stage: f.league.round?.toLowerCase().includes("group") ? "group" : "knockout",
          venue: f.fixture.venue?.name,
        };
      });
    },
  };
}

function mapStatus(s: string): ApiMatch["status"] {
  if (["FT", "AET", "PEN"].includes(s)) return "finished";
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(s)) return "live";
  if (s === "PST") return "postponed";
  if (["CANC", "ABD", "AWD", "WO"].includes(s)) return "cancelled";
  return "scheduled";
}
