// API-adapter: byt leverantör genom att ändra default-exporten.
// Stöd för API-Football (RapidAPI) finns i ./api-football.ts.
// Saknas API-nyckel används mockdata (databas-seedade matcher).

export interface ApiTeam {
  externalId: string;
  code: string;
  name: string;
  group?: string;
  flag?: string;
}

export interface ApiMatch {
  externalId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  kickoffISO: string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  homeScore: number | null;
  awayScore: number | null;
  stage: string;
  group?: string;
  venue?: string;
}

export interface FootballProvider {
  name: string;
  fetchTeams(): Promise<ApiTeam[]>;
  fetchMatches(): Promise<ApiMatch[]>;
}

import { mockProvider } from "./mock-provider";
import { apiFootballProvider } from "./api-football";
import { footballDataProvider } from "./football-data";

export function getProvider(): FootballProvider {
  // Föredra football-data.org (har VM 2026 gratis). Fallback: api-football, annars mock.
  const fdKey = typeof process !== "undefined" ? process.env.FOOTBALL_DATA_API_KEY : undefined;
  if (fdKey) return footballDataProvider(fdKey);
  const afKey = typeof process !== "undefined" ? process.env.API_FOOTBALL_KEY : undefined;
  if (afKey) return apiFootballProvider(afKey);
  return mockProvider;
}
