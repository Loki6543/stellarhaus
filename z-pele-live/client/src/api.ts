// API client for Z-PELE Live — Bundesliga edition
const BASE = "";

export type Layer = "L0" | "L1" | "L3" | "L4" | "L7" | "L10" | "L11";

export interface TeamRating extends Record<Layer, number> {
  team: string;
  overall: number;
  conf: number;
}

export interface TableRow {
  rank: number;
  team: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  last5: ("W" | "D" | "L")[];
  top_scorer: string;
  goalkeeper: string;
}

export interface TeamProjection {
  title: number;
  top4: number;
  top6: number;
  playoff: number;
  auto_relegation: number;
  relegated: number;
  xpts: number;
  xgd: number;
  pts_p10: number;
  pts_p90: number;
  avg_position: number;
  position_dist: number[];
  attack: number;
  defence: number;
}

export interface MCResults {
  teams: Record<string, TeamProjection>;
  n_sims: number;
  remaining_fixtures: number;
  home_adv: number;
  goals_per_team_match: number;
}

export type MarketKind = "title" | "top4" | "relegated";

export interface Edge {
  team: string;
  market: MarketKind;
  market_label: string;
  side: "YES" | "NO";
  polymarket_price: number;
  polymarket_implied: number;
  mc_probability: number;
  edge_pct: number;
  ev_net: number;
  kelly_full: number;
  kelly_fraction: number;
  position_size_usd: number;
  volume: number;
  liquidity: number;
  recommendation: "BET" | "MONITOR" | "SKIP";
}

export interface MatchPrediction {
  wk: number;
  date: string;
  time: string;
  home: string;
  away: string;
  venue: string;
  home_win: number;
  draw: number;
  away_win: number;
  xg_home: number;
  xg_away: number;
  likely_score: string;
}

export interface Competition {
  name: string;
  season: string;
  matchday: number;
  matches_played: number;
  matches_total: number;
  source: string;
  source_url: string;
  stats_as_of: string;
  polymarket_source: string;
}

export interface Snapshot {
  generated_at: string;
  n_simulations: number;
  competition: Competition;
  framework: {
    name: string;
    version: string;
    layers: Layer[];
    labels: Record<Layer, string>;
    weights: Record<Layer, number>;
    regime: string;
  };
  table: TableRow[];
  ratings: Record<string, TeamRating>;
  mc: MCResults;
  next_matchday: { wk: number | null; matches: MatchPrediction[] };
  edges: Edge[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  health: () =>
    get<{ ok: boolean; snapshot_loaded: boolean; snapshot_loaded_at: string | null; generated_at: string | null }>(`/api/health`),
  snapshot: () => get<Snapshot>(`/api/snapshot`),
};
