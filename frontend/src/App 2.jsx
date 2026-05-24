import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:3003";

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

function LoadingBar({ active }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (active) {
      setW(20);
      const t = setTimeout(() => setW(70), 600);
      return () => clearTimeout(t);
    } else {
      setW(100);
      const t = setTimeout(() => setW(0), 300);
      return () => clearTimeout(t);
    }
  }, [active]);
  return (
    <div style={{ width: "100%", height: 3, background: "#0d0f1e", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: "linear-gradient(90deg,#00d4ff,#7b2fff)", borderRadius: 2, transition: "width 0.5s ease" }} />
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", minWidth: 66 }}>
      <span style={{ fontSize: 10, color: "#6b7a99", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || "#e8eaf6", fontFamily: "'IBM Plex Mono',monospace" }}>{value}</span>
    </div>
  );
}

function MarketBadge({ data }) {
  if (!data || data.error || !data.price) {
    return <div style={{ marginTop: 8, fontSize: 11, color: "#3d4461", fontStyle: "italic" }}>Market data unavailable</div>;
  }
  const cc = data.change > 0 ? "#00e5a0" : data.change < 0 ? "#ff4d6d" : "#fbbf24";
  return (
    <div style={{ marginTop: 10, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "9px 13px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
      <span style={{ fontSize: 10, color: data.isPreMarket ? "#00d4ff" : "#6b7a99", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'IBM Plex Mono',monospace" }}>
        {data.isPreMarket ? "Pre-Mkt" : "Last"}
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: "#e8eaf6" }}>${data.price}</span>
      {data.change !== null && (
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: cc }}>
          {data.change > 0 ? "▲" : "▼"} {Math.abs(data.change).toFixed(2)}%
        </span>
      )}
      {Math.abs(data.change || 0) > 0.5 && (
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", background: data.change > 0 ? "rgba(0,229,160,0.15)" : "rgba(255,77,109,0.15)", border: `1px solid ${data.change > 0 ? "rgba(0,229,160,0.3)" : "rgba(255,77,109,0.3)"}`, color: data.change > 0 ? "#00e5a0" : "#ff4d6d", borderRadius: 5, padding: "2px 6px" }}>
          {data.change > 0 ? "GAP UP" : "GAP DOWN"}
        </span>
      )}
      {data.prevClose && (
        <span style={{ fontSize: 11, color: "#4a5568", fontFamily: "'IBM Plex Mono',monospace" }}>
          Prev: <span style={{ color: "#6b7a99" }}>${data.prevClose}</span>
        </span>
      )}
      {data.volume && (
        <span style={{ fontSize: 11, color: "#4a5568" }}>Vol: <span style={{ color: "#6b7a99", fontFamily: "'IBM Plex Mono',monospace" }}>{data.volume}</span></span>
      )}
    </div>
  );
}

