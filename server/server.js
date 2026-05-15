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

const TICKERS = ["SPY", "QQQ", "IWM", "NVDA", "AMD", "INTC", "AVGO", "MU", "TSM", "QCOM", "AMAT"];

async function fetchYahooQuote(ticker) {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + ticker + "?interval=1d&range=1d&includePrePost=true";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
  });
  if (!res.ok) throw new Error("Yahoo returned " + res.status);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  const preMarketPrice = meta.preMarketPrice ?? null;
  const regularMarketPrice = meta.regularMarketPrice;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  const displayPrice = preMarketPrice ?? regularMarketPrice;
  const change = displayPrice && prevClose ? ((displayPrice - prevClose) / prevClose) * 100 : null;

  return {
    ticker,
    price: displayPrice ? displayPrice.toFixed(2) : null,
    prevClose: prevClose ? prevClose.toFixed(2) : null,
    change: change !== null ? +change.toFixed(2) : null,
    isPreMarket: !!preMarketPrice,
    volume: meta.regularMarketVolume ? formatVolume(meta.regularMarketVolume) : null,
  };
}

function formatVolume(v) {
  if (v > 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v > 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v > 1e3) return (v / 1e3).toFixed(0) + "K";
  return v.toString();
}

app.get("/api/market-data", async (req, res) => {
  const results = {};
  await Promise.all(
    TICKERS.map(async (t) => {
      try { results[t] = await fetchYahooQuote(t); }
      catch (e) { results[t] = { error: e.message }; }
    })
  );
  res.json(results);
});

app.post("/api/generate-plays", async (req, res) => {
  try {
    const { marketData } = req.body;
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const pmContext = Object.entries(marketData || {})
      .filter(([, v]) => v && !v.error && v.price)
      .map(([t, v]) => t + ": $" + v.price + " (" + (v.change >= 0 ? "+" : "") + v.change + "%, prev $" + v.prevClose + (v.isPreMarket ? ", pre-mkt" : "") + ")")
      .join(" | ");

    const prompt = "You are an expert options trader. Today is " + today + ".\n\nLIVE MARKET DATA:\n" + pmContext + "\n\nReturn ONLY a raw JSON object - no markdown, no backticks:\n{\n  \"etf_plays\": [\n    {\"ticker\":\"SPY\",\"strategy\":\"Iron Condor\",\"sentiment\":\"Neutral\",\"probability\":78,\"strike\":\"535/540/560/565\",\"expiry\":\"May 23\",\"iv\":18,\"rr\":\"1:2.4\",\"delta\":\"0.12\",\"maxProfit\":\"$320\",\"maxLoss\":\"$180\",\"rationale\":\"2-3 sentences using real price levels.\",\"premarketNote\":\"1 sentence on current move.\"}\n  ],\n  \"semi_plays\": [ ...same shape, 4 plays... ]\n}\n\nRules:\n- Exactly 3 ETF plays: SPY, QQQ, IWM\n- Exactly 4 semi plays from: NVDA, AMD, INTC, AVGO, MU, TSM, QCOM, AMAT\n- Use REAL prices from data above for strikes\n- Mix strategies and sentiments\n- Probability 62-84%";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2500,
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
