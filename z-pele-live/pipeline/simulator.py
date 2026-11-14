"""
Bundesliga season Monte Carlo.

Team strengths: Poisson attack/defence multipliers estimated from FBref goals and
shots on target, shrunk toward a prior from the market layer (L7, the pre-season +
live consensus). Each simulated season also draws its own strength perturbation,
so projections carry parameter uncertainty and don't get overconfident early on.
"""
import math
from typing import Dict, List

import numpy as np

PRIOR_MATCHES = 10         # how many "virtual" matches the prior is worth
PRIOR_SLOPE = 0.012        # log-strength per market-layer (L7) point away from 50
STRENGTH_SD = 0.12         # per-simulation log-strength uncertainty (we never know true strength)
PLAYOFF_LOSS = 0.35        # P(16th place loses the relegation play-off vs 2.BL #3)


def team_strengths(teams: Dict[str, Dict], ratings: Dict[str, Dict], fixtures: List[Dict]) -> Dict:
    played = [f for f in fixtures if f["hg"] is not None]
    hg = sum(f["hg"] for f in played)
    ag = sum(f["ag"] for f in played)
    n = max(len(played), 1)
    mu = (hg + ag) / (2 * n)                       # goals per team per match
    home_adv = math.sqrt((hg + 20 * 1.6) / (ag + 20 * 1.2))  # shrunk toward the long-run ~1.15

    total_goals = sum(t["gf"] for t in teams.values())
    total_sot = sum(t["sot"] for t in teams.values()) or 1
    conv = total_goals / total_sot                 # league goals per shot on target

    att, dfn = {}, {}
    for name, t in teams.items():
        mp = max(t["mp"], 1)
        # Shots on target are more stable than goals early in a season
        att_obs = (0.35 * t["gf"] / mp + 0.65 * t["sot"] * conv / mp) / mu
        def_obs = (0.35 * t["ga"] / mp + 0.65 * t["sot_against"] * conv / mp) / mu
        s = ratings[name]["L7"] - 50
        att_prior, def_prior = math.exp(PRIOR_SLOPE * s), math.exp(-PRIOR_SLOPE * s)
        att[name] = (mp * att_obs + PRIOR_MATCHES * att_prior) / (mp + PRIOR_MATCHES)
        dfn[name] = (mp * def_obs + PRIOR_MATCHES * def_prior) / (mp + PRIOR_MATCHES)
    return {"mu": mu, "home_adv": home_adv, "att": att, "def": dfn}


def expected_goals(home: str, away: str, st: Dict):
    lam_h = st["mu"] * st["home_adv"] * st["att"][home] * st["def"][away]
    lam_a = st["mu"] / st["home_adv"] * st["att"][away] * st["def"][home]
    return lam_h, lam_a


def match_probs(home: str, away: str, st: Dict, max_goals: int = 10) -> Dict:
    lh, la = expected_goals(home, away, st)
    ph = [math.exp(-lh) * lh**k / math.factorial(k) for k in range(max_goals + 1)]
    pa = [math.exp(-la) * la**k / math.factorial(k) for k in range(max_goals + 1)]
    grid = np.outer(ph, pa)
    i, j = np.unravel_index(np.argmax(grid), grid.shape)
    return {
        "home_win": float(np.tril(grid, -1).sum()),
        "draw": float(np.trace(grid)),
        "away_win": float(np.triu(grid, 1).sum()),
        "xg_home": lh,
        "xg_away": la,
        "likely_score": f"{i}-{j}",
    }


