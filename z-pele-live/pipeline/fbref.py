"""
FBref ingestion for the Bundesliga.

FBref sits behind Cloudflare, so plain scripts usually get 403'd. We therefore read
FBref pages as Markdown (the format Firecrawl returns) and cache them in data/raw/.

Refresh order:
  1. FIRECRAWL_API_KEY set  -> scrape FBref live via Firecrawl, overwrite cache
  2. otherwise              -> use cached data/raw/fbref_*.md
"""
import json
import os
import re
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional

RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
STATS_URL = "https://fbref.com/en/comps/20/Bundesliga-Stats"
FIXTURES_URL = "https://fbref.com/en/comps/20/schedule/Bundesliga-Scores-and-Fixtures"
STATS_FILE = RAW_DIR / "fbref_stats.md"
FIXTURES_FILE = RAW_DIR / "fbref_fixtures.md"

_LINK = re.compile(r"!\[[^\]]*\]\([^)]*\)|\[([^\]]*)\]\([^)]*\)")


def _firecrawl(url: str, api_key: str) -> str:
    body = json.dumps({"url": url, "formats": ["markdown"], "onlyMainContent": True, "maxAge": 0}).encode()
    req = urllib.request.Request(
        "https://api.firecrawl.dev/v2/scrape",
        data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    md = (payload.get("data") or {}).get("markdown")
    if not md:
        raise RuntimeError(f"Firecrawl returned no markdown for {url}")
    return md


def refresh_cache() -> str:
    """Try to refresh the cached FBref pages. Returns a short status string."""
    key = os.environ.get("FIRECRAWL_API_KEY")
    if not key:
        return "cache (set FIRECRAWL_API_KEY for live FBref refresh)"
    try:
        stats, fixtures = _firecrawl(STATS_URL, key), _firecrawl(FIXTURES_URL, key)
    except Exception as exc:  # network/API failure -> keep last good cache
        return f"cache (live refresh failed: {exc})"
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    STATS_FILE.write_text(stats)
    FIXTURES_FILE.write_text(fixtures)
    return "live (Firecrawl)"


# ---------- markdown table parsing ----------

def _cell(raw: str) -> str:
    raw = raw.replace("\\-", "-").replace("\\#", "#")
    return _LINK.sub(lambda m: m.group(1) or "", raw).strip()


def _split_row(line: str) -> List[str]:
    return [c for c in line.strip().strip("|").split(" | ")]


def _tables(md: str) -> List[Dict]:
    """Return every pipe table as {heading, header, rows(raw cells)}."""
    tables, heading, block = [], "", []
    for line in md.splitlines() + [""]:
        if line.startswith("## "):
            heading = line[3:].strip()
        if line.startswith("|"):
            block.append(line)
            continue
        if block:
            rows = [r for r in block if not re.match(r"^\|\s*-{3}", r)]
            # Grouped headers ("| | Playing Time | ...") precede the real header row
            hdr_idx = next((i for i, r in enumerate(rows) if re.search(r"\|\s*(Squad|Wk)\s*\|", r)), 0)
            tables.append({
                "heading": heading,
                "header": [_cell(c) for c in _split_row(rows[hdr_idx])],
                "rows": [_split_row(r) for r in rows[hdr_idx + 1:]],
            })
            block = []
    return tables


def _num(v: str) -> Optional[float]:
    v = v.replace(",", "").replace("+", "").strip()
    try:
        return float(v)
    except ValueError:
        return None


def _rows_as_dicts(table: Dict, opponent: bool) -> Dict[str, Dict]:
    out = {}
    hdr = table["header"]
    for raw in table["rows"]:
        cells = [_cell(c) for c in raw]
        if len(cells) < len(hdr) - 1:
            continue
        squad = cells[hdr.index("Squad")]
        is_opp = squad.startswith("vs ")
        if is_opp != opponent:
            continue
        squad = squad[3:] if is_opp else squad
        row = {}
        for i, h in enumerate(hdr):
            if i < len(cells) and h not in row:  # first occurrence wins (totals before per-90)
                row[h] = cells[i]
        out[squad] = row
    return out


def _find(tables: List[Dict], heading_prefix: str, must_have: str) -> Dict:
    for t in tables:
        if t["heading"].startswith(heading_prefix) and must_have in t["header"]:
            return t
    raise ValueError(f"FBref table '{heading_prefix}' with column '{must_have}' not found")


def parse_stats(md: str) -> Dict:
    tables = _tables(md)
    season = re.search(r"#\s*(\d{4}-\d{4}) Bundesliga", md)

    league = _find(tables, "Bundesliga", "Pts/MP")
    standings = []
    hdr = league["header"]
    for raw in league["rows"]:
        cells = [_cell(c) for c in raw]
        if len(cells) < len(hdr) - 1 or not cells[0].isdigit():
            continue
        r = dict(zip(hdr, cells))
        last5_raw = raw[hdr.index("Last 5")]
        standings.append({
            "rank": int(r["Rk"]),
            "team": r["Squad"],
            "mp": int(r["MP"]), "w": int(r["W"]), "d": int(r["D"]), "l": int(r["L"]),
            "gf": int(r["GF"]), "ga": int(r["GA"]), "gd": int(_num(r["GD"]) or 0),
            "pts": int(r["Pts"]),
            "last5": re.findall(r"\[([WDL])\]", last5_raw),
            "top_scorer": r.get("Top Team Scorer", ""),
            "goalkeeper": r.get("Goalkeeper", ""),
        })

    def squad_table(prefix, col):
        # FBref renders "Squad Stats" and "Opponent Stats" as separate tables under the same heading
        _find(tables, prefix, col)  # raise early if the section is missing
        own, opp = {}, {}
        for t in tables:
            if t["heading"].startswith(prefix) and col in t["header"]:
                own.update(_rows_as_dicts(t, False))
                opp.update(_rows_as_dicts(t, True))
        return own, opp

    std, std_opp = squad_table("Squad Standard Stats", "Poss")
    gk, _ = squad_table("Squad Goalkeeping", "Save%")
    sh, sh_opp = squad_table("Squad Shooting", "SoT")

    teams = {}
    for s in standings:
        name = s["team"]
        teams[name] = {
            **s,
            "age": _num(std[name]["Age"]),
            "poss": _num(std[name]["Poss"]),
            "npg": _num(std[name]["G-PK"]),
            "ast": _num(std[name]["Ast"]),
            "shots": _num(sh[name]["Sh"]),
            "sot": _num(sh[name]["SoT"]),
            "shots_against": _num(sh_opp[name]["Sh"]),
            "sot_against": _num(sh_opp[name]["SoT"]),
            "npg_against": _num(std_opp[name]["G-PK"]),
            "save_pct": _num(gk[name]["Save%"]),
            "sota": _num(gk[name]["SoTA"]),
            "saves": _num(gk[name]["Saves"]),
            "clean_sheets": _num(gk[name]["CS"]),
        }
    return {"season": season.group(1) if season else "", "teams": teams}


def parse_fixtures(md: str) -> List[Dict]:
    t = next(t for t in _tables(md) if "Wk" in t["header"] and "Home" in t["header"])
    hdr = t["header"]
    out = []
    for raw in t["rows"]:
        cells = [_cell(c) for c in raw]
        if len(cells) < 7 or not cells[0].isdigit():
            continue
        r = dict(zip(hdr, cells))
        m = re.match(r"(\d+)\s*[–-]\s*(\d+)", r["Score"])
        out.append({
            "wk": int(r["Wk"]),
            "date": r["Date"],
            "time": r["Time"].split("(")[0],
            "home": r["Home"],
            "away": r["Away"],
            "hg": int(m.group(1)) if m else None,
            "ag": int(m.group(2)) if m else None,
            "venue": r.get("Venue", ""),
        })
    return out


def load() -> Dict:
    source = refresh_cache()
    stats = parse_stats(STATS_FILE.read_text())
    fixtures = parse_fixtures(FIXTURES_FILE.read_text())
    stats["fixtures"] = fixtures
    stats["source"] = source
    stats["source_url"] = STATS_URL
    stats["cache_mtime"] = STATS_FILE.stat().st_mtime
    return stats
