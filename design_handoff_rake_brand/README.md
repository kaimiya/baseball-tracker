# Handoff: Rake — Brand & Product System

## Overview
Rake is a fantasy-baseball stat tracker: live category standings and real-money payouts
for money leagues. This bundle documents the locked v1.0 brand + product design language
and the core product screens (mobile app + web league board + marketing surfaces).

Positioning: **premium, trustworthy, data-first — a scoreboard you can bet on.** The
identity earns that with restraint: warm paper, deep ink, one confident blue, and figures
that always line up.

## About the Design Files
The files in this bundle are **design references authored in HTML** — a prototype showing
the intended look, type, color, and layout. They are **not production code to copy verbatim.**

`Rake - Brand & Product.dc.html` is a "Design Component" — it uses a small runtime
(`support.js`) and renders the dot-matrix mark via JS. Open it in a browser to view; treat
it as the visual source of truth.

**The task is to recreate these designs in the target codebase's existing environment**
(the live app is client-rendered React/Next on Vercel — `if-can-can.vercel.app`), using its
established components and patterns. Rebuild the marks/icons as inline SVG or a small React
component rather than porting the JS dot-grid generator.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and layout are final. Recreate pixel-close
using the codebase's own primitives. The one open data point is noted under *Open items*.

## Design Tokens

### Color
| Token            | Hex       | Use                                             |
|------------------|-----------|-------------------------------------------------|
| Honolulu Blue    | `#0076B6` | THE accent. Numbers, leading/winning stats, primary button, mark on tiles |
| Deep Honolulu    | `#015B8C` | Links, hover                                    |
| Link hover (alt) | `#0076B6` | `a:hover`                                        |
| Ink             | `#1A1611` | Primary text, "black", dark panels              |
| Blue Tint       | `#E5F1F8` | Subtle "current/live" chip background           |
| Sand Paper      | `#F6F2E9` | Surface (cards, marketing panels)               |
| Warm Sand       | `#EFEADD` / `#EFE9DB` | Deep page bg / hairline dividers (`#EFEADD`) |
| Off-White       | `#FBFAF6` | App surface                                      |
| Warm Grey       | `#8A7F68` | Meta / secondary text                           |
| Muted label     | `#A79C85` | Micro labels                                     |
| Body-on-ink     | `#B8AE9A` | Secondary text on ink                           |
| Row value       | `#544D3F` | Non-leading tabular figures in tables           |
| Avatar bg       | `#EFEADD` | Team initial chips                              |
| Alert red       | `#B94A2E` | Negative/"slipping" state ONLY (used sparingly) |
| Live red        | `#D23B22` | LIVE badge dot + label                          |

**Rule:** blue means something — reserve it for what's live, leading, winning, or a number.
Everything else is sand + ink. Do **not** re-introduce tinted pills or colored accent
borders (no `border-top`/`border-left` accent stripes on cards).

### Typography
- **Bricolage Grotesque** (600/700/800) — display + wordmark ONLY. Headlines, screen
  titles, the lowercase `rake` wordmark. Negative tracking (`-0.02em` to `-0.045em`).
- **Sora** (400/500/600/700/800) — all UI, labels, and **every number**. Numbers always
  `font-variant-numeric: tabular-nums`.
- **No all-caps + letter-spacing labels.** Eyebrows/labels are sentence case at normal
  tracking. (Table column abbreviations like HR / AVG / ERA stay uppercase because that's
  their natural form — but no added `letter-spacing`.)
- Table/stat figures are **regular weight (400–500), not bold.**

### Radius
App/marketing cards `18–28px`; app-icon tile `20–31px`; phone frame `36px`; inputs/buttons
`8–12px`; small chips `5–8px`; team avatar `50%`.

### Shadow
- Phone mock: `0 34px 70px rgba(0,0,0,.45)`
- Web board: `0 30px 70px rgba(26,22,17,.22)`
- Glass hero card (on ink): `inset 0 1px 0 rgba(255,255,255,.18), 0 22px 46px rgba(0,0,0,.45)`

### Layout
Content max-width `1120px`, section padding `~56–88px` vertical / `48px` horizontal.
Prefer flex/grid with `gap`. Emphasis is **editorial**: hairline row dividers
(`1px solid #EFEADD`), not boxed/bordered cards.

## The Mark
A capital **R** drawn on a dot grid (nod to stadium boards / box scores) — flat, no glow.
- **Fine cut:** 5×7 grid, letter rows `["11110","10001","10001","11110","10100","10010","10001"]`.
  Round dots, `border-radius ≈ 16%` of dot size, grid gap ≈ `12%` of dot size.
- **Coarse cut** (favicon / ≤24px): 4-wide × 5-row `["111","101","111","110","101"]`.
- Wordmark is lowercase `rake` in Bricolage 800; the mark carries the capital.
- Colorways: cream (`#F6F2E9`) on blue, ink on sand, cream on ink. Clearspace = height of the R.
- App icon = mark on a `#0076B6` rounded tile; mono tile = mark on `#1A1611`.

Implement as inline SVG (rects) or a tiny component that maps the bit-rows to dots.

## Icons
Same dot-grid system as the mark (flat, ink by default; blue when live/leading, red when
slipping). Set: trophy, medal, diamond, baseball, up, down, check, dollar, flame.
**Tab-bar icons** (same dot system): Standings = ascending bars, Awards = trophy,
Splits = stacked rows/table. Active `#0076B6`, inactive `#B2A78E`.
**The crown/"category king" glyph was removed — do not use it.** Bit-rows for each glyph are
in the prototype's logic (`ic` map). Rebuild as SVG.

