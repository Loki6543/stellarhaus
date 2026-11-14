"""
Polymarket scraper + edge detector — Bundesliga 2026-27 outrights.

Markets tracked: champion, top-4 finish, relegated. Both sides are evaluated:
if the model is above the YES price we flag YES, if it is below we flag NO.
"""
import json
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

RAW_FILE = Path(__file__).parent.parent / "data" / "raw" / "polymarket_events.json"

EVENT_SLUGS = {
    "bundesliga-2027-champion-20260708164840303": "title",
    "bundesliga-top-4-finishers-2026-27": "top4",
    "bundesliga-teams-relegated-2026-27": "relegated",
}

MARKET_LABELS = {"title": "Win Bundesliga", "top4": "Top-4 finish", "relegated": "Relegated"}

# Polymarket name -> FBref name
TEAM_ALIASES = {
    "Bayern Munich": "Bayern Munich", "Borussia Dortmund": "Dortmund", "Bayer Leverkusen": "Leverkusen",
    "RB Leipzig": "RB Leipzig", "Eintracht Frankfurt": "Frankfurt", "VfB Stuttgart": "Stuttgart",
    "TSG Hoffenheim": "Hoffenheim", "SC Freiburg": "Freiburg", "Mainz 05": "Mainz 05",
    "Borussia Mönchengladbach": "Gladbach", "1. FC Köln": "Köln", "FC Augsburg": "Augsburg",
    "Union Berlin": "Union Berlin", "Werder Bremen": "Werder Bremen", "Hamburger SV": "Hamburger SV",
    "Schalke 04": "Schalke 04", "FC Schalke 04": "Schalke 04", "SC Paderborn": "Paderborn 07",
    "SV Elversberg": "Elversberg",
}

POLYMARKET_FEE = 0.98
MIN_CONF_BET = 0.60
MIN_EDGE_BET = 0.05
MIN_LIQUIDITY = float(os.environ.get("Z_PELE_MIN_LIQUIDITY", "5000"))
KELLY_TIERS = [(0.75, 0.50), (0.65, 0.40), (0.60, 0.25), (0.00, 0.00)]
MAX_POSITION_PCT = 0.02


def _fetch_live() -> List[Dict]:
    events = []
    for slug in EVENT_SLUGS:
        url = f"https://gamma-api.polymarket.com/events?slug={slug}"
        req = urllib.request.Request(url, headers={"User-Agent": "z-pele-live/2.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data:
            events.append(data[0])
    if len(events) != len(EVENT_SLUGS):
        raise RuntimeError("missing Polymarket events")
    return events


def fetch_polymarket() -> Tuple[List[Dict], str]:
    """Returns (markets, source). Falls back to the cached snapshot if the API is unreachable."""
    try:
        events = _fetch_live()
        RAW_FILE.write_text(json.dumps(events, indent=1))
        source = "live"
    except Exception as exc:
        if not RAW_FILE.exists():
            return [], f"unavailable ({exc})"
        events = json.loads(RAW_FILE.read_text())
        source = "cache"

    fetched_at = datetime.now(timezone.utc).isoformat() if source == "live" else \
        datetime.fromtimestamp(RAW_FILE.stat().st_mtime, timezone.utc).isoformat()
    markets = []
    for ev in events:
        kind = EVENT_SLUGS.get(ev.get("slug"))
        if not kind:
            continue
        for m in ev.get("markets", []):
            team = TEAM_ALIASES.get(m.get("groupItemTitle", ""))
            if not team or m.get("closed"):
                continue
            try:
                yes = float(json.loads(m.get("outcomePrices") or '["0"]')[0])
            except (ValueError, IndexError, TypeError):
                continue
            markets.append({
                "team": team,
                "market": kind,
                "question": m.get("question", ""),
                "polymarket_id": m.get("id", ""),
                "yes_price": yes,
                "implied_prob": yes * 100,
                "volume": float(m.get("volume") or 0),
                "liquidity": float(m.get("liquidity") or 0),
                "fetched_at": fetched_at,
            })
    return markets, source


def by_team(markets: List[Dict]) -> Dict[str, Dict[str, float]]:
    out: Dict[str, Dict[str, float]] = {}
    for m in markets:
        out.setdefault(m["team"], {})[m["market"]] = m["yes_price"]
    return out


def _kelly_mult(conf: float) -> float:
    return next(mult for thr, mult in KELLY_TIERS if conf >= thr)


def detect_edges(mc: Dict, markets: List[Dict], ratings: Dict[str, Dict], bankroll: float = None) -> List[Dict]:
    if bankroll is None:
        bankroll = float(os.environ.get("Z_PELE_BANKROLL", "10000"))
    out = []
    for m in markets:
        team, kind = m["team"], m["market"]
        if team not in mc["teams"]:
            continue
        p_yes = mc["teams"][team][kind]
        yes = m["yes_price"]
        if not 0 < yes < 1:
            continue
        # Pick the side with positive edge
        side, p, price = ("YES", p_yes, yes) if p_yes >= yes else ("NO", 1 - p_yes, 1 - yes)
        edge = p - price
        ev_net = p * POLYMARKET_FEE - price
        b = 1 / price - 1
        kelly_full = max(0.0, (p * b - (1 - p)) / b)
        conf = ratings[team]["conf"]
        kelly_mult = _kelly_mult(conf)
        size = min(bankroll * kelly_full * kelly_mult, bankroll * MAX_POSITION_PCT)

        if edge >= MIN_EDGE_BET and conf >= MIN_CONF_BET and m["liquidity"] >= MIN_LIQUIDITY and ev_net > 0:
            rec = "BET"
        elif edge >= 0.03 and ev_net / price >= 0.03:
            rec = "MONITOR"
        else:
            rec = "SKIP"

        out.append({
            "team": team,
            "market": kind,
            "market_label": MARKET_LABELS[kind],
            "side": side,
            "polymarket_price": price,
            "polymarket_implied": yes * 100,
            "mc_probability": p_yes * 100,
            "edge_pct": edge * 100,
            "ev_net": ev_net,
            "kelly_full": kelly_full,
            "kelly_fraction": kelly_mult,
            "position_size_usd": size if rec != "SKIP" else 0.0,
            "volume": m["volume"],
            "liquidity": m["liquidity"],
            "recommendation": rec,
        })
    out.sort(key=lambda e: (-{"BET": 2, "MONITOR": 1, "SKIP": 0}[e["recommendation"]], -e["edge_pct"]))
    return out
