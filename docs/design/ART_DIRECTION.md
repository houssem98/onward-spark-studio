# Art Direction

L9 T3 of `docs/loops/L9_CRAFT.md`. Three directions for BankIntelli, stated as token deltas only, previewed on the Executive Overview, critiqued, and one recommended. The human picks in L9 T4; L9 T5 applies the pick. Nothing here is in the product yet.

## Design context

Taken from the human's roadmap, not inferred from code: banking executives, risk, crime, data and model teams doing decision work in office daylight, often printing or exporting (`BankIntelli_Elite_Premium_Design_Roadmap.md#Premium and composed, not flashy.`). That context sets a light theme. The roadmap fixes three visual rules every direction is judged against: deep navy or ink carries navigation (`BankIntelli_Elite_Premium_Design_Roadmap.md#deep navy/ink for navigation and structural hierarchy`), one restrained accent (`BankIntelli_Elite_Premium_Design_Roadmap.md#one restrained blue/teal accent for active state and key`), and no metric as its own floating card (`BankIntelli_Elite_Premium_Design_Roadmap.md#avoid every metric becoming a separate floating card.`).

Brand voice, three words: composed, exacting, accountable. The physical object: a central bank's annual statistical bulletin, printed on heavy uncoated paper.

## Method

Each direction is a block of CSS custom properties plus a font pair, injected into the running app at runtime with Playwright and never written to the repository. Captured 2026-11-01 against `vite dev` at 1440×900 and 390×844 with reduced motion on. Palette, surfaces, radius and type family are previewed. Density and the type scale are stated below but not previewed, because density has no token yet; L9 T5 creates one.

Fonts load from one Google Fonts link, which loaded IBM Plex when these previews were made and loads the chosen pair since L9 T5 (`src/routes/__root.tsx#family=Public+Sans:wght@400;500;600;700&family=Spectral:wght@500;600`). Changing the family edits that link; it adds no package and no new host.

Why the font is on the table at all: IBM Plex Sans and Mono are on the impeccable skill's list of reflex fonts (training-data defaults that make products look alike). That is a reason to consider a change, not a defect; keeping Plex is a valid T4 answer.

## The three directions

| Token | Today | A · Institutional Intelligence | B · Modern Financial Intelligence | C · Premium Banking Operations |
|---|---|---|---|---|
| Background | cool off-white, L 0.975 | warm paper, L 0.972, hue 80 | cool near-white, L 0.982 | neutral grey, L 0.955 |
| Card | pure white | tinted paper, L 0.992 | tinted, L 0.997 | tinted, L 0.99 |
| Primary | bright blue, L 0.54 C 0.17 | deep navy, L 0.36 C 0.09 | vivid indigo, L 0.52 C 0.19 | steel blue, L 0.45 C 0.08 |
| Accent | blue | teal, active nav and focus | indigo | steel |
| Sidebar | ink navy | ink navy, teal active item | light grey, indigo active item | graphite |
| Borders | cool hairline | warm hairline | cool hairline | stronger grey, L 0.86 |
| Shadow | soft two-layer | one 1 px rule, lift on hover only | soft, deep | none; lift is a 1 px accent ring |
| Radius | 10 px | 6 px | 14 px | 4 px |
| Type | IBM Plex Sans + Plex Mono figures | Spectral (headings) + Public Sans (UI, tabular figures) | Schibsted Grotesk (headings) + Hanken Grotesk (UI) | Libre Franklin only, tabular figures |
| Density (stated) | comfortable | compact tables, comfortable panels | comfortable | dense everywhere |
| Motion personality (stated) | page fade 320 ms | calm: 160 to 260 ms, standard easing, 40 ms stagger | expressive: up to 300 ms, staggered reveals | minimal: 120 to 160 ms, no stagger |

## Previews

Session scratchpad, not the repository (folder l9t3 under the session's scratchpad directory; they do not survive the session):

1. a-1440.png and a-390.png (Institutional Intelligence)
2. b-1440.png and b-390.png (Modern Financial Intelligence)
3. c-1440.png and c-390.png (Premium Banking Operations)

Control: current-1440.png and current-390.png, today's tokens.

## Critiques

Lenses: the frontend-design skill (commit to one intentional direction; distinctive type; dominant colour with a sharp accent; WCAG AA contrast) and the impeccable skill (the "would anyone believe AI made this" test; tinted neutrals, no pure white; no reflex fonts; no hero-metric template; no decorative sparklines; no cards for everything).

**A · Institutional Intelligence.** The only direction that reads as a bank rather than a software product. The Spectral headings give the page the gravity of a printed report, while Public Sans keeps controls and tables plain and legible, and its tabular figures replace the monospace values, which impeccable flags as lazy "technical" shorthand. The navy primary and teal active state follow the roadmap's navy-plus-one-accent rule literally; the warm paper with tinted cards removes the pure white card the theme had before L9 T5 (`src/styles.css#--card: oklch(0.992 0.003 80);` now). Risks: a serif on small panel titles ("Financial performance") reads slightly literary, so the serif should stop at h1 and h2; the cool blue hero illustration clashes with the warm ground, which is one more reason to remove it in T6. Contrast: muted text at L 0.50 on L 0.972 needs the T5 test to confirm 4.5:1.

**B · Modern Financial Intelligence.** Polished, and generic: a vivid indigo primary on near-white with a light sidebar and large radii fails impeccable's test, because it looks like most SaaS dashboards of the last two years. It also breaks a roadmap rule: a light sidebar gives up navy as the structural colour. The grotesk pair is good but does not rescue the palette. Best for a product that wants to look new; worst at looking trustworthy.

**C · Premium Banking Operations.** Exact and quiet: graphite, steel and 4 px corners give tables the discipline of a financial newspaper, and Libre Franklin's tabular figures align well. As previewed it is austere rather than premium: with no warmth and no hierarchy beyond weight, executives get an operations console. A single family also gives headings no contrast with body text. Its strengths (tight radius, firm table rules, minimal motion) are worth borrowing; as a whole direction it undersells the executive surfaces.

**Across all three.** The tokens change less than the composition does. In every preview the decorative city hero and the grid of identical KPI cards with sparklines dominate the page (the impeccable "hero metric" pattern, and `docs/audit/VISUAL_BASELINE.md#8 KPI tiles where the roadmap asks for 4 to 6`); no palette fixes that, and L9 T6 owns it. The charts below the fold were still blank when each capture fired, because Recharts animates in JavaScript and ignores reduced motion (`docs/audit/TRUST_FINDINGS.md#F39 · low · Charts still animate when the user asks for reduced motion`), which L10 T3 fixes.

## Recommendation

**A, Institutional Intelligence**, with three things borrowed from C: a 6 px radius instead of 10, firm table rules, and C's minimal motion for table and form feedback (A's calmer timings stay for page and chart entrances). Reasons, each tied to the roadmap's desired feel: "premium and composed, not flashy" (warm paper and a navy primary, no vivid accent); "quiet surfaces, restrained color and excellent tables" (hairlines, no float shadows, tabular figures in a UI face); "deep navy/ink for navigation" (kept, unlike B); "one restrained blue/teal accent" (teal, used only for active state and focus).

Questions for the human in L9 T4:

1. Direction: A (recommended), B or C, or A with changes.
2. Font: Spectral + Public Sans (recommended with A), keep IBM Plex, or another pair.
3. Exploration: allow OpenDesign or UI UX Pro Max outside the repository, or not (recommended: not needed now that the previews exist).
