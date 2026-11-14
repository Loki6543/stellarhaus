# Z-PELE Live — Bundesliga

Self-updating club rating, season simulator and betting-edge detector for the **2026-27 Bundesliga**.

```
 FBref (stats + fixtures) ─┐
                           ├─▶ pipeline/ (Z-PELE + season MC) ─▶ data/snapshot.json ─▶ server/ (Express) ─▶ client/ (React)
 Polymarket (outrights) ───┘
```

## Quick start

```bash
cd z-pele-live
python3 -m pipeline.main            # 10k season sims, ~1s  (python3 -m pipeline.main 50000 for more)

cd server && npm install && npm run dev      # :4000
cd client && npm install && npm run dev      # :5173  → open http://localhost:5173
```

## Data sources

| Source | What | Refresh |
| --- | --- | --- |
| [FBref Bundesliga](https://fbref.com/en/comps/20/Bundesliga-Stats) | league table, last-5 form, squad standard / goalkeeping / shooting stats (own + opponent) | `FIRECRAWL_API_KEY=… python3 -m pipeline.main` scrapes live; otherwise the cached pages in `data/raw/fbref_*.md` are used |
| [FBref fixtures](https://fbref.com/en/comps/20/schedule/Bundesliga-Scores-and-Fixtures) | all 306 fixtures + results | same as above |
| Polymarket Gamma API | Champion, Top-4 finish, Relegated markets | live on every run, falls back to `data/raw/polymarket_events.json` |

FBref sits behind Cloudflare, so direct scripted requests are usually blocked — Firecrawl gets through and returns the Markdown the parser expects.
FBref no longer carries Opta xG, so **shots on target** stand in for underlying performance.

## Model

**Z-PELE layers** (each z-scored across the 18 clubs, 50 = league average):

| Layer | Label | Signal | Weight |
| --- | --- | --- | --- |
| L0 | Defence | non-penalty goals conceded / match | 14% |
| L1 | Attack | (npG + assists) / match | 12% |
| L3 | Form | points from the last 5 | 14% |
| L4 | Pts/MP | season points per match | 16% |
| L7 | Market | Polymarket title / top-4 / relegation consensus | 16% |
| L10 | Goalkeeping | save % | 8% |
| L11 | Shot dominance | share of shots on target (xG proxy) | 20% |

**Season Monte Carlo** (`pipeline/simulator.py`): Poisson attack/defence strengths from goals + shots on target, shrunk toward the market prior (10 virtual matches), with per-simulation strength noise so early-season projections stay honest. Simulates every remaining fixture → title, top-4, top-6, relegation play-off (16th), relegation, expected points with 80% range, and the full finishing-position distribution. Also prices the next matchday (home/draw/away, xG, likeliest score).

**Edges** (`pipeline/market.py`): compares the model with every Polymarket outright on **both sides** (YES when the model is higher, NO when it is lower). BET = edge ≥ 5 pts, confidence ≥ 60%, liquidity ≥ $5k (`Z_PELE_MIN_LIQUIDITY`), positive EV after the 2% fee. Sizing = fractional Kelly by confidence tier, capped at 2% of bankroll (`Z_PELE_BANKROLL`, default $10k).

## Endpoints

```
GET /api/health            liveness + competition metadata
GET /api/snapshot          everything
GET /api/table             current FBref table
GET /api/ratings[/:team]   Z-PELE ratings
GET /api/mc                season projections
GET /api/fixtures/next     next matchday predictions
GET /api/edges             ?recommendation=BET&market=title|top4|relegated
GET /api/framework         layer weights + labels
```

## Dashboard panels

Projected final table (with form + zone colouring) · Next-matchday predictions · Polymarket edges (filter by market) · Z-PELE ratings · Finishing-position heatmap.

## Notes

- The server hot-reloads `snapshot.json`; schedule the pipeline (cron / GitHub Actions) after each matchday.
- Read-only: no automated bet placement. Small Polymarket books (most top-4 markets hold < $1k) are deliberately kept at MONITOR.