def run_monte_carlo(teams: Dict[str, Dict], ratings: Dict[str, Dict], fixtures: List[Dict],
                    n_sims: int = 10000, seed: int = 42) -> Dict:
    rng = np.random.default_rng(seed)
    names = sorted(teams)
    idx = {t: i for i, t in enumerate(names)}
    n_teams = len(names)
    st = team_strengths(teams, ratings, fixtures)

    pts = np.tile([teams[t]["pts"] for t in names], (n_sims, 1)).astype(np.int32)
    gd = np.tile([teams[t]["gd"] for t in names], (n_sims, 1)).astype(np.int32)
    gf = np.tile([teams[t]["gf"] for t in names], (n_sims, 1)).astype(np.int32)

    # Per-season strength draws: shape (n_sims, n_teams)
    att = np.array([st["att"][t] for t in names]) * np.exp(rng.normal(0, STRENGTH_SD, (n_sims, n_teams)))
    dfn = np.array([st["def"][t] for t in names]) * np.exp(rng.normal(0, STRENGTH_SD, (n_sims, n_teams)))
    base_h, base_a = st["mu"] * st["home_adv"], st["mu"] / st["home_adv"]

    remaining = [f for f in fixtures if f["hg"] is None]
    for f in remaining:
        h, a = idx[f["home"]], idx[f["away"]]
        g1 = rng.poisson(base_h * att[:, h] * dfn[:, a])
        g2 = rng.poisson(base_a * att[:, a] * dfn[:, h])
        pts[:, h] += np.where(g1 > g2, 3, np.where(g1 == g2, 1, 0))
        pts[:, a] += np.where(g2 > g1, 3, np.where(g1 == g2, 1, 0))
        gd[:, h] += g1 - g2
        gd[:, a] += g2 - g1
        gf[:, h] += g1
        gf[:, a] += g2

    # Bundesliga tiebreak: points, goal difference, goals scored (then coin flip)
    key = pts * 1_000_000 + (gd + 500) * 1_000 + gf + rng.random((n_sims, n_teams))
    order = np.argsort(-key, axis=1)                 # order[s, rank] = team idx
    position = np.empty_like(order)
    position[np.arange(n_sims)[:, None], order] = np.arange(n_teams)[None, :]

    pos_counts = np.zeros((n_teams, n_teams))
    for r in range(n_teams):
        pos_counts[:, r] = (position == r).sum(axis=0)
    pos_p = pos_counts / n_sims

    out = {"teams": {}, "n_sims": n_sims, "remaining_fixtures": len(remaining),
           "home_adv": st["home_adv"], "goals_per_team_match": st["mu"]}
    for t in names:
        i = idx[t]
        p = pos_p[i]
        auto_rel = p[16:].sum()
        out["teams"][t] = {
            "title": float(p[0]),
            "top4": float(p[:4].sum()),        # Champions League
            "top6": float(p[:6].sum()),        # Europe (UEL / UECL)
            "playoff": float(p[15]),           # 16th: relegation play-off
            "auto_relegation": float(auto_rel),
            "relegated": float(auto_rel + PLAYOFF_LOSS * p[15]),
            "xpts": float(pts[:, i].mean()),
            "xgd": float(gd[:, i].mean()),
            "pts_p10": int(np.percentile(pts[:, i], 10)),
            "pts_p90": int(np.percentile(pts[:, i], 90)),
            "avg_position": float((p * np.arange(1, n_teams + 1)).sum()),
            "position_dist": [round(float(x), 4) for x in p],
            "attack": round(st["att"][t], 3),
            "defence": round(st["def"][t], 3),
        }
    return out


def next_matchday(fixtures: List[Dict], teams: Dict[str, Dict], ratings: Dict[str, Dict]) -> Dict:
    st = team_strengths(teams, ratings, fixtures)
    upcoming = [f for f in fixtures if f["hg"] is None]
    if not upcoming:
        return {"wk": None, "matches": []}
    wk = min(f["wk"] for f in upcoming)
    matches = []
    for f in upcoming:
        if f["wk"] != wk:
            continue
        matches.append({**{k: f[k] for k in ("wk", "date", "time", "home", "away", "venue")},
                        **match_probs(f["home"], f["away"], st)})
    return {"wk": wk, "matches": matches}
