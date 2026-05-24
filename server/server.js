
let yahooCredentials = null;

async function getYahooCrumb() {
  if (yahooCredentials && Date.now() - yahooCredentials.fetchedAt < 3600000) return yahooCredentials;
  try {
    const cookieRes = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": USER_AGENT } });
    const cookies = cookieRes.headers.get("set-cookie") || "";
    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": USER_AGENT, "Cookie": cookies } });
    const crumb = await crumbRes.text();
    if (crumb && crumb.length > 0) { yahooCredentials = { crumb, cookies, fetchedAt: Date.now() }; return yahooCredentials; }
  } catch(e) {}
  return null;
}
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) {
  console.error("Missing ANTHROPIC_API_KEY in .env file");
  process.exit(1);
}

const SECTIONS = {
  etfs:       { label: "ETF Index Plays — SPY · QQQ · IWM", icon: "📊", tickers: ["SPY", "QQQ", "IWM"] },
  semis:      { label: "Semiconductors",                    icon: "🔬", tickers: ["NVDA", "AMD", "INTC", "AVGO", "MU", "TSM", "QCOM", "AMAT"] },
  megacaps:   { label: "Mega-Caps",                         icon: "🏛️", tickers: ["AAPL", "MSFT", "GOOGL", "META", "AMZN", "TSLA"] },
  financials: { label: "Financials",                        icon: "🏦", tickers: ["JPM", "BAC", "GS", "WFC", "C"] },
  energy:     { label: "Energy",                            icon: "⚡", tickers: ["XLE", "XOM", "CVX", "COP", "OXY"] },
  crypto:     { label: "Crypto-Adjacent",                   icon: "₿",  tickers: ["COIN", "MSTR", "MARA", "RIOT"] },
  healthcare: { label: "Healthcare",                        icon: "⚕️", tickers: ["UNH", "LLY", "JNJ", "PFE"] },
};

const TIMEFRAMES = {
  "0dte":    { label: "0DTE",    daysMin: 0,  daysMax: 1,   description: "Same-day expiry, extreme gamma" },
  "weekly":  { label: "Weekly",  daysMin: 2,  daysMax: 9,   description: "1-week expiry, balanced theta" },
  "monthly": { label: "Monthly", daysMin: 21, daysMax: 35,  description: "Standard monthly cycle" },
  "45dte":   { label: "45 DTE",  daysMin: 38, daysMax: 55,  description: "Tasty-Trade sweet spot" },
};

const SCREENER_UNIVERSE = [
  "AAPL","MSFT","GOOGL","AMZN","META","TSLA","NVDA","JPM","V","UNH",
  "XOM","MA","LLY","JNJ","PG","HD","MRK","ABBV","CVX","PEP",
  "AMD","INTC","AVGO","QCOM","AMAT","ARM","SMCI","TSM","MRVL","KLAC",
  "LRCX","MU","ORCL","CRM","NOW","SNOW","DDOG","NET","ZS","CRWD",
  "PANW","OKTA","FTNT","PLTR","SHOP","NFLX","DIS","CMCSA","SPOT","RBLX",
  "EA","SNAP","PINS","TWLO","BILL","HUBS","MDB","CFLT","U","S",
  "BAC","GS","WFC","C","MS","BLK","SCHW","AXP","COF","USB",
  "SPGI","MCO","ICE","CME","HOOD","SOFI","COIN","MSTR","AFRM","UPST",
  "SQ","PYPL","NU","CVS","CI","HUM","ISRG","BSX","MDT","SYK",
  "MRNA","BNTX","REGN","VRTX","GILD","AMGN","BIIB","ILMN","PFE","BMY",
  "COP","OXY","SLB","HAL","MPC","PSX","VLO","DVN","EOG","APA",
  "WMT","COST","TGT","LOW","NKE","LULU","SBUX","MCD","CMG","YUM",
  "TJX","ROST","BURL","ANF","AEO","CAT","DE","BA","LMT","RTX",
  "NOC","GD","GE","HON","MMM","UPS","FDX","DAL","UAL","AAL",
  "GME","AMC","BB","SPCE","RIVN","LCID","MARA","RIOT","HUT","CLSK",
  "RKLB","IONQ","JOBY","ACHR","VRT","DELL","HPQ",
  "SPY","QQQ","IWM","GLD","SLV","USO","XLE","XLK","XLF",
  "XBI","IBB","ARKK","SMH","SOXX","TLT","HYG","VXX","UVXY","SOXS"
];

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