function PlayCard({ play, index, marketData }) {
  const [expanded, setExpanded] = useState(false);
  const sc = { Bullish: "#00e5a0", Bearish: "#ff4d6d", Neutral: "#fbbf24" }[play.sentiment] || "#e8eaf6";
  const pc = play.probability >= 75 ? "#00e5a0" : play.probability >= 60 ? "#fbbf24" : "#ff4d6d";
  const md = marketData?.[play.ticker];

  return (
    <div onClick={() => setExpanded(!expanded)}
      style={{ background: "linear-gradient(135deg,rgba(20,22,40,0.9),rgba(15,16,30,0.95))", border: `1px solid ${expanded ? "rgba(0,212,255,0.35)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "18px 20px", cursor: "pointer", transition: "border-color 0.2s", animation: "fadeSlideIn 0.4s ease both", animationDelay: `${index * 0.07}s`, position: "relative", overflow: "hidden" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = expanded ? "rgba(0,212,255,0.35)" : "rgba(255,255,255,0.07)"}
    >
      <div style={{ position: "absolute", top: 0, left: 0, height: 3, width: `${play.probability}%`, background: `linear-gradient(90deg,${pc}55,${pc})`, borderRadius: "14px 0 0 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8, padding: "4px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 700, color: "#00d4ff" }}>{play.ticker}</div>
          <div style={{ color: sc, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {play.sentiment === "Bullish" ? "▲" : play.sentiment === "Bearish" ? "▼" : "◆"} {play.sentiment}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 800, color: pc }}>{play.probability}%</div>
          <div style={{ fontSize: 10, color: "#6b7a99", letterSpacing: "0.05em" }}>WIN PROB</div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: "#c5cae9" }}>{play.strategy}</div>
      <MarketBadge data={md} />
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatPill label="Strike" value={play.strike} />
        <StatPill label="Expiry" value={play.expiry} />
        <StatPill label="IV%" value={play.iv + "%"} color={play.iv > 40 ? "#ff4d6d" : "#fbbf24"} />
        <StatPill label="R/R" value={play.rr} color="#00e5a0" />
      </div>
      {expanded && (
        <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, animation: "fadeIn 0.2s ease" }}>
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>{play.rationale}</p>
          {play.premarketNote && (
            <div style={{ marginTop: 10, background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#7dd3fc", lineHeight: 1.6 }}>
              📡 <strong>Market insight:</strong> {play.premarketNote}
            </div>
          )}
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            {[["MAX PROFIT", play.maxProfit, "#00e5a0", "rgba(0,229,160,0.07)", "rgba(0,229,160,0.15)"],
              ["MAX LOSS", play.maxLoss, "#ff4d6d", "rgba(255,77,109,0.07)", "rgba(255,77,109,0.15)"],
              ["DELTA", play.delta, "#a78bfa", "rgba(123,47,255,0.07)", "rgba(123,47,255,0.2)"]
            ].map(([lbl, val, clr, bg, br]) => (
              <div key={lbl} style={{ flex: 1, background: bg, border: `1px solid ${br}`, borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 10, color: "#6b7a99", marginBottom: 3, letterSpacing: "0.06em" }}>{lbl}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: clr }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, plays, loading, marketData }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7986cb" }}>{title}</h2>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(121,134,203,0.3),transparent)" }} />
        {loading && <div style={{ width: 16, height: 16, border: "2px solid rgba(0,212,255,0.15)", borderTop: "2px solid #00d4ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {plays.map((p, i) => <PlayCard key={p.ticker + i} play={p} index={i} marketData={marketData} />)}
        {!loading && plays.length === 0 && (
          <div style={{ color: "#6b7a99", fontSize: 13, textAlign: "center", padding: 24 }}>Generating plays…</div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [etfPlays, setEtfPlays] = useState([]);
  const [semiPlays, setSemiPlays] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStep("Fetching live market data…");
      const mdRes = await fetch(`${API_BASE}/api/market-data`);
      if (!mdRes.ok) throw new Error("Backend not responding. Is the server running on port 3001?");
      const md = await mdRes.json();
      setMarketData(md);

      setStep("Generating option plays…");
      const playsRes = await fetch(`${API_BASE}/api/generate-plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketData: md }),
      });
      if (!playsRes.ok) {
        const errData = await playsRes.json();
        throw new Error(errData.error || "Failed to generate plays");
      }
      const plays = await playsRes.json();
      setEtfPlays(plays.etf_plays || []);
      setSemiPlays(plays.semi_plays || []);
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setStep("");
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const liveCount = Object.values(marketData).filter(v => v && !v.error && v.price).length;
  const hasPlays = etfPlays.length > 0 || semiPlays.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080a14", color: "#e8eaf6", fontFamily: "'DM Sans','Segoe UI',sans-serif", paddingBottom: 60, backgroundImage: "radial-gradient(ellipse at 20% 0%,rgba(0,212,255,0.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(123,47,255,0.07) 0%,transparent 60%)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>

      <div style={{ background: "rgba(8,10,20,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px max(16px,calc(50% - 390px))", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(14px)" }}>
        <LoadingBar active={loading} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12, gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: loading ? "#fbbf24" : liveCount > 0 ? "#00e5a0" : "#ff4d6d", animation: "pulse 2s ease infinite" }} />
              <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", color: loading ? "#fbbf24" : liveCount > 0 ? "#00e5a0" : "#ff4d6d", letterSpacing: "0.1em" }}>
                {loading ? (step || "LOADING…").toUpperCase() : liveCount > 0 ? `LIVE · ${liveCount}/11 TICKERS` : "OFFLINE"}
              </span>
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", background: "linear-gradient(135deg,#e8eaf6,#7986cb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Daily High-Prob Option Plays
            </h1>
            <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 2 }}>{today}</div>
          </div>
          <button onClick={fetchAll} disabled={loading}
            style={{ background: loading ? "rgba(0,212,255,0.04)" : "linear-gradient(135deg,rgba(0,212,255,0.12),rgba(123,47,255,0.12))", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 10, padding: "9px 16px", color: loading ? "#4a5568" : "#00d4ff", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.06em" }}>
            {loading ? "⟳ Loading…" : "↻ Refresh"}
          </button>
        </div>
        {lastUpdated && !loading && (
          <div style={{ fontSize: 10, color: "#3d4461", marginTop: 8, fontFamily: "'IBM Plex Mono',monospace" }}>
            Updated {lastUpdated} · Data via Yahoo Finance + Claude AI
          </div>
        )}
      </div>

      <div style={{ margin: "14px max(16px,calc(50% - 390px))", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 10, padding: "9px 14px", fontSize: 11, color: "#92813a", lineHeight: 1.5 }}>
        ⚠️ <strong style={{ color: "#fbbf24" }}>Educational use only.</strong> AI-generated plays with live market data — not financial advice.
      </div>

      <div style={{ padding: "4px max(16px,calc(50% - 390px)) 0" }}>
        {error && (
          <div style={{ background: "rgba(255,77,109,0.07)", border: "1px solid rgba(255,77,109,0.18)", borderRadius: 10, padding: "12px 16px", color: "#ff4d6d", fontSize: 13, marginBottom: 16 }}>
            {error} <button onClick={fetchAll} style={{ background: "none", border: "none", color: "#ff8fa3", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Retry</button>
          </div>
        )}
        <Section title="ETF Index Plays — SPY · QQQ · IWM" icon="📊" plays={etfPlays} loading={loading && etfPlays.length === 0} marketData={marketData} />
        <Section title="Semiconductor Plays" icon="🔬" plays={semiPlays} loading={loading && semiPlays.length === 0} marketData={marketData} />
      </div>
    </div>
  );
}
