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

export function getProvider(): FootballProvider {
  // Server: process.env.API_FOOTBALL_KEY. Annars mock.
  const key = typeof process !== "undefined" ? process.env.API_FOOTBALL_KEY : undefined;
  if (key) return apiFootballProvider(key);
  return mockProvider;
}