function formatVolume(v) {
  if (v > 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v > 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v > 1e3) return (v / 1e3).toFixed(0) + "K";
  return v.toString();
}

async function fetchYahooQuote(ticker) {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + ticker + "?interval=1d&range=1d&includePrePost=true";
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error("Yahoo returned " + res.status);
  const json = await res.json();
  const meta = json && json.chart && json.chart.result && json.chart.result[0] && json.chart.result[0].meta;
  if (!meta) return null;
  const preMarketPrice = meta.preMarketPrice || null;
  const regularMarketPrice = meta.regularMarketPrice;
  const prevClose = meta.previousClose || meta.chartPreviousClose;
  const displayPrice = preMarketPrice || regularMarketPrice;
  const change = displayPrice && prevClose ? ((displayPrice - prevClose) / prevClose) * 100 : null;
  const earningsTs = meta.earningsTimestamp || meta.earningsTimestampEnd || meta.earningsTimestampStart || null;
  const now = Math.floor(Date.now() / 1000);
  const sevenDays = 7 * 24 * 60 * 60;
  const earnings = earningsTs ? {
    timestamp: earningsTs,
    daysUntil: Math.round((earningsTs - now) / 86400),
    withinWeek: earningsTs >= now && earningsTs <= now + sevenDays,
    dateString: new Date(earningsTs * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  } : null;
  return {
    ticker,
    price: displayPrice ? displayPrice.toFixed(2) : null,
    rawPrice: displayPrice,
    prevClose: prevClose ? prevClose.toFixed(2) : null,
    change: change !== null ? +change.toFixed(2) : null,
    isPreMarket: !!preMarketPrice,
    volume: meta.regularMarketVolume ? formatVolume(meta.regularMarketVolume) : null,
    rawVolRatio: meta.regularMarketVolume && meta.averageDailyVolume10Day ? meta.regularMarketVolume / meta.averageDailyVolume10Day : null,
    earnings,
  };
}

function formatOption(opt) {
  return {
    strike: opt.strike,
    bid: opt.bid || 0,
    ask: opt.ask || 0,
    mid: opt.bid && opt.ask ? +((opt.bid + opt.ask) / 2).toFixed(2) : null,
    last: opt.lastPrice || 0,
    volume: opt.volume || 0,
    openInterest: opt.openInterest || 0,
    iv: opt.impliedVolatility ? +(opt.impliedVolatility * 100).toFixed(1) : null,
    inTheMoney: opt.inTheMoney,
  };
}

function calculateAvgIV(calls, puts) {
  const all = [...calls, ...puts].filter(o => o.impliedVolatility);
  if (!all.length) return null;
  const avg = all.reduce((s, o) => s + o.impliedVolatility, 0) / all.length;
  return +(avg * 100).toFixed(1);
}

async function fetchOptionsChain(ticker, targetDaysMin, targetDaysMax) {
  try {
    const url = "https://query2.finance.yahoo.com/v7/finance/options/" + ticker;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json && json.optionChain && json.optionChain.result && json.optionChain.result[0];
    if (!result) return null;
    const expirations = result.expirationDates || [];
    const now = Math.floor(Date.now() / 1000);
    const matchingExpirations = expirations.filter(exp => {
      const days = (exp - now) / 86400;
      return days >= targetDaysMin && days <= targetDaysMax;
    });
    if (matchingExpirations.length === 0) return null;
    const targetMid = (targetDaysMin + targetDaysMax) / 2;
    const bestExp = matchingExpirations.reduce((best, exp) => {
      const days = (exp - now) / 86400;
      const bestDays = (best - now) / 86400;
      return Math.abs(days - targetMid) < Math.abs(bestDays - targetMid) ? exp : best;
    });
    const chainUrl = "https://query2.finance.yahoo.com/v7/finance/options/" + ticker + "?date=" + bestExp;
    const chainRes = await fetch(chainUrl, { headers: { "User-Agent": USER_AGENT } });
    if (!chainRes.ok) return null;
    const chainJson = await chainRes.json();
    const chainResult = chainJson && chainJson.optionChain && chainJson.optionChain.result && chainJson.optionChain.result[0];
    if (!chainResult) return null;
    const options = chainResult.options && chainResult.options[0];
    const calls = (options && options.calls) || [];
    const puts = (options && options.puts) || [];
    const currentPrice = (chainResult.quote && chainResult.quote.regularMarketPrice) || 0;
    const findClosest = (arr, target) => {
      if (!arr.length) return null;
      return arr.reduce((best, opt) =>
        Math.abs(opt.strike - target) < Math.abs(best.strike - target) ? opt : best
      );
    };
    const atmCall = findClosest(calls, currentPrice);
    const atmPut = findClosest(puts, currentPrice);
    const otmCall = findClosest(calls.filter(c => c.strike > currentPrice * 1.02), currentPrice * 1.05);
    const otmPut = findClosest(puts.filter(p => p.strike < currentPrice * 0.98), currentPrice * 0.95);
    const expDate = new Date(bestExp * 1000);
    const daysToExp = Math.round((bestExp - now) / 86400);
    return {
      expiry: expDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daysToExp,
      currentPrice,
      atm: { call: atmCall ? formatOption(atmCall) : null, put: atmPut ? formatOption(atmPut) : null },
      otm: { call: otmCall ? formatOption(otmCall) : null, put: otmPut ? formatOption(otmPut) : null },
      callCount: calls.length,
      putCount: puts.length,
      avgIV: calculateAvgIV(calls, puts),
    };
  } catch (e) {
    console.error("Options chain error for " + ticker + ":", e.message);
    return null;
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/api/sections", (req, res) => res.json(SECTIONS));
app.get("/api/timeframes", (req, res) => res.json(TIMEFRAMES));

app.post("/api/market-data", async (req, res) => {
  const { customWatchlist = [] } = req.body || {};
  const base = Object.values(SECTIONS).flatMap(s => s.tickers);
  const tickers = [...new Set([...base, "^VIX", ...customWatchlist])];
  const results = {};
  await Promise.all(tickers.map(async (t) => {
    try {
      const quote = await fetchYahooQuote(t);
      results[t] = quote;
    } catch (e) {
      results[t] = { error: e.message };
    }
  }));
  res.json(results);
});

app.post("/api/options-chains", async (req, res) => {
  const { tickers = [], timeframe = "weekly" } = req.body || {};
  const tf = TIMEFRAMES[timeframe];
  if (!tf) return res.status(400).json({ error: "Invalid timeframe" });
  const results = {};
  const batchSize = 4;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    await Promise.all(batch.map(async (t) => {
      if (t.startsWith("^")) return;
      try {
        results[t] = await fetchOptionsChain(t, tf.daysMin, tf.daysMax);
      } catch (e) {
        results[t] = { error: e.message };
      }
    }));
  }
  res.json(results);
});

app.post("/api/generate-plays", async (req, res) => {
  try {
    const { marketData, optionsChains, customWatchlist = [], timeframe = "weekly" } = req.body;
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const tf = TIMEFRAMES[timeframe];
    const sectionsForAI = { ...SECTIONS };
    if (customWatchlist.length > 0) sectionsForAI.custom = { label: "My Watchlist", tickers: customWatchlist };

    const sectionContexts = Object.entries(sectionsForAI).map(([key, sec]) => {
      const data = sec.tickers.map(t => {
        const md = marketData && marketData[t];
        const oc = optionsChains && optionsChains[t];
        if (!md || md.error || !md.price) return null;
        const earnFlag = md.earnings && md.earnings.withinWeek ? " [EARNINGS " + md.earnings.dateString + "]" : "";
        let info = t + ": $" + md.price + " (" + (md.change >= 0 ? "+" : "") + md.change + "%)" + earnFlag;
        if (oc && !oc.error) {
          info += " | Chain " + oc.expiry + " (" + oc.daysToExp + "d): ";
          if (oc.atm && oc.atm.call) info += "ATM Call " + oc.atm.call.strike + " $" + oc.atm.call.mid + " IV " + oc.atm.call.iv + "% ";
          if (oc.otm && oc.otm.call) info += "OTM Call " + oc.otm.call.strike + " $" + oc.otm.call.mid + " IV " + oc.otm.call.iv + "% ";
          if (oc.otm && oc.otm.put) info += "OTM Put " + oc.otm.put.strike + " $" + oc.otm.put.mid + " IV " + oc.otm.put.iv + "%";
          if (oc.avgIV) info += " | Avg IV " + oc.avgIV + "%";
        }
        return info;
      }).filter(Boolean).join("\n  ");
      return key + " (" + sec.label + "):\n  " + data;
    }).join("\n\n");

    const vix = marketData && marketData["^VIX"];
    const vixContext = vix && vix.price ? "VIX: " + vix.price + " (" + (vix.change >= 0 ? "+" : "") + vix.change + "%)" : "VIX unavailable";
    const tfGuidance = timeframe === "0dte" ? "Favor scalps, lottery tickets, fast directional plays." :
                       timeframe === "weekly" ? "Mix of credit spreads AND simple long calls/puts." :
                       timeframe === "monthly" ? "Iron condors, calendar spreads, simple directional calls/puts." :
                       "High probability iron condors, strangles, defined-risk spreads.";

    const prompt = "You are an expert options trader. Today is " + today + ".\n" +
      "Selected timeframe: " + tf.label + " (" + tf.description + ")\n\n" +
      "MARKET CONDITIONS:\n" + vixContext + "\n\n" +
      "LIVE PRICES & OPTIONS CHAINS:\n" + sectionContexts + "\n\n" +
      "CRITICAL: Use REAL strikes and prices from the chains above.\n" +
      "Strategy guidance: " + tfGuidance + "\n" +
      "Include a mix of: simple long calls, simple long puts, bull put spreads, bear call spreads, iron condors, straddles.\n\n" +
      "Return ONLY a raw JSON object — no markdown:\n" +
      '{"plays":{"etfs":[{"ticker":"SPY","strategy":"...","sentiment":"Neutral","probability":78,"strike":"REAL_STRIKE","expiry":"REAL_EXPIRY","iv":REAL_IV,"rr":"1:2.4","delta":"0.12","maxProfit":"$320","maxLoss":"$180","rationale":"...","premarketNote":"..."}],"semis":[...3...],"megacaps":[...3...],"financials":[...2...],"energy":[...2...],"crypto":[...2...],"healthcare":[...2...]' +
      (customWatchlist.length ? ',"custom":[...one per ticker...]' : '') + "}}\n\n" +
      "Rules:\n- etfs/semis/megacaps: 3 plays each\n- financials/energy/crypto/healthcare: 2 each\n" +
      (customWatchlist.length ? "- custom: one play per ticker in [" + customWatchlist.join(", ") + "]\n" : "") +
      "- Probability 60-85%\n- Use real IV from chain data";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      throw new Error("Anthropic API error: " + err);
    }

    const data = await anthropicRes.json();
    const raw = data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonStr = jsonStart !== -1 ? raw.slice(jsonStart, jsonEnd + 1) : raw;
    const parsed = JSON.parse(jsonStr);
    res.json(parsed);
  } catch (e) {
    console.error("Generate plays failed:", e);
    res.status(500).json({ error: e.message });
  }
});

// Earnings cache — refreshes once per day to stay within Alpha Vantage free tier
let earningsCache = { data: [], fetchedAt: 0 };

app.get("/api/earnings-calendar", async (req, res) => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Return cached data if less than 24 hours old
  if (earningsCache.data.length > 0 && (now - earningsCache.fetchedAt) < ONE_DAY) {
    return res.json(earningsCache.data);
  }

  const allTickers = Object.values(SECTIONS).flatMap(s => s.tickers);
  const AV_KEY = "5ITUWF1O6BQSRJMI";
  try {
    const url = "https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=" + AV_KEY;
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const text = await r.text();

    // Check if Alpha Vantage returned an error (rate limit etc)
    if (text.includes("Information") || text.includes("rate limit") || !text.includes(",")) {
      console.log("Alpha Vantage limit hit, returning cached data");
      return res.json(earningsCache.data);
    }

    const lines = text.trim().split("\n").slice(1);
    const results = [];
    const nowSec = Math.floor(now / 1000);

    for (const line of lines) {
      const parts = line.split(",");
      const symbol = parts[0] && parts[0].trim();
      const reportDate = parts[2] && parts[2].trim();
      const estimate = parts[4] && parts[4].trim();
      if (!symbol || !allTickers.includes(symbol)) continue;
      const date = new Date(reportDate);
      if (isNaN(date.getTime()) || date.getTime() < now - 86400000) continue;
      const daysUntil = Math.round((date.getTime() - now) / 86400000);
      const quote = await fetchYahooQuote(symbol).catch(() => null);
      results.push({
        ticker: symbol,
        price: quote && quote.price,
        change: quote && quote.change,
        daysUntil,
        earningsDate: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        timestamp: Math.floor(date.getTime() / 1000),
        epsEstimate: estimate ? parseFloat(estimate) || null : null,
      });
    }

    results.sort((a, b) => a.timestamp - b.timestamp);
    earningsCache = { data: results, fetchedAt: now };
    res.json(results);
  } catch (e) {
    console.error("Earnings error:", e.message);
    res.json(earningsCache.data);
  }
});

