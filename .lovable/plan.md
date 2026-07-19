## Ny frågetyp: "Sammansatt" + närmast-poäng

Bygger ett flexibelt rättningssystem där admin kan skapa frågor med flera delsvar och sätta olika poäng per del, inkl. "närmast inom marginal" för siffror.

### Så här kommer det fungera för admin

När du skapar en bonusfråga får du välja typ:
- **Fritext / Antal / Spelare / Lag / Flerval** – som idag (all-or-nothing)
- **Antal (med närmast)** – ny: exakt-poäng + närmast-poäng inom en marginal du väljer
- **Sammansatt** – ny: du bygger frågan med flera delfält, t.ex.
  - Del 1: "Målskytt" (text) – 1 p
  - Del 2: "Minut" (siffra) – 3 p exakt, 1 p om inom ±2 min

Vid rättning fyller du i rätt svar per del. Poängen räknas ihop per spelare automatiskt.

### Exempel: "Vem gör första målet och i vilken minut?"

```text
Del 1: Målskytt          [text]      exakt: 1p
Del 2: Minut             [antal]     exakt: 3p   närmast ±2 min: 1p
```

Spelare A tippar "Mbappé, 34". Rätt svar: "Mbappé, 33".
→ 1p (målskytt) + 1p (närmast, diff 1 ≤ 2) = **2p**

Spelare B tippar "Kane, 33". → 0p + 3p = **3p**

### Spelarens vy

Under en sammansatt fråga visas ett fält per del. Efter lås visas allas svar per del, och rätt svar markeras när frågan är rättad.

### Tekniska detaljer

1. **DB-migration** för `bonus_questions`:
   - `answer_type` får två nya värden: `number_closest` och `composite`.
   - `options` (JSONB) används för `composite` som `{ parts: [{ key, label, kind: "text"|"number", points_exact, points_closest?, margin? }] }` och för `number_closest` som `{ points_exact, points_closest, margin }`.
   - `correct_answer` blir `{ [key]: value }` för composite, `{ value: n }` för number_closest.
   - `bonus_answers.answer` blir `{ [key]: value }` för composite.

2. **Ersätt trigger `settle_bonus_question`** med logik som:
   - För `text/number/player/team/multiple_choice`: nuvarande all-or-nothing.
   - För `number_closest`: räkna exakt eller |diff| ≤ margin.
   - För `composite`: loopa parts, summera per part (exakt eller närmast för number-parts).
   - Uppdatera `profiles.total_points` efter rättning (som idag).

3. **Admin-UI** (`_authenticated.games.$gameId.admin.tsx`):
   - Byt formuläret till att stödja composite: lägg till/ta bort delfält med kind + poäng + marginal.
   - `SettleRow` för composite renderar ett rätt-svar-fält per del.

4. **Spelar-UI** (`_authenticated.games.$gameId.bonus.tsx`):
   - Renderar delfält per part för composite. Sparar `{ [key]: value }`.
   - "Allas svar"-sektionen (som du fick nyss) visar en rad per spelare med kolumner per del.

5. **Poängvisning i admin-listan** förblir `q.points` som total – jag räknar om detta som summan av parts vid render.

### Vad jag inte ändrar

- Befintliga frågor och svar rörs inte – de fortsätter fungera som förr.
- Poängställningarna (matcher vs bonus) håller sin uppdelning.
- Match-tips-systemet lämnas orört.