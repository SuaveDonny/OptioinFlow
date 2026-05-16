import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:3001";
const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

function getVixZone(price) {
  const v = parseFloat(price);
  if (v < 15) return { label: "Complacent", color: "#00e5a0", desc: "Favor short premium" };
  if (v < 20) return { label: "Normal", color: "#7dd3fc", desc: "Balanced approach" };
  if (v < 30) return { label: "Elevated Fear", color: "#fbbf24", desc: "Favor long premium" };
  return { label: "Extreme Fear", color: "#ff4d6d", desc: "Reduce position size" };
}

function LoadingBar({ active }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (active) { setW(20); const t = setTimeout(() => setW(70), 600); return () => clearTimeout(t); }
    else { setW(100); const t = setTimeout(() => setW(0), 300); return () => clearTimeout(t); }
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

function TimeframeToggle({ timeframes, selected, onChange, disabled }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "rgba(15,17,30,0.7)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 4 }}>
      {Object.entries(timeframes).map(([key, tf]) => {
        const isSelected = selected === key;
        return (
          <button key={key} onClick={() => !disabled && onChange(key)} disabled={disabled}
            style={{
              flex: 1,
              background: isSelected ? "linear-gradient(135deg,rgba(0,212,255,0.18),rgba(123,47,255,0.18))" : "transparent",
              border: isSelected ? "1px solid rgba(0,212,255,0.35)" : "1px solid transparent",
              borderRadius: 8,
              padding: "8px 12px",
              color: isSelected ? "#00d4ff" : disabled ? "#3d4461" : "#7986cb",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              fontFamily: "'DM Sans',sans-serif",
            }}>
            {tf.label}
            <div style={{ fontSize: 9, fontWeight: 500, color: isSelected ? "#7dd3fc" : "#4a5568", marginTop: 2, letterSpacing: "0.02em", textTransform: "none" }}>
              {tf.daysMin === 0 ? "today" : tf.daysMin + "-" + tf.daysMax + "d"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function VixGauge({ data }) {
  if (!data || !data.price) return null;
  const zone = getVixZone(data.price);
  const v = parseFloat(data.price);
  const barPos = Math.max(0, Math.min(100, ((v - 10) / 30) * 100));
  return (
    <div style={{ background: "linear-gradient(135deg,rgba(15,17,30,0.95),rgba(20,22,40,0.9))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, color: "#6b7a99", letterSpacing: "0.1em", textTransform: "uppercase" }}>VIX · Volatility Index</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 28, fontWeight: 800, color: zone.color }}>{data.price}</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: data.change >= 0 ? "#ff4d6d" : "#00e5a0" }}>
              {data.change >= 0 ? "▲" : "▼"} {Math.abs(data.change)}%
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: zone.color, letterSpacing: "0.04em" }}>{zone.label}</div>
          <div style={{ fontSize: 11, color: "#6b7a99", marginTop: 2 }}>{zone.desc}</div>
        </div>
      </div>
      <div style={{ position: "relative", height: 6, background: "linear-gradient(90deg,#00e5a0 0%,#7dd3fc 25%,#fbbf24 60%,#ff4d6d 100%)", borderRadius: 3, opacity: 0.35 }}>
        <div style={{ position: "absolute", top: -3, left: `${barPos}%`, width: 12, height: 12, borderRadius: "50%", background: zone.color, border: "2px solid #080a14", transform: "translateX(-50%)", boxShadow: `0 0 12px ${zone.color}` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: "#3d4461", fontFamily: "'IBM Plex Mono',monospace" }}>
        <span>10</span><span>15</span><span>20</span><span>30</span><span>40</span>
      </div>
    </div>
  );
}

function MarketBadge({ data }) {
  if (!data || data.error || !data.price) return <div style={{ marginTop: 8, fontSize: 11, color: "#3d4461", fontStyle: "italic" }}>Market data unavailable</div>;
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
      {data.prevClose && <span style={{ fontSize: 11, color: "#4a5568", fontFamily: "'IBM Plex Mono',monospace" }}>Prev: <span style={{ color: "#6b7a99" }}>${data.prevClose}</span></span>}
    </div>
  );
}

function ChainDataPanel({ chain }) {
  if (!chain || chain.error) {
    return <div style={{ marginTop: 8, fontSize: 11, color: "#3d4461", fontStyle: "italic" }}>No options chain data for this timeframe</div>;
  }
  return (
    <div style={{ marginTop: 10, background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 10, padding: "10px 13px" }}>
      <div style={{ fontSize: 10, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
        <span>📈 Real Chain Data · {chain.expiry} ({chain.daysToExp}d)</span>
        {chain.avgIV && <span>Avg IV: <span style={{ color: "#e8eaf6", fontFamily: "'IBM Plex Mono',monospace" }}>{chain.avgIV}%</span></span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, fontFamily: "'IBM Plex Mono',monospace" }}>
        {chain.atm?.call && (
          <div style={{ padding: "6px 8px", background: "rgba(0,229,160,0.06)", borderRadius: 6 }}>
            <div style={{ color: "#00e5a0", fontWeight: 700, fontSize: 10 }}>ATM CALL ${chain.atm.call.strike}</div>
            <div style={{ color: "#e8eaf6", marginTop: 2 }}>${chain.atm.call.mid} · IV {chain.atm.call.iv}%</div>
            <div style={{ color: "#4a5568", fontSize: 10 }}>OI {chain.atm.call.openInterest} · V {chain.atm.call.volume}</div>
          </div>
        )}
        {chain.atm?.put && (
          <div style={{ padding: "6px 8px", background: "rgba(255,77,109,0.06)", borderRadius: 6 }}>
            <div style={{ color: "#ff8fa3", fontWeight: 700, fontSize: 10 }}>ATM PUT ${chain.atm.put.strike}</div>
            <div style={{ color: "#e8eaf6", marginTop: 2 }}>${chain.atm.put.mid} · IV {chain.atm.put.iv}%</div>
            <div style={{ color: "#4a5568", fontSize: 10 }}>OI {chain.atm.put.openInterest} · V {chain.atm.put.volume}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function EarningsBadge({ earnings }) {
  if (!earnings || !earnings.withinWeek) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)", color: "#c4b5fd", borderRadius: 5, padding: "2px 7px" }}>
      📅 EARNINGS {earnings.dateString}
    </span>
  );
}

function PlayCard({ play, index, marketData, optionsChains }) {
  const [expanded, setExpanded] = useState(false);
  const sc = { Bullish: "#00e5a0", Bearish: "#ff4d6d", Neutral: "#fbbf24" }[play.sentiment] || "#e8eaf6";
  const pc = play.probability >= 75 ? "#00e5a0" : play.probability >= 60 ? "#fbbf24" : "#ff4d6d";
  const md = marketData?.[play.ticker];
  const oc = optionsChains?.[play.ticker];

  return (
    <div onClick={() => setExpanded(!expanded)}
      style={{ background: "linear-gradient(135deg,rgba(20,22,40,0.9),rgba(15,16,30,0.95))", border: `1px solid ${expanded ? "rgba(0,212,255,0.35)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "18px 20px", cursor: "pointer", transition: "border-color 0.2s", animation: "fadeSlideIn 0.4s ease both", animationDelay: `${index * 0.05}s`, position: "relative", overflow: "hidden" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = expanded ? "rgba(0,212,255,0.35)" : "rgba(255,255,255,0.07)"}
    >
      <div style={{ position: "absolute", top: 0, left: 0, height: 3, width: `${play.probability}%`, background: `linear-gradient(90deg,${pc}55,${pc})`, borderRadius: "14px 0 0 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8, padding: "4px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 700, color: "#00d4ff" }}>{play.ticker}</div>
          <div style={{ color: sc, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {play.sentiment === "Bullish" ? "▲" : play.sentiment === "Bearish" ? "▼" : "◆"} {play.sentiment}
          </div>
          <EarningsBadge earnings={md?.earnings} />
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
          <ChainDataPanel chain={oc} />
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

function Section({ title, icon, plays, loading, marketData, optionsChains }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7986cb" }}>{title}</h2>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(121,134,203,0.3),transparent)" }} />
        {loading && <div style={{ width: 16, height: 16, border: "2px solid rgba(0,212,255,0.15)", borderTop: "2px solid #00d4ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {plays.map((p, i) => <PlayCard key={p.ticker + i} play={p} index={i} marketData={marketData} optionsChains={optionsChains} />)}
        {!loading && plays.length === 0 && <div style={{ color: "#6b7a99", fontSize: 13, textAlign: "center", padding: 24 }}>No plays yet.</div>}
      </div>
    </div>
  );
}

function WatchlistEditor({ watchlist, onSave }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(watchlist.join(", "));
  const saveAndClose = () => {
    const tickers = text.split(/[\s,]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
    onSave(tickers);
    setOpen(false);
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <button onClick={() => setOpen(!open)} style={{ background: "rgba(123,47,255,0.08)", border: "1px solid rgba(123,47,255,0.25)", borderRadius: 10, padding: "8px 14px", color: "#a78bfa", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}>
        ⚙️ {open ? "Close" : "Edit"} My Watchlist {watchlist.length > 0 && `(${watchlist.length})`}
      </button>
      {open && (
        <div style={{ marginTop: 10, background: "rgba(15,17,30,0.8)", border: "1px solid rgba(123,47,255,0.2)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#6b7a99", marginBottom: 8 }}>Enter ticker symbols separated by commas or spaces:</div>
          <input type="text" value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && saveAndClose()}
            placeholder="PLTR, SMCI, ARM..."
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px", color: "#e8eaf6", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, outline: "none" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={saveAndClose} style={{ background: "linear-gradient(135deg,rgba(0,229,160,0.15),rgba(0,212,255,0.15))", border: "1px solid rgba(0,229,160,0.3)", borderRadius: 8, padding: "8px 16px", color: "#00e5a0", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}>
              Save & Refresh
            </button>
            <button onClick={() => { setText(""); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 16px", color: "#6b7a99", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [sections, setSections] = useState({});
  const [timeframes, setTimeframes] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState(() => localStorage.getItem("timeframe") || "weekly");
  const [allPlays, setAllPlays] = useState({});
  const [marketData, setMarketData] = useState({});
  const [optionsChains, setOptionsChains] = useState({});
  const [watchlist, setWatchlist] = useState(() => { try { return JSON.parse(localStorage.getItem("watchlist") || "[]"); } catch { return []; } });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/sections`).then(r => r.json()).then(setSections).catch(() => {});
    fetch(`${API_BASE}/api/timeframes`).then(r => r.json()).then(setTimeframes).catch(() => {});
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStep("Fetching live market data…");
      const mdRes = await fetch(`${API_BASE}/api/market-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customWatchlist: watchlist }),
      });
      if (!mdRes.ok) throw new Error("Backend not responding. Is the server running on port 3001?");
      const md = await mdRes.json();
      setMarketData(md);

      setStep(`Fetching ${timeframes[selectedTimeframe]?.label || ""} options chains…`);
      const tickersForChains = Object.keys(md).filter(t => !t.startsWith("^") && md[t] && !md[t].error);
      const ocRes = await fetch(`${API_BASE}/api/options-chains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: tickersForChains, timeframe: selectedTimeframe }),
      });
      const oc = ocRes.ok ? await ocRes.json() : {};
      setOptionsChains(oc);

      setStep("Generating option plays…");
      const playsRes = await fetch(`${API_BASE}/api/generate-plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketData: md, optionsChains: oc, customWatchlist: watchlist, timeframe: selectedTimeframe }),
      });
      if (!playsRes.ok) {
        const errData = await playsRes.json();
        throw new Error(errData.error || "Failed to generate plays");
      }
      const result = await playsRes.json();
      setAllPlays(result.plays || {});
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setStep("");
    }
  }, [watchlist, selectedTimeframe, timeframes]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveWatchlist = (list) => { setWatchlist(list); localStorage.setItem("watchlist", JSON.stringify(list)); };
  const changeTimeframe = (tf) => { setSelectedTimeframe(tf); localStorage.setItem("timeframe", tf); };

  const liveCount = Object.values(marketData).filter(v => v && !v.error && v.price).length;
  const totalCount = Object.keys(marketData).length;
  const chainCount = Object.values(optionsChains).filter(v => v && !v.error && v.expiry).length;
  const vixData = marketData["^VIX"];

  const displaySections = { ...sections };
  if (watchlist.length > 0) displaySections.custom = { label: "My Watchlist", icon: "⭐", tickers: watchlist };

  return (
    <div style={{ minHeight: "100vh", background: "#080a14", color: "#e8eaf6", fontFamily: "'DM Sans','Segoe UI',sans-serif", paddingBottom: 60, backgroundImage: "radial-gradient(ellipse at 20% 0%,rgba(0,212,255,0.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(123,47,255,0.07) 0%,transparent 60%)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>

      <div style={{ background: "rgba(8,10,20,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px max(16px,calc(50% - 420px))", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(14px)" }}>
        <LoadingBar active={loading} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12, gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: loading ? "#fbbf24" : liveCount > 0 ? "#00e5a0" : "#ff4d6d", animation: "pulse 2s ease infinite" }} />
              <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", color: loading ? "#fbbf24" : liveCount > 0 ? "#00e5a0" : "#ff4d6d", letterSpacing: "0.1em" }}>
                {loading ? (step || "LOADING…").toUpperCase() : liveCount > 0 ? `LIVE · ${liveCount}/${totalCount} TICKERS · ${chainCount} CHAINS` : "OFFLINE"}
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

      <div style={{ margin: "14px max(16px,calc(50% - 420px))", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 10, padding: "9px 14px", fontSize: 11, color: "#92813a", lineHeight: 1.5 }}>
        ⚠️ <strong style={{ color: "#fbbf24" }}>Educational use only.</strong> AI-generated plays with live market data — not financial advice.
      </div>

      <div style={{ padding: "4px max(16px,calc(50% - 420px)) 0" }}>
        {error && (
          <div style={{ background: "rgba(255,77,109,0.07)", border: "1px solid rgba(255,77,109,0.18)", borderRadius: 10, padding: "12px 16px", color: "#ff4d6d", fontSize: 13, marginBottom: 16 }}>
            {error} <button onClick={fetchAll} style={{ background: "none", border: "none", color: "#ff8fa3", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Retry</button>
          </div>
        )}

        <VixGauge data={vixData} />

        {Object.keys(timeframes).length > 0 && (
          <TimeframeToggle timeframes={timeframes} selected={selectedTimeframe} onChange={changeTimeframe} disabled={loading} />
        )}

        <WatchlistEditor watchlist={watchlist} onSave={saveWatchlist} />

        {Object.entries(displaySections).map(([key, sec]) => (
          <Section key={key} title={sec.label} icon={sec.icon || "📈"} plays={allPlays[key] || []}
            loading={loading && !(allPlays[key]?.length)} marketData={marketData} optionsChains={optionsChains} />
        ))}
      </div>
    </div>
  );
}
