import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Edge, type MarketKind, type Snapshot, type Layer } from "./api";

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const fmtPct = (v: number, digits = 1) => `${v.toFixed(digits)}%`;

function fmtUsd(v: number) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function recBadge(rec: Edge["recommendation"]) {
  const styles = {
    BET: "bg-zpele-good/20 text-zpele-good border-zpele-good/40",
    MONITOR: "bg-zpele-warn/20 text-zpele-warn border-zpele-warn/40",
    SKIP: "bg-zpele-panel text-zpele-accent/50 border-zpele-accent/20",
  }[rec];
  return `px-2 py-0.5 rounded text-xs border ${styles}`;
}

const Panel = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <section className="mb-8">
    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
      <h2 className="text-xl font-bold text-zpele-accent">{title}</h2>
      {right && <div className="text-sm text-zpele-accent/60">{right}</div>}
    </div>
    <div className="overflow-x-auto bg-zpele-panel border border-zpele-accent/20 rounded-lg">{children}</div>
  </section>
);

function Header({ snap }: { snap?: Snapshot }) {
  const { data } = useQuery({ queryKey: ["health"], queryFn: api.health, refetchInterval: 30_000 });
  const c = snap?.competition;
  return (
    <header className="border-b border-zpele-accent/20 bg-zpele-panel px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zpele-accent">Z-PELE Live · Bundesliga</h1>
          <p className="text-xs text-zpele-accent/60 mt-1">
            {c ? `${c.season} · Matchday ${c.matchday}/34 · ` : ""}FBref stats → Z-PELE ratings → season Monte Carlo → Polymarket edges
          </p>
        </div>
        <div className="text-right text-xs text-zpele-accent/60">
          <div>{data?.snapshot_loaded ? "Snapshot loaded" : "No snapshot"}</div>
          {data?.generated_at && <div>Model run: {new Date(data.generated_at).toLocaleString()}</div>}
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zpele-panel border border-zpele-accent/20 rounded-lg p-3">
      <div className="text-xs text-zpele-accent/60">{label}</div>
      <div className="text-lg font-semibold text-zpele-accent mt-1">{value}</div>
    </div>
  );
}

function Banner({ snap }: { snap: Snapshot }) {
  const c = snap.competition;
  const leader = Object.entries(snap.mc.teams).sort((a, b) => b[1].title - a[1].title)[0];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Stat label="Matches played" value={`${c.matches_played} / ${c.matches_total}`} />
      <Stat label="Season sims" value={snap.n_simulations.toLocaleString()} />
      <Stat label="Title favourite" value={`${leader[0]} ${pct(leader[1].title, 0)}`} />
      <Stat label="Home advantage" value={`×${snap.mc.home_adv.toFixed(2)} goals`} />
    </div>
  );
}

