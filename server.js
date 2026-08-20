/**
 * XIN PRIME · Color Predictor · 24/7 Server
 * Triple-only logic · Auto fetch every 30s · History kept in memory
 */
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── State (lives as long as the server process) ──
const state = {
  period: "----",
  prediction: "WAIT",
  formula: "⚡ starting...",
  detail: "Server booting",
  conf: 0,
  mode: "WAIT",
  lastIssue: "",
  timerHint: 30,
  stats: { total: 0, win: 0, loss: 0, currentStreak: 0, maxWinStreak: 0, maxLossStreak: 0 },
  consecutiveLosses: 0,
  history: [],
  pulse: [],
  onlineFake: 1400,
  lastFetchAt: null,
  error: null,
};

let pendingPrediction = null; // { period, size, formula, detail }

function isSmall(n) {
  return n <= 4;
}
function toType(n) {
  return isSmall(n) ? "S" : "B";
}

function predictTripleOnly(nums) {
  if (nums.length < 3) {
    return {
      size: "WAIT",
      formula: "⏳ Need at least 3 results",
      detail: "Waiting for triple pattern history...",
      conf: 0,
      mode: "WAIT",
    };
  }
  const t1 = toType(nums[0]);
  const t2 = toType(nums[1]);
  const t3 = toType(nums[2]);
  const triple = t3 + t2 + t1;

  if (triple === "SSS")
    return { size: "BIG", formula: "📐 Triple SSS", detail: "Three Small → BIG", conf: 66, mode: "TRIPLE" };
  if (triple === "SBB")
    return { size: "BIG", formula: "📐 Triple SBB", detail: "S→B→B → BIG", conf: 63, mode: "TRIPLE" };
  if (triple === "BBB")
    return { size: "SMALL", formula: "📐 Triple BBB", detail: "Three Big → SMALL", conf: 60, mode: "TRIPLE" };
  if (triple === "BBS" || triple === "BSB")
    return { size: "SMALL", formula: "📐 Triple " + triple, detail: triple + " → SMALL", conf: 60, mode: "TRIPLE" };
  if (triple === "SSB")
    return { size: "SMALL", formula: "📐 Triple SSB", detail: "S→S→B → SMALL", conf: 58, mode: "TRIPLE" };
  if (triple === "SBS")
    return { size: "BIG", formula: "📐 Triple SBS", detail: "S→B→S → BIG", conf: 57, mode: "TRIPLE" };
  if (triple === "BSS")
    return { size: "BIG", formula: "📐 Triple BSS", detail: "B→S→S → BIG", conf: 56, mode: "TRIPLE" };

  return {
    size: "WAIT",
    formula: "⏳ No triple match (" + triple + ")",
    detail: "Pattern " + triple + " not in rules → waiting",
    conf: 0,
    mode: "WAIT",
  };
}

function processResult(latest, nums) {
  if (!pendingPrediction || pendingPrediction.size === "WAIT") return;

  const actSize = parseInt(latest.number, 10) >= 5 ? "BIG" : "SMALL";
  const predSize = pendingPrediction.size;
  const isWin = predSize === actSize;

  state.stats.total++;
  if (isWin) {
    state.stats.win++;
    state.stats.currentStreak++;
    if (state.stats.currentStreak > state.stats.maxWinStreak) {
      state.stats.maxWinStreak = state.stats.currentStreak;
    }
    state.consecutiveLosses = 0;
  } else {
    state.stats.loss++;
    state.stats.currentStreak = 0;
    state.consecutiveLosses++;
    if (state.consecutiveLosses > state.stats.maxLossStreak) {
      state.stats.maxLossStreak = state.consecutiveLosses;
    }
  }

  state.history.unshift({
    period: String(latest.issueNumber).slice(-4),
    predict: predSize,
    result: actSize,
    win: isWin,
    at: new Date().toISOString(),
  });
  if (state.history.length > 50) state.history.pop();
}

async function fetchAndPredict() {
  try {
    const url =
      "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageNo=1&pageSize=30";
    const res = await fetch(url);
    if (!res.ok) throw new Error("API " + res.status);
    const data = await res.json();
    const list = data.data && data.data.list ? data.data.list : [];
    if (!list.length) throw new Error("Empty list");

    const latest = list[0];
    const nums = list.map((i) => parseInt(i.number, 10));

    // New result arrived → score previous prediction
    if (state.lastIssue && latest.issueNumber !== state.lastIssue) {
      processResult(latest, nums);
    }
    state.lastIssue = latest.issueNumber;

    const nextPeriod = (BigInt(latest.issueNumber) + 1n).toString();
    state.period = nextPeriod;

    // Pulse bars (last 12)
    state.pulse = list
      .slice(0, 12)
      .reverse()
      .map((item) => {
        const n = parseInt(item.number, 10);
        return { big: n >= 5 };
      });

    // New prediction for next period
    if (!pendingPrediction || pendingPrediction.period !== nextPeriod) {
      const result = predictTripleOnly(nums);
      pendingPrediction = {
        period: nextPeriod,
        size: result.size,
        formula: result.formula,
        detail: result.detail,
        conf: result.conf,
        mode: result.mode,
      };
      state.prediction = result.size;
      state.formula = result.formula;
      state.detail = result.detail;
      state.conf = result.conf;
      state.mode = result.mode;
    }

    state.lastFetchAt = new Date().toISOString();
    state.error = null;
    state.onlineFake = 1280 + Math.floor(Math.random() * 280);
  } catch (e) {
    state.error = String(e.message || e);
    console.warn("[fetch]", state.error);
  }
}

// API for frontend
app.get("/api/status", (req, res) => {
  const s = new Date().getSeconds();
  let rem = 30 - (s % 30);
  if (rem === 0) rem = 30;

  res.json({
    period: state.period,
    prediction: state.prediction,
    formula: state.formula,
    detail: state.detail,
    conf: state.conf,
    mode: state.mode,
    timer: rem,
    stats: state.stats,
    history: state.history,
    pulse: state.pulse,
    online: state.onlineFake,
    lastFetchAt: state.lastFetchAt,
    error: state.error,
    serverTime: new Date().toISOString(),
  });
});

// Keep-alive ping (for free host + external cron)
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start loop: first fetch + every 15s
fetchAndPredict();
setInterval(fetchAndPredict, 15000);

app.listen(PORT, () => {
  console.log("XIN PRIME 24/7 running on port " + PORT);
});
