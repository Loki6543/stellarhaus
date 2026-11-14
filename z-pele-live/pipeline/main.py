"""
Z-PELE Live pipeline — Bundesliga 2026-27.
FBref stats -> Z-PELE ratings -> season Monte Carlo -> Polymarket edges -> snapshot.json
"""
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from . import fbref
from .market import by_team, detect_edges, fetch_polymarket
from .ratings import LAYER_LABELS, LAYER_WEIGHTS, compute_ratings
from .simulator import next_matchday, run_monte_carlo


def ts() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


def build_snapshot(n_sims: int = 10000) -> dict:
    print(f"[{ts()}] Z-PELE Live (Bundesliga) starting — {n_sims:,} season sims")

    data = fbref.load()
    teams, fixtures = data["teams"], data["fixtures"]
    played = sum(f["hg"] is not None for f in fixtures)
    matchday = max((f["wk"] for f in fixtures if f["hg"] is not None), default=0)
    print(f"[{ts()}] FBref {data['season']}: {len(teams)} clubs, {played}/{len(fixtures)} matches played (source: {data['source']})")

    markets, pm_source = fetch_polymarket()
    print(f"[{ts()}] Polymarket: {len(markets)} outright markets (source: {pm_source})")

    ratings = compute_ratings(teams, by_team(markets))
    mc = run_monte_carlo(teams, ratings, fixtures, n_sims=n_sims)
    print(f"[{ts()}] MC complete: {mc['remaining_fixtures']} remaining fixtures simulated")

    edges = detect_edges(mc, markets, ratings)
    print(f"[{ts()}] {sum(e['recommendation'] == 'BET' for e in edges)} BET signals")

    table = sorted(teams.values(), key=lambda t: t["rank"])
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_simulations": n_sims,
        "competition": {
            "name": "Bundesliga",
            "season": data["season"],
            "matchday": matchday,
            "matches_played": played,
            "matches_total": len(fixtures),
            "source": f"FBref — {data['source']}",
            "source_url": data["source_url"],
            "stats_as_of": datetime.fromtimestamp(data["cache_mtime"], timezone.utc).isoformat(),
            "polymarket_source": pm_source,
        },
        "framework": {
            "name": "Z-PELE",
            "version": "2.0.0",
            "layers": list(LAYER_WEIGHTS),
            "labels": LAYER_LABELS,
            "weights": LAYER_WEIGHTS,
            "regime": f"League — MD {matchday}/34",
        },
        "table": table,
        "ratings": ratings,
        "mc": mc,
        "next_matchday": next_matchday(fixtures, teams, ratings),
        "polymarket": markets,
        "edges": edges,
    }


def main():
    n_sims = int(sys.argv[1]) if len(sys.argv) > 1 else 10000
    start = time.time()
    snap = build_snapshot(n_sims)
    out = Path(__file__).parent.parent / "data" / "snapshot.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp")
    tmp.write_text(json.dumps(snap, indent=1, ensure_ascii=False))
    tmp.replace(out)  # atomic swap so the server never reads a half-written file
    print(f"[{ts()}] Snapshot written to {out} in {time.time() - start:.1f}s")

    print("\n=== Projected table ===")
    print(f"  {'Team':<15}{'Pts':>4}{'xPts':>7}{'Title':>8}{'Top4':>7}{'Rel':>7}")
    for t, m in sorted(snap["mc"]["teams"].items(), key=lambda x: -x[1]["xpts"]):
        cur = next(r["pts"] for r in snap["table"] if r["team"] == t)
        print(f"  {t:<15}{cur:>4}{m['xpts']:>7.1f}{m['title']*100:>7.1f}%{m['top4']*100:>6.1f}%{m['relegated']*100:>6.1f}%")

    print("\n=== Top edges ===")
    for e in snap["edges"][:10]:
        print(f"  {e['recommendation']:<8}{e['team']:<15}{e['market_label']:<15}{e['side']:<4}"
              f" market {e['polymarket_implied']:5.1f}%  model {e['mc_probability']:5.1f}%  edge {e['edge_pct']:+5.1f}  ${e['position_size_usd']:.0f}")


if __name__ == "__main__":
    main()