app.get("/api/earnings-detail/:ticker", async (req, res) => {
  const { ticker } = req.params;
  try {
    const url = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + ticker +
      "?modules=financialData,defaultKeyStatistics,earningsHistory,recommendationTrend";
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!r.ok) return res.json({});
    const json = await r.json();
    const result = json && json.quoteSummary && json.quoteSummary.result && json.quoteSummary.result[0];
    if (!result) return res.json({});

    const fd = result.financialData || {};
    const ks = result.defaultKeyStatistics || {};
    const eh = result.earningsHistory || {};
    const rt = result.recommendationTrend || {};

    // Surprise history from last 4 quarters
    const history = (eh.history || []).slice(-4).map(q => ({
      quarter: q.period || "",
      estimate: q.epsEstimate && q.epsEstimate.raw != null ? q.epsEstimate.raw.toFixed(2) : "—",
      actual: q.epsActual && q.epsActual.raw != null ? q.epsActual.raw.toFixed(2) : "—",
      surprise: q.epsDifference && q.epsDifference.raw != null ? +(q.epsDifference.raw * 100 / Math.abs(q.epsEstimate.raw || 1)).toFixed(1) : 0,
    }));

    // Analyst recommendation
    const trend = rt.trend && rt.trend[0];
    const rating = fd.recommendationKey ? fd.recommendationKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : null;
    const targetPrice = fd.targetMeanPrice && fd.targetMeanPrice.raw ? fd.targetMeanPrice.raw.toFixed(2) : null;
    const numAnalysts = fd.numberOfAnalystOpinions && fd.numberOfAnalystOpinions.raw || null;

    // Revenue estimate
    const revEst = fd.revenueEstimate && fd.revenueEstimate.raw;
    const revenueEstimate = revEst ? (revEst > 1e9 ? "$" + (revEst / 1e9).toFixed(1) + "B" : "$" + (revEst / 1e6).toFixed(0) + "M") : null;
    const epsEstimate = ks.forwardEps && ks.forwardEps.raw != null ? ks.forwardEps.raw.toFixed(2) : null;
    const epsGrowth = ks.earningsQuarterlyGrowth && ks.earningsQuarterlyGrowth.raw != null ? +(ks.earningsQuarterlyGrowth.raw * 100).toFixed(1) : null;

    res.json({ rating, targetPrice, numAnalysts, revenueEstimate, epsEstimate, epsGrowth, surpriseHistory: history });
  } catch (e) {
    console.error("Earnings detail error for " + ticker + ":", e.message);
    res.json({});
  }
});

