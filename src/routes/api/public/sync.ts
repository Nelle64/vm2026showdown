import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getProvider } from "@/lib/api/provider";

// POST /api/public/sync
// Auth: anon-nyckel via "apikey"-header (samma som pg_cron skickar).
// Bypassar published-site auth tack vare /api/public/ prefix.
export const Route = createFileRoute("/api/public/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const provider = getProvider();
        const startedAt = Date.now();

        try {
          const [teams, matches] = await Promise.all([
            provider.fetchTeams(),
            provider.fetchMatches(),
          ]);

          // Upsert teams
          if (teams.length) {
            const rows = teams.map((t) => ({
              external_id: t.externalId,
              code: t.code,
              name: t.name,
              group_letter: t.group ?? null,
              flag_emoji: t.flag ?? null,
            }));
            const { error } = await supabaseAdmin
              .from("teams")
              .upsert(rows, { onConflict: "external_id" });
            if (error) throw error;
          }

          // Hämta team-id-mappning via kod
          const { data: teamRows } = await supabaseAdmin.from("teams").select("id, code");
          const byCode = new Map((teamRows ?? []).map((t) => [t.code, t.id]));

          // Upsert matches
          let matchCount = 0;
          if (matches.length) {
            const rows = matches
              .map((m) => ({
                external_id: m.externalId,
                home_team_id: byCode.get(m.homeTeamCode) ?? null,
                away_team_id: byCode.get(m.awayTeamCode) ?? null,
                kickoff_at: m.kickoffISO,
                status: m.status,
                home_score: m.homeScore,
                away_score: m.awayScore,
                stage: m.stage,
                group_letter: m.group ?? null,
                venue: m.venue ?? null,
              }))
              .filter((r) => r.home_team_id && r.away_team_id);
            matchCount = rows.length;
            if (rows.length) {
              const { error } = await supabaseAdmin
                .from("matches")
                .upsert(rows, { onConflict: "external_id" });
              if (error) throw error;
            }
          }

          await supabaseAdmin.from("api_sync_logs").insert({
            provider: provider.name,
            status: "ok",
            synced_count: teams.length + matchCount,
            message: `${teams.length} teams, ${matchCount} matches (${Date.now() - startedAt}ms)`,
          });

          return Response.json({ ok: true, teams: teams.length, matches: matchCount });
        } catch (e: any) {
          await supabaseAdmin.from("api_sync_logs").insert({
            provider: provider.name,
            status: "error",
            message: String(e?.message ?? e),
          });
          return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