function ProjectedTable({ snap }: { snap: Snapshot }) {
  const rows = [...snap.table].sort((a, b) => snap.mc.teams[b.team].xpts - snap.mc.teams[a.team].xpts);
  const zone = (i: number) =>
    i < 4 ? "border-l-2 border-l-sky-400" : i < 6 ? "border-l-2 border-l-orange-400" : i === 15 ? "border-l-2 border-l-zpele-warn" : i >= 16 ? "border-l-2 border-l-zpele-danger" : "border-l-2 border-l-transparent";
  const bar = (v: number, color: string) => (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-1.5 bg-zpele-bg rounded overflow-hidden hidden sm:block">
        <div className={`h-full ${color}`} style={{ width: `${v * 100}%` }} />
      </div>
      <span className="w-12 font-mono">{v < 0.001 ? "–" : pct(v, v < 0.1 ? 1 : 0)}</span>
    </div>
  );
  return (
    <Panel title="Projected final table" right={`${snap.mc.remaining_fixtures} fixtures left · sorted by expected points`}>
      <table className="w-full text-xs">
        <thead className="text-zpele-accent/60 border-b border-zpele-accent/20">
          <tr>
            <th className="text-left px-3 py-2">Now</th>
            <th className="text-left px-2 py-2">Club</th>
            <th className="text-right px-2 py-2">MP</th>
            <th className="text-right px-2 py-2">GD</th>
            <th className="text-right px-2 py-2">Pts</th>
            <th className="text-left px-2 py-2">Form</th>
            <th className="text-right px-2 py-2">xPts (80% range)</th>
            <th className="text-right px-2 py-2">Title</th>
            <th className="text-right px-2 py-2">Top 4 (UCL)</th>
            <th className="text-right px-2 py-2">Relegated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const m = snap.mc.teams[r.team];
            return (
              <tr key={r.team} className={`border-b border-zpele-accent/10 hover:bg-zpele-bg/30 ${zone(i)}`}>
                <td className="px-3 py-1.5 text-zpele-accent/40">{r.rank}</td>
                <td className="px-2 py-1.5 font-semibold text-zpele-accent whitespace-nowrap">{r.team}</td>
                <td className="px-2 py-1.5 text-right text-zpele-accent/70">{r.mp}</td>
                <td className="px-2 py-1.5 text-right text-zpele-accent/70">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="px-2 py-1.5 text-right font-bold text-zpele-accent">{r.pts}</td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-0.5">
                    {r.last5.map((f, j) => (
                      <span key={j} className={`w-4 h-4 rounded-sm text-[10px] grid place-items-center font-bold text-zpele-bg ${f === "W" ? "bg-zpele-good" : f === "D" ? "bg-zpele-accent/40" : "bg-zpele-danger"}`}>{f}</span>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-zpele-accent">
                  {m.xpts.toFixed(1)} <span className="text-zpele-accent/40">({m.pts_p10}–{m.pts_p90})</span>
                </td>
                <td className="px-2 py-1.5 text-right">{bar(m.title, "bg-zpele-good")}</td>
                <td className="px-2 py-1.5 text-right">{bar(m.top4, "bg-sky-400")}</td>
                <td className="px-2 py-1.5 text-right">{bar(m.relegated, "bg-zpele-danger")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-4 px-3 py-2 text-[11px] text-zpele-accent/50 border-t border-zpele-accent/10">
        <span><span className="inline-block w-2 h-2 bg-sky-400 mr-1" />Champions League</span>
        <span><span className="inline-block w-2 h-2 bg-orange-400 mr-1" />Europa / Conference</span>
        <span><span className="inline-block w-2 h-2 bg-zpele-warn mr-1" />Relegation play-off</span>
        <span><span className="inline-block w-2 h-2 bg-zpele-danger mr-1" />Relegated</span>
      </div>
    </Panel>
  );
}

function NextMatchday({ snap }: { snap: Snapshot }) {
  const nm = snap.next_matchday;
  if (!nm.wk) return null;
  return (
    <Panel title={`Matchday ${nm.wk} predictions`} right="Poisson model · home / draw / away">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-zpele-accent/10">
        {nm.matches.map((m) => (
          <div key={`${m.home}-${m.away}`} className="bg-zpele-panel p-3 text-xs">
            <div className="flex justify-between text-zpele-accent/50 mb-1">
              <span>{m.date} {m.time}</span>
              <span>likely {m.likely_score}</span>
            </div>
            <div className="flex justify-between font-semibold text-zpele-accent text-sm">
              <span>{m.home}</span>
              <span className="text-zpele-accent/40 font-mono text-xs">{m.xg_home.toFixed(1)} – {m.xg_away.toFixed(1)}</span>
              <span>{m.away}</span>
            </div>
            <div className="flex h-5 mt-2 rounded overflow-hidden font-mono text-[10px] text-zpele-bg font-bold">
              <div className="bg-zpele-good grid place-items-center" style={{ width: `${m.home_win * 100}%` }}>{m.home_win > 0.12 && pct(m.home_win, 0)}</div>
              <div className="bg-zpele-accent/40 grid place-items-center" style={{ width: `${m.draw * 100}%` }}>{m.draw > 0.12 && pct(m.draw, 0)}</div>
              <div className="bg-sky-400 grid place-items-center" style={{ width: `${m.away_win * 100}%` }}>{m.away_win > 0.12 && pct(m.away_win, 0)}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function EdgesPanel({ snap }: { snap: Snapshot }) {
  const [market, setMarket] = useState<MarketKind | "all">("all");
  const [showSkip, setShowSkip] = useState(false);
  const edges = snap.edges.filter((e) => (market === "all" || e.market === market) && (showSkip || e.recommendation !== "SKIP"));
  const bets = snap.edges.filter((e) => e.recommendation === "BET");
  const tabs: [MarketKind | "all", string][] = [["all", "All"], ["title", "Title"], ["top4", "Top 4"], ["relegated", "Relegation"]];

  return (
    <Panel
      title="Betting edges (Polymarket)"
      right={`${bets.length} BET signals · prices ${snap.competition.polymarket_source}`}
    >
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-zpele-accent/10 text-xs">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setMarket(k)}
            className={`px-2 py-1 rounded border ${market === k ? "border-zpele-accent text-zpele-accent" : "border-zpele-accent/20 text-zpele-accent/50"}`}>
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1 text-zpele-accent/60">
          <input type="checkbox" checked={showSkip} onChange={(e) => setShowSkip(e.target.checked)} /> show SKIP
        </label>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-zpele-accent/60 border-b border-zpele-accent/20">
          <tr>
            <th className="text-left px-4 py-2">Club</th>
            <th className="text-left px-4 py-2">Market</th>
            <th className="text-left px-2 py-2">Side</th>
            <th className="text-right px-4 py-2">Polymarket (YES)</th>
            <th className="text-right px-4 py-2">Model (YES)</th>
            <th className="text-right px-4 py-2">Edge</th>
            <th className="text-right px-4 py-2">EV / $1</th>
            <th className="text-right px-4 py-2">Kelly size</th>
            <th className="text-right px-4 py-2">Liquidity</th>
            <th className="text-left px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {edges.map((e) => (
            <tr key={`${e.team}-${e.market}`} className="border-b border-zpele-accent/10 hover:bg-zpele-bg/30">
              <td className="px-4 py-2 font-semibold text-zpele-accent whitespace-nowrap">{e.team}</td>
              <td className="px-4 py-2 text-zpele-accent/70 whitespace-nowrap">{e.market_label}</td>
              <td className={`px-2 py-2 font-mono text-xs ${e.side === "YES" ? "text-zpele-good" : "text-zpele-danger"}`}>{e.side}</td>
              <td className="px-4 py-2 text-right">{fmtPct(e.polymarket_implied)}</td>
              <td className="px-4 py-2 text-right text-zpele-accent">{fmtPct(e.mc_probability)}</td>
              <td className={`px-4 py-2 text-right font-mono ${e.edge_pct >= 5 ? "text-zpele-good" : e.edge_pct >= 2 ? "text-zpele-warn" : "text-zpele-accent/50"}`}>
                +{fmtPct(e.edge_pct)}
              </td>
              <td className={`px-4 py-2 text-right font-mono ${e.ev_net >= 0 ? "text-zpele-good" : "text-zpele-danger"}`}>
                {(e.ev_net / e.polymarket_price).toFixed(2)}
              </td>
              <td className="px-4 py-2 text-right text-zpele-accent/70">${e.position_size_usd.toFixed(0)}</td>
              <td className="px-4 py-2 text-right text-zpele-accent/50 text-xs">{fmtUsd(e.liquidity)}</td>
              <td className="px-4 py-2"><span className={recBadge(e.recommendation)}>{e.recommendation}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function RatingsTable({ snap }: { snap: Snapshot }) {
  const { layers, labels, weights } = snap.framework;
  const teams = Object.values(snap.ratings).sort((a, b) => b.overall - a.overall);
  const shade = (v: number) => (v >= 65 ? "text-zpele-good" : v <= 35 ? "text-zpele-danger" : "text-zpele-accent/70");
  return (
    <Panel title="Z-PELE club ratings" right="50 = league average">
      <table className="w-full text-xs">
        <thead className="text-zpele-accent/60 border-b border-zpele-accent/20">
          <tr>
            <th className="text-left px-2 py-2">#</th>
            <th className="text-left px-2 py-2">Club</th>
            {layers.map((l: Layer) => (
              <th key={l} className="text-right px-2 py-2 whitespace-nowrap" title={`${l} · weight ${(weights[l] * 100).toFixed(0)}%`}>
                {labels[l]}
              </th>
            ))}
            <th className="text-right px-2 py-2">Overall</th>
            <th className="text-right px-2 py-2">Conf</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr key={t.team} className="border-b border-zpele-accent/10 hover:bg-zpele-bg/30">
              <td className="px-2 py-1.5 text-zpele-accent/40">{i + 1}</td>
              <td className="px-2 py-1.5 font-semibold text-zpele-accent whitespace-nowrap">{t.team}</td>
              {layers.map((l: Layer) => (
                <td key={l} className={`px-2 py-1.5 text-right ${shade(t[l])}`}>{t[l].toFixed(0)}</td>
              ))}
              <td className="px-2 py-1.5 text-right font-bold text-zpele-accent">{t.overall.toFixed(1)}</td>
              <td className="px-2 py-1.5 text-right text-zpele-accent/60">{pct(t.conf, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function PositionHeatmap({ snap }: { snap: Snapshot }) {
  const rows = Object.entries(snap.mc.teams).sort((a, b) => a[1].avg_position - b[1].avg_position);
  return (
    <Panel title="Finishing-position probabilities" right="darker = more likely">
      <table className="text-[10px] font-mono">
        <thead className="text-zpele-accent/50">
          <tr>
            <th className="px-2 py-1 text-left font-sans">Club</th>
            {rows.map((_, i) => <th key={i} className="w-7 py-1">{i + 1}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([team, m]) => (
            <tr key={team}>
              <td className="px-2 py-0.5 font-sans font-semibold text-zpele-accent whitespace-nowrap">{team}</td>
              {m.position_dist.map((p, i) => (
                <td key={i} className="w-7 h-5 text-center text-zpele-bg"
                  style={{ background: `rgba(94, 234, 212, ${Math.min(1, p * 2.2)})` }}
                  title={`${team} finishes ${i + 1}: ${pct(p)}`}>
                  {p >= 0.1 ? Math.round(p * 100) : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export default function App() {
  const { data: snap, isLoading, error } = useQuery({ queryKey: ["snapshot"], queryFn: api.snapshot, refetchInterval: 60_000 });
  return (
    <div className="min-h-screen bg-zpele-bg text-zpele-accent">
      <Header snap={snap} />
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {isLoading && <div className="text-zpele-accent/60">Loading snapshot…</div>}
        {error && <div className="text-zpele-danger">API unavailable — run <code>python3 -m pipeline.main</code> and start the server.</div>}
        {snap && (
          <>
            <Banner snap={snap} />
            <ProjectedTable snap={snap} />
            <NextMatchday snap={snap} />
            <EdgesPanel snap={snap} />
            <RatingsTable snap={snap} />
            <PositionHeatmap snap={snap} />
            <footer className="mt-12 pt-6 border-t border-zpele-accent/20 text-xs text-zpele-accent/40 text-center">
              Stats: <a className="underline" href={snap.competition.source_url} target="_blank" rel="noreferrer">FBref</a> (as of{" "}
              {new Date(snap.competition.stats_as_of).toLocaleDateString()}) · Prices: Polymarket · Z-PELE v{snap.framework.version}
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