app.get("/api/chart/:ticker", async (req, res) => {
  const { ticker } = req.params;
  const { range = "3mo", interval = "1d" } = req.query;
  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + ticker + "?interval=" + interval + "&range=" + range + "&includePrePost=false";
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const json = await r.json();
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/screener", async (req, res) => {
  const sort = req.query.sort || "score";
  const limit = parseInt(req.query.limit || "20");
  const results = [];
  const batchSize = 8;
  for (let i = 0; i < SCREENER_UNIVERSE.length; i += batchSize) {
    const batch = SCREENER_UNIVERSE.slice(i, i + batchSize);
    await Promise.all(batch.map(async (ticker) => {
      try {
        const quote = await fetchYahooQuote(ticker);
        if (!quote || !quote.price || quote.error) return;
        const changeAbs = Math.abs(quote.change || 0);
        const volRatio = quote.rawVolRatio || 1;
        let iv = null;
        try {
          const optRes = await fetch("https://query2.finance.yahoo.com/v7/finance/options/" + ticker, { headers: { "User-Agent": USER_AGENT } });
          if (optRes.ok) {
            const optJson = await optRes.json();
            const chain = optJson && optJson.optionChain && optJson.optionChain.result && optJson.optionChain.result[0];
            const calls = (chain && chain.options && chain.options[0] && chain.options[0].calls) || [];
            const puts = (chain && chain.options && chain.options[0] && chain.options[0].puts) || [];
            iv = calculateAvgIV(calls, puts);
          }
        } catch (e) {}
        const volScore = Math.min(volRatio / 5, 1) * 35;
        const ivScore = iv ? Math.min(iv / 100, 1) * 35 : 0;
        const moveScore = Math.min(changeAbs / 10, 1) * 30;
        const score = Math.round(volScore + ivScore + moveScore);
        results.push({
          ticker, price: quote.price, change: quote.change, volume: quote.volume,
          iv, score, volRatio: quote.rawVolRatio ? +quote.rawVolRatio.toFixed(1) : null,
          isPreMarket: quote.isPreMarket,
        });
      } catch (e) {}
    }));
  }
  const sorted = results.sort((a, b) => {
    if (sort === "iv") return (b.iv || 0) - (a.iv || 0);
    if (sort === "volume") return (b.volRatio || 0) - (a.volRatio || 0);
    if (sort === "move") return Math.abs(b.change || 0) - Math.abs(a.change || 0);
    return b.score - a.score;
  });
  res.json(sorted.slice(0, limit));
});

