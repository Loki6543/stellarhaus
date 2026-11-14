// Z-PELE Live API server — Bundesliga edition.
// Reads snapshot.json and serves it via REST.
// Endpoints:
//   GET /api/health
//   GET /api/snapshot             — full snapshot
//   GET /api/table                — current FBref league table
//   GET /api/ratings              — Z-PELE ratings for all 18 clubs
//   GET /api/ratings/:team        — single club rating
//   GET /api/mc                   — season Monte Carlo (title / top-4 / relegation / xPts)
//   GET /api/fixtures/next        — next matchday win/draw/loss probabilities
//   GET /api/edges                — Polymarket bet candidates (?recommendation=BET&market=title|top4|relegated)
//   GET /api/framework            — layer weights + competition metadata

import express from "express";
import cors from "cors";
import compression from "compression";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const SNAPSHOT_PATH = path.join(DATA_DIR, "snapshot.json");

let snapshot = null;
let lastLoaded = null;

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.warn(`[server] snapshot.json not found at ${SNAPSHOT_PATH}`);
    return null;
  }
  try {
    const raw = fs.readFileSync(SNAPSHOT_PATH, "utf8");
    const data = JSON.parse(raw);
    lastLoaded = new Date().toISOString();
    return data;
  } catch (err) {
    console.error(`[server] failed to parse snapshot.json: ${err.message}`);
    return null;
  }
}

function ensureSnapshot(req, res, next) {
  if (!snapshot) {
    return res.status(503).json({ error: "snapshot not available — run `python -m pipeline.main` first" });
  }
  next();
}

const app = express();
app.use(cors({ origin: true, credentials: false }));
app.use(compression());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    snapshot_loaded: !!snapshot,
    snapshot_loaded_at: lastLoaded,
    generated_at: snapshot?.generated_at ?? null,
    competition: snapshot?.competition ?? null,
  });
});

app.get("/api/snapshot", ensureSnapshot, (req, res) => {
  res.json(snapshot);
});

app.get("/api/table", ensureSnapshot, (req, res) => {
  res.json(snapshot.table);
});

app.get("/api/ratings", ensureSnapshot, (req, res) => {
  res.json(snapshot.ratings);
});

app.get("/api/ratings/:team", ensureSnapshot, (req, res) => {
  const team = req.params.team;
  const r = snapshot.ratings[team];
  if (!r) return res.status(404).json({ error: `team ${team} not found` });
  res.json(r);
});

app.get("/api/mc", ensureSnapshot, (req, res) => {
  res.json(snapshot.mc);
});

app.get("/api/fixtures/next", ensureSnapshot, (req, res) => {
  res.json(snapshot.next_matchday);
});

app.get("/api/edges", ensureSnapshot, (req, res) => {
  const { recommendation, market } = req.query;
  let edges = snapshot.edges;
  if (typeof recommendation === "string") edges = edges.filter((e) => e.recommendation === recommendation.toUpperCase());
  if (typeof market === "string") edges = edges.filter((e) => e.market === market);
  res.json(edges);
});

app.get("/api/framework", ensureSnapshot, (req, res) => {
  res.json({ ...snapshot.framework, competition: snapshot.competition });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[server] Z-PELE Live (Bundesliga) API listening on :${PORT}`);
  console.log(`[server] Loading snapshot...`);
  snapshot = loadSnapshot();
  if (snapshot) {
    console.log(`[server] Snapshot loaded from ${lastLoaded}`);
    console.log(`[server] ${Object.keys(snapshot.ratings).length} teams, ${snapshot.edges.length} edges`);
  } else {
    console.log(`[server] No snapshot yet — run 'python -m pipeline.main' to generate one`);
  }

  // Watch snapshot.json for changes and hot-reload (debounced: one write fires several events)
  let reloadTimer = null;
  try {
    fs.watch(DATA_DIR, (eventType, filename) => {
      if (filename !== "snapshot.json") return;
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(reload, 250);
    });
  } catch (err) {
    console.warn(`[server] file watcher failed (${err.message}) — restart manually to reload`);
  }

  function reload() {
    console.log(`[server] snapshot.json changed, reloading...`);
    const newSnap = loadSnapshot();
    if (newSnap) {
      snapshot = newSnap;
      console.log(`[server] Reloaded: ${Object.keys(snapshot.ratings).length} teams, ${snapshot.edges.length} edges`);
    }
  }
});
