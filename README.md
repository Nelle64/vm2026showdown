# VM 2026 Showdown

En privat tipping-app för FIFA World Cup 2026. Skapa en liga, bjud in vänner, tippa matcher, svara på bonusfrågor och följ en live leaderboard – allt i en mobilanpassad webbapp.

> Byggd med [Lovable](https://lovable.dev) och publicerad på `vm2026showdown.lovable.app`.

---

## Funktioner

- 🔐 **Auth** – Inloggning med Google via Supabase Auth.
- 🏆 **Spel / ligor** – Skapa privata spel, generera invite-koder och låt admin godkänna ansökningar.
- ⚽ **Matchtippning** – Tippa alla VM-matcher. Matcher låses antingen per match eller per omgång med en deadline som admin styr.
- 🔒 **Lock modes** – Välj mellan `per_match` (lås 1 minut före avspark) eller `per_round` (lås alla matcher i omgången vid en gemensam deadline).
- 📊 **Leaderboard** – Live-poängställning med exakta resultat, rätt utfall och pricksäkerhet.
- ❓ **Bonusfrågor** – Flera frågetyper: flervalsfrågor, fritext, numeriskt med närmast-rätt och sammansatta frågor. Separat bonus-poänglista.
- 🏟️ **Turneringsvy** – Gruppspelstabeller och knockout-träd, allt expanderbart.
- 🥇 **Summeringssida** – Podium för topp 3 och mängder av "fun facts" om spelarnas tips.
- 🔔 **Realtime** – Leaderboard och admin-vyer uppdateras live via Supabase Realtime.
- 📱 **Mobilanpassad** – Bottom navigation och responsiva vyer.

---

## Teknikstack

| Del | Teknik |
|-----|--------|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19 + Vite 7) |
| Styling | Tailwind CSS v4 + shadcn/ui-komponenter |
| Backend / DB / Auth | Lovable Cloud (Supabase) |
| API för matchdata | [football-data.org](https://www.football-data.org) |
| Språk | TypeScript |
| Package manager | Bun |

---

## Kom igång lokalt

### Förutsättningar

- [Bun](https://bun.sh) installerat
- Ett Supabase-projekt (via Lovable Cloud eller eget)
- En API-nyckel från [football-data.org](https://www.football-data.org)

### Installation

```bash
bun install
```

### Miljövariabler

Kopiera `.env` och fyll i dina värden:

```bash
VITE_SUPABASE_URL=https://<ditt-projekt>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<din-anon-key>
FOOTBALL_DATA_API_KEY=<din-football-data-nyckel>
```

> Server-side variabler som `FOOTBALL_DATA_API_KEY` läses i `createServerFn`-handlers, inte i klientkoden.

### Kör utvecklingsservern

```bash
bun dev
```

Appen startar normalt på `http://localhost:8080`.

### Bygg för produktion

```bash
bun run build
```

---

## Projektstruktur

```text
src/
  components/        # Återanvändbara UI-komponenter (shadcn/ui + egna)
  hooks/             # React-hooks
  integrations/      # Supabase-klienter och auth-hjälpare (auto-genererade)
  lib/               # API-klienter, server functions, utilities
  routes/            # TanStack file-based routes
  router.tsx         # Router-konfiguration
  server.ts          # Server setup
  start.ts           # Start-konfiguration med middleware
  styles.css         # Global CSS + Tailwind-teman
supabase/
  migrations/        # Databasmigrationer
public/              # Statiska tillgångar, manifest.webmanifest
```

---

## Databas & säkerhet

- Alla tabeller ligger i `public`-schemat med **Row Level Security (RLS)** aktiverat.
- Roller hanteras via en separat `user_roles`-tabell (aldrig i `profiles`).
- Admins verifieras server-side via `has_role()`-funktioner, inte client-side storage.
- Poängberäkning sker via Postgres-triggers och RPC-funktioner.
- Synkning mot football-data.org sker via en publik endpoint under `/api/public/sync` (anropas av `pg_cron` eller manuellt i adminpanelen).

---

## Viktiga kommandon

| Kommando | Beskrivning |
|----------|-------------|
| `bun dev` | Starta utvecklingsserver |
| `bun run build` | Bygg produktionsversion |
| `bun run build:dev` | Bygg i development-läge |
| `bun run preview` | Förhandsgranska produktionsbygge |
| `bun run lint` | Kör ESLint |
| `bun run format` | Formatera med Prettier |

---

## Publicering

Projektet är kopplat till GitHub via Lovable's tvåvägs-synk. Ändringar pushas automatiskt till GitHub, och ändringar i GitHub synkas tillbaka.

Live-URL: `https://vm2026showdown.lovable.app`

---

## Licens

Privat projekt. Ingen öppen källkodslicens.
