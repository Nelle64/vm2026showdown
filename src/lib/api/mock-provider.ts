import type { FootballProvider } from "./provider";

// Mock-provider: returnerar tomma listor. Datan ligger redan seedad i databasen.
export const mockProvider: FootballProvider = {
  name: "mock",
  async fetchTeams() {
    return [];
  },
  async fetchMatches() {
    return [];
  },
};