## Screens / Views

### 1. Mobile — Standings
- Status bar → league header (mark tile + "If Can Can" in Bricolage + "2026 · Standings").
- Ranked list, 6+ rows. Grid `22px 24px 1fr auto`: rank # (grey tabular), team initial
  avatar, team name (Sora 500, 14px) over W-L-T record (Sora 400, 11px, grey tabular),
  and a right-side "Leads N" note in blue for category leaders.
- Rows divided by `1px #EFEADD` hairlines (no boxes).
- Bottom tab bar: Standings / Awards / Splits with dot-grid icons (bars / trophy / rows) —
  active icon+label `#0076B6`, inactive icon `#B2A78E` / label `#A79C85`.

### 2. Mobile — King Category Awards
- Header: "King Category Awards" (Bricolage 700, 20px) + "Regular season leaders".
- **Borderless** stat rows separated by hairlines. Each row: left column = category label
  (Sora 500, 11px, grey) over team (avatar + name); right = the leading figure in
  **blue** (Sora 500, 26px, tabular). Categories: Home Runs 228, Batting Avg .264,
  Wins 86, Best ERA 3.31.

### 3. Mobile — Weekly Splits
- Team header (avatar + name + "108-51-9 · 1st of 8 · Kaili Miyamoto").
- Title "Weekly Splits", then a table: columns `Week | HR | AVG | W | ERA` (right-aligned
  numeric). Current week gets a small blue "Current" chip (`#E5F1F8` bg, `#0076B6` text).
  Figures Sora 400, `#544D3F`, tabular. Rows hairline-divided.

### 4. Web — League Board (`rake.gg/if-can-can/standings`)
- Browser chrome (sand) → app header: mark tile + "If Can Can, No Can Garbage Can"
  (Bricolage 700, 20px) + "2026 Season · 8 Teams"; right side: a **LIVE badge** (red `#D23B22`
  dot + "LIVE" in Sora 700, red), then "Updated 4:09 PM" + refresh /
  theme icon buttons (`30px`, `1px #E7E0D2`, `8px` radius).
- **King Category Awards**: 4-up borderless grid; columns divided by `1px #EFEADD`
  `border-left`. Each: label (Sora 500, 12px, grey) / figure (blue, Sora 500, 34px, tabular)
  / team (avatar + name).
- **Standings table**: header row `# | Team | Record | HR | AVG | Wins | ERA`
  (grid `30px 1fr 120px 62px 66px 62px 62px`). Numeric cols right-aligned, Sora 400 14px
  tabular. **The category leader's cell in each stat column is blue; all other figures are
  `#544D3F`.** Rows hairline-divided.

### 5. Marketing — Landing hero
- Two-column sand panel (radius `28px`). Left: mark + `rake` wordmark, headline in Bricolage
  800 52px ("Know exactly where your **money** stands." — "money" in blue), subcopy, primary
  button (`#0076B6`, white, `12px` radius) + ghost button (`1.5px #D8D0BF`), reassurance line.
- Right: ink→blue radial panel (`radial-gradient(130% 100% at 25% 15%, #0E2E44, #141712)`)
  holding a **glass** stat card (`rgba(255,255,255,.06)` + `1px rgba(255,255,255,.16)` +
  `backdrop-filter: blur(20px)`): "Net tonight" + big `+$200` + category chips
  (AVG/ERA/HR 1st in light blue, W 4th muted).
- Below: 3 feature cards (01/02/03 in blue Sora 800, Bricolage title, Sora body).

### 6. Marketing — Social share card (1200×630)
- Ink bg. Mark tile + `rake` (Bricolage 800, 72px). Headline "Know exactly where your
  **money** stands." ("money" in `#4FA6D4`). Bottom: tagline + glass "Net tonight +$200" chip.

## Interactions & Behavior
- **Standings row → Weekly Splits** for that team ("Select a team to see its weekly splits").
- Bottom tab bar / web nav switches between Standings, Awards, Splits.
- Header actions: manual refresh + light/dark toggle.
- Live data: category standings + figures update as games finish; "Updated <time>" reflects
  last sync. Leaders (blue figures / "Leads N") are derived per category from live data.
- Buttons: primary solid blue; hover → `#015B8C`. Links `#015B8C` / hover `#0076B6`.

## State Management
- League + season, list of teams (name, initial, W-L-T record, per-category figures,
  manager name), per-team weekly splits, category leaders (derived), last-sync timestamp,
  active tab, selected team, theme (light/dark). Data source: ESPN sync (per live app).

## Assets
- **Fonts:** Bricolage Grotesque + Sora (Google Fonts).
- **Mark & icons:** generated from dot-grid bit-rows in the prototype — no image files;
  rebuild as SVG/components.
- No third-party image assets in this bundle.

## Open items (confirm before shipping)
1. **Ty Dolla $ign record** is a placeholder (`66-90-6`) — replace with the real numbers.
2. **Accent color for leading stats:** prototype uses Rake blue (`#0076B6`); the live app
   currently uses red. Decide whether to standardize on blue or keep red.

## Files
- `Rake - Brand & Product.dc.html` — the full brand + product prototype (visual source of truth).
- `support.js` — runtime required to open the prototype in a browser.
