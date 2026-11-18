"""
Z-PELE club ratings — Bundesliga edition.

Every layer is computed from live FBref data (plus Polymarket for L7), z-scored across
the 18 clubs and mapped to a 0-100 scale (league average = 50).

FBref no longer publishes Opta xG, so shot-on-target share is used as the
underlying-performance ("process") signal.
"""
from typing import Dict, Optional

import numpy as np

LAYER_WEIGHTS = {
    "L0": 0.14,   # Defensive solidity   — non-penalty goals conceded / match (inverted)
    "L1": 0.12,   # Attacking output     — (npG + assists) / match
    "L3": 0.14,   # Recent form          — points from the last 5 matches
    "L4": 0.16,   # Season results       — points per match
    "L7": 0.16,   # Betting market       — Polymarket title / top-4 / relegation consensus
    "L10": 0.08,  # Goalkeeping          — save % vs league
    "L11": 0.20,  # Shot dominance       — share of shots on target (xG proxy)
}

LAYER_LABELS = {
    "L0": "Defence",
    "L1": "Attack",
    "L3": "Form (L5)",
    "L4": "Pts/MP",
    "L7": "Market",
    "L10": "Goalkeeping",
    "L11": "Shot dominance",
}

FORM_PTS = {"W": 3, "D": 1, "L": 0}


def _scale(raw: Dict[str, float], invert: bool = False) -> Dict[str, float]:
    vals = np.array(list(raw.values()), dtype=float)
    mu, sd = vals.mean(), vals.std() or 1.0
    out = {}
    for team, v in raw.items():
        z = (v - mu) / sd
        if invert:
            z = -z
        out[team] = float(np.clip(50 + 13 * z, 15, 99))
    return out


def market_strength(markets: Dict[str, Dict[str, float]]) -> Dict[str, float]:
    """Collapse title/top-4/relegation prices into one strength number per team."""
    out = {}
    for team, m in markets.items():
        out[team] = 2.0 * m.get("title", 0) + 1.0 * m.get("top4", 0) - 1.5 * m.get("relegated", 0)
    return out


def compute_ratings(teams: Dict[str, Dict], market_by_team: Optional[Dict[str, Dict[str, float]]] = None) -> Dict[str, Dict]:
    names = list(teams)
    per = lambda key, t: teams[t][key] / max(teams[t]["mp"], 1)

    layers = {
        "L0": _scale({t: per("npg_against", t) for t in names}, invert=True),
        "L1": _scale({t: (teams[t]["npg"] + teams[t]["ast"]) / max(teams[t]["mp"], 1) for t in names}),
        "L3": _scale({t: sum(FORM_PTS[r] for r in teams[t]["last5"]) / max(len(teams[t]["last5"]), 1) for t in names}),
        "L4": _scale({t: per("pts", t) for t in names}),
        "L10": _scale({t: teams[t]["save_pct"] or 0 for t in names}),
        "L11": _scale({t: teams[t]["sot"] / max(teams[t]["sot"] + teams[t]["sot_against"], 1) for t in names}),
    }
    have_market = market_by_team and all(t in market_by_team for t in names)
    if have_market:
        layers["L7"] = _scale(market_strength({t: market_by_team[t] for t in names}))

    ratings = {}
    for t in names:
        scores = {k: round(layers[k][t], 1) for k in layers}
        if "L7" not in scores:  # no market -> neutral fill from the stats layers
            scores["L7"] = round(float(np.mean(list(scores.values()))), 1)
        overall = sum(LAYER_WEIGHTS[k] * scores[k] for k in LAYER_WEIGHTS)
        # Confidence: sample size (season progress) + agreement between layers
        sample = min(teams[t]["mp"] / 34, 1.0)
        spread = float(np.std(list(scores.values())))
        agreement = float(np.clip(1 - spread / 25, 0, 1))
        conf = 0.35 + 0.30 * sample + 0.30 * agreement + (0.05 if have_market else 0)
        ratings[t] = {
            **{k: scores[k] for k in LAYER_WEIGHTS},
            "overall": round(overall, 1),
            "conf": round(min(conf, 0.95), 2),
            "team": t,
        }
    return ratings