// ── In-memory alerts store ────────────────────────────────────────────────────
let alertsStore = [];

app.get("/api/alerts", (req, res) => {
  res.json({ alerts: alertsStore });
});

app.post("/api/alerts/clear", (req, res) => {
  alertsStore = [];
  res.json({ ok: true });
});

app.post("/api/alert", (req, res) => {
  const alert = req.body;
  if (!alert.ticker && !alert.signal) return res.status(400).json({ error: "Missing ticker or signal" });
  alertsStore.unshift({
    id: Date.now(),
    ticker: alert.ticker,
    signal: alert.signal,
    action: alert.signal,
    message: alert.strategy || alert.signal || "Alert fired",
    price: alert.close,
    receivedAt: new Date().toISOString(),
  });
  if (alertsStore.length > 50) alertsStore = alertsStore.slice(0, 50);
  res.json({ ok: true });
});

// ── Gamma Exposure ────────────────────────────────────────────────────────────
app.post("/api/gamma-exposure", async (req, res) => {
  const { tickers = ["SPY", "QQQ", "IWM"] } = req.body || {};
  const results = {};
  await Promise.all(tickers.map(async (ticker) => {
    try {
      const creds = await getYahooCrumb().catch(() => null);
      const crumbParam = creds ? "&crumb=" + creds.crumb : "";
      const hdrs = creds ? { "User-Agent": USER_AGENT, "Cookie": creds.cookies } : { "User-Agent": USER_AGENT };
      const url = "https://query2.finance.yahoo.com/v7/finance/options/" + ticker + "?formatted=false" + crumbParam;
      const r = await fetch(url, { headers: hdrs });
      if (!r.ok) return;
      const json = await r.json();
      const result = json && json.optionChain && json.optionChain.result && json.optionChain.result[0];
      if (!result) return;
      const spot = result.quote && result.quote.regularMarketPrice;
      const options = result.options && result.options[0];
      const calls = (options && options.calls) || [];
      const puts = (options && options.puts) || [];
      let netGex = 0;
      const profile = {};
      calls.forEach(c => {
        if (!c.strike || !c.openInterest || !c.impliedVolatility) return;
        const gex = c.openInterest * 100 * spot * spot * c.impliedVolatility * 0.01;
        netGex += gex;
        profile[c.strike] = (profile[c.strike] || 0) + gex;
      });
      puts.forEach(p => {
        if (!p.strike || !p.openInterest || !p.impliedVolatility) return;
        const gex = -p.openInterest * 100 * spot * spot * p.impliedVolatility * 0.01;
        netGex += gex;
        profile[p.strike] = (profile[p.strike] || 0) + gex;
      });
      const profileArr = Object.entries(profile)
        .map(([strike, gamma]) => ({ strike: parseFloat(strike), gamma: +(gamma / 1e9).toFixed(3) }))
        .sort((a, b) => a.strike - b.strike);
      const netGexM = +(netGex / 1e9).toFixed(2);
      const flipEntry = profileArr.find((p, i) => i > 0 && Math.sign(p.gamma) !== Math.sign(profileArr[i - 1].gamma));
      const walls = profileArr.filter(p => Math.abs(p.gamma) > Math.max(...profileArr.map(x => Math.abs(x.gamma))) * 0.6).slice(0, 3);
      const flipPoint = flipEntry ? flipEntry.strike : null;
      results[ticker] = {
        netGex: netGexM,
        regime: netGexM >= 0 ? "positive" : "negative",
        spot: spot ? +spot.toFixed(2) : null,
        flipPoint: flipPoint ? +flipPoint.toFixed(0) : null,
        flipVsSpot: flipPoint && spot ? +((flipPoint - spot) / spot * 100).toFixed(1) : null,
        walls: walls.map(w => ({ strike: w.strike, gamma: w.gamma })),
        profile: profileArr,
      };
    } catch (e) {
      results[ticker] = { error: e.message };
    }
  }));
  res.json(results);
});

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("Static path:", path.join(__dirname, "../frontend/dist"));
app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.get("*", (req, res) => { res.sendFile(path.join(__dirname, "../frontend/dist/index.html")); });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
  console.log("Sections:", Object.keys(SECTIONS).join(", "));
  console.log("Timeframes:", Object.keys(TIMEFRAMES).join(", "));
});
