// Global ngrok header interceptor
const origFetch = window.fetch;
window.fetch = (url, opts = {}) => {
  if (typeof url === 'string' && url.includes('ngrok')) {
    opts = { ...opts, headers: { ...(opts.headers || {}), 'ngrok-skip-browser-warning': 'true' } };
  }
  return origFetch(url, opts);
};
import { useState, useEffect, useCallback, useRef } from "react";

const HEADERS = () => ({ "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" });
const API_BASE = (() => { const params = new URLSearchParams(window.location.search); const api = params.get("api"); if (api) return decodeURIComponent(api); return "http://192.168.0.56:3003"; })();
const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const WB_GREEN = "#00C087";
const WB_RED = "#FF5C5C";
const WB_YELLOW = "#FFB800";
const WB_BG = "#0d1117";
const WB_SURFACE = "#161b22";
const WB_BORDER = "#21262d";
const WB_TEXT = "#e6e8eb";
const WB_MUTED = "#8b949e";

function getVixZone(price) {
  const v = parseFloat(price);
  if (v < 15) return { label: "Complacent", color: WB_GREEN, desc: "Favor short premium" };
  if (v < 20) return { label: "Normal", color: WB_YELLOW, desc: "Balanced approach" };
  if (v < 30) return { label: "Elevated", color: WB_YELLOW, desc: "Favor long premium" };
  return { label: "Extreme Fear", color: WB_RED, desc: "Reduce size" };
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: ${WB_BG}; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeInModal { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation: fadeIn 0.25s ease both; }
  .row-hover:hover { background: #1c2128 !important; cursor: pointer; }
  .tab-btn { background: transparent; border: none; cursor: pointer; padding: 5px 10px; font-size: 12px; font-family: inherit; border-radius: 4px; transition: all 0.15s; }
  .tab-btn:hover { background: #21262d; color: ${WB_TEXT}; }
  .tab-btn.active { background: #21262d; color: ${WB_TEXT}; font-weight: 600; }
  .play-row-expanded { background: #1c2128; border-left: 2px solid ${WB_GREEN} !important; }
  .ticker-link:hover { color: #00d4ff !important; text-decoration: underline; }
  select.wb-select { background: ${WB_SURFACE}; border: 1px solid ${WB_BORDER}; border-radius: 4px; color: ${WB_TEXT}; font-size: 11px; font-family: inherit; padding: 4px 8px; cursor: pointer; outline: none; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal-box { background: ${WB_SURFACE}; border: 1px solid ${WB_BORDER}; border-radius: 8px; width: 100%; max-width: 860px; max-height: 90vh; overflow-y: auto; animation: fadeInModal 0.2s ease; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${WB_BG}; }
  ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function Spinner({ size = 14 }) {
  return <div style={{ width: size, height: size, border: `2px solid rgba(0,192,135,0.2)`, borderTop: `2px solid ${WB_GREEN}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />;
}

function LiveDot({ loading, liveCount }) {
  const color = loading ? WB_YELLOW : liveCount > 0 ? WB_GREEN : WB_RED;
  return <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, animation: "pulse 2s ease infinite", flexShrink: 0 }} />;
}

// ── VIX Strip ─────────────────────────────────────────────────────────────────

function VixStrip({ data }) {
  if (!data || !data.price) return null;
  const zone = getVixZone(data.price);
  const pos = Math.max(0, Math.min(100, ((parseFloat(data.price) - 10) / 30) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 16px", background: WB_SURFACE, borderBottom: `1px solid ${WB_BORDER}` }}>
      <span style={{ fontSize: 11, color: WB_MUTED, fontFamily: "'IBM Plex Mono',monospace", minWidth: 32 }}>VIX</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: zone.color, fontFamily: "'IBM Plex Mono',monospace", minWidth: 40 }}>{data.price}</span>
      <span style={{ fontSize: 11, color: data.change >= 0 ? WB_RED : WB_GREEN, fontFamily: "'IBM Plex Mono',monospace" }}>{data.change >= 0 ? "▲" : "▼"} {Math.abs(data.change)}%</span>
      <div style={{ flex: 1, position: "relative", height: 4, background: `linear-gradient(90deg,${WB_GREEN} 0%,${WB_YELLOW} 50%,${WB_RED} 100%)`, borderRadius: 2, opacity: 0.5 }}>
        <div style={{ position: "absolute", top: -3, left: `${pos}%`, width: 10, height: 10, borderRadius: "50%", background: zone.color, border: `2px solid ${WB_BG}`, transform: "translateX(-50%)" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: zone.color, minWidth: 70 }}>{zone.label}</span>
      <span style={{ fontSize: 11, color: WB_MUTED }}>{zone.desc}</span>
    </div>
  );
}

// ── GEX Components ────────────────────────────────────────────────────────────

function GammaProfileChart({ data }) {
  const [hover, setHover] = useState(null);
  if (!data || !data.profile || data.profile.length === 0) return null;
  const W = 320, H = 160, padL = 8, padR = 8, padT = 10, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const { profile, spot, flipPoint } = data;
  const strikes = profile.map(p => p.strike);
  const gammas = profile.map(p => p.gamma);
  const minStrike = Math.min(...strikes), maxStrike = Math.max(...strikes);
  const maxAbsGamma = Math.max(...gammas.map(Math.abs), 0.01);
  const xFor = s => padL + ((s - minStrike) / (maxStrike - minStrike || 1)) * innerW;
  const zeroY = padT + innerH / 2;
  const barH = g => (g / maxAbsGamma) * (innerH / 2);
  const barW = Math.max(2, (innerW / profile.length) * 0.7);

  const handleMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (W / rect.width);
    const relX = mouseX - padL;
    const fraction = relX / innerW;
    const hoveredStrike = minStrike + fraction * (maxStrike - minStrike);
    const closest = profile.reduce((best, p) =>
      Math.abs(p.strike - hoveredStrike) < Math.abs(best.strike - hoveredStrike) ? p : best
    );
    setHover({ strike: closest.strike, gamma: closest.gamma, x: xFor(closest.strike) });
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)}>
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {profile.map((p, i) => {
        const x = xFor(p.strike) - barW / 2;
        const h = Math.abs(barH(p.gamma));
        const y = p.gamma >= 0 ? zeroY - h : zeroY;
        const isHovered = hover && hover.strike === p.strike;
        return <rect key={i} x={x} y={y} width={barW} height={h} fill={p.gamma >= 0 ? WB_GREEN : WB_RED} opacity={isHovered ? 1 : 0.75} rx="1" />;
      })}
      {spot && spot >= minStrike && spot <= maxStrike && (
        <g>
          <line x1={xFor(spot)} y1={padT} x2={xFor(spot)} y2={padT + innerH} stroke="#00d4ff" strokeWidth="1.5" strokeDasharray="3,2" />
          <text x={xFor(spot)} y={padT - 1} fill="#00d4ff" fontSize="9" textAnchor="middle" fontFamily="monospace">spot ${spot}</text>
        </g>
      )}
      {flipPoint && flipPoint >= minStrike && flipPoint <= maxStrike && (
        <g>
          <line x1={xFor(flipPoint)} y1={padT} x2={xFor(flipPoint)} y2={padT + innerH} stroke={WB_YELLOW} strokeWidth="1.5" strokeDasharray="2,2" />
          <text x={xFor(flipPoint)} y={H - 12} fill={WB_YELLOW} fontSize="9" textAnchor="middle" fontFamily="monospace">flip ${flipPoint}</text>
        </g>
      )}
      {hover && (
        <g>
          <line x1={hover.x} y1={padT} x2={hover.x} y2={padT + innerH} stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="2,2" />
          <rect x={hover.x + 4} y={padT} width={90} height={28} fill="rgba(13,17,23,0.92)" rx="3" stroke={WB_BORDER} strokeWidth="0.5" />
          <text x={hover.x + 8} y={padT + 10} fill={WB_TEXT} fontSize="9" fontFamily="monospace">${hover.strike}</text>
          <text x={hover.x + 8} y={padT + 22} fill={hover.gamma >= 0 ? WB_GREEN : WB_RED} fontSize="9" fontFamily="monospace" fontWeight="700">{hover.gamma >= 0 ? "+" : ""}{hover.gamma}B γ</text>
        </g>
      )}
      <text x={padL} y={H - 2} fill="#4a5568" fontSize="8" fontFamily="monospace">${minStrike}</text>
      <text x={W - padR} y={H - 2} fill="#4a5568" fontSize="8" textAnchor="end" fontFamily="monospace">${maxStrike}</text>
    </svg>
  );
}

function GammaCard({ ticker, g }) {
  const [open, setOpen] = useState(false);
  const positive = g.regime === "positive";
  const rc = positive ? WB_GREEN : WB_RED;

  const getSummary = () => {
    const flip = g.flipPoint;
    const spot = g.spot;
    const walls = g.walls || [];
    const aboveFlip = flip && spot && spot > flip;
    const nearFlip = flip && spot && Math.abs((spot - flip) / spot * 100) < 1.5;

    if (nearFlip) return `⚠️ Price near flip ($${flip}) — regime could change. Reduce size, wait for direction.`;
    if (positive && aboveFlip) {
      const wallStr = walls.length > 0 ? ` Use $${walls[0].strike} as short strike.` : "";
      return `Range-bound. Sell premium — iron condors or credit spreads.${wallStr}`;
    }
    if (positive && !aboveFlip) return `Below flip ($${flip}) — volatility risk elevated. Favor defined-risk spreads.`;
    if (!positive) return `Trending market. Buy directional options or use wide spreads. Avoid naked short premium.`;
    return `Monitor closely.`;
  };

  return (
    <div onClick={() => setOpen(!open)}
      style={{ background: WB_BG, border: `1px solid ${positive ? "rgba(0,192,135,0.2)" : "rgba(255,92,92,0.2)"}`, borderRadius: 6, padding: "10px 12px", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: WB_TEXT }}>{ticker}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: rc, background: positive ? "rgba(0,192,135,0.1)" : "rgba(255,92,92,0.1)", borderRadius: 3, padding: "1px 6px" }}>{positive ? "+γ" : "−γ"}</span>
      </div>
      <div style={{ fontSize: 11, color: WB_MUTED, fontFamily: "'IBM Plex Mono',monospace" }}>
        <div>Net GEX: <span style={{ color: rc, fontWeight: 700 }}>${g.netGex}M</span></div>
        {g.flipPoint && <div>Flip: <span style={{ color: WB_TEXT }}>${g.flipPoint}</span>{g.flipVsSpot != null && <span style={{ color: g.flipVsSpot >= 0 ? WB_GREEN : WB_RED, fontSize: 10, marginLeft: 4 }}>({g.flipVsSpot >= 0 ? "+" : ""}{g.flipVsSpot}%)</span>}</div>}
        {g.walls?.length > 0 && <div style={{ color: "#4a5568", fontSize: 10 }}>Walls: {g.walls.map(w => "$" + w.strike).join(" · ")}</div>}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: WB_TEXT, background: positive ? "rgba(0,192,135,0.06)" : "rgba(255,92,92,0.06)", border: `1px solid ${positive ? "rgba(0,192,135,0.15)" : "rgba(255,92,92,0.15)"}`, borderRadius: 4, padding: "5px 8px", lineHeight: 1.5 }}>
        {getSummary()}
      </div>
      {open && <div style={{ marginTop: 8 }}><GammaProfileChart data={g} /></div>}
      <div style={{ fontSize: 10, color: "#00d4ff", marginTop: 6 }}>{open ? "▾ Hide" : "▸ Profile"}</div>
    </div>
  );
}

function GammaPanel({ gamma }) {
  const [collapsed, setCollapsed] = useState(false);
  const entries = Object.entries(gamma || {}).filter(([, g]) => g && !g.error && g.netGex !== undefined);
  if (entries.length === 0) return null;
  return (
    <div style={{ margin: "0 0 4px", background: "rgba(0,192,135,0.03)", borderBottom: `1px solid ${WB_BORDER}`, padding: "10px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: collapsed ? 0 : 10 }} onClick={() => setCollapsed(!collapsed)}>
        <span style={{ fontSize: 12 }}>🌀</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Gamma Exposure</span>
        <span style={{ fontSize: 10, color: WB_MUTED }}>{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
          {entries.map(([ticker, g]) => <GammaCard key={ticker} ticker={ticker} g={g} />)}
        </div>
      )}
      {!collapsed && <div style={{ marginTop: 8, fontSize: 10, color: "#3d4461" }}><span style={{ color: WB_GREEN }}>+γ</span> dealers dampen volatility · <span style={{ color: WB_RED }}>−γ</span> dealers amplify moves · Flip = regime change level</div>}
    </div>
  );
}

// ── Alerts Panel ──────────────────────────────────────────────────────────────

function AlertsPanel({ alerts, onClear }) {
  const [collapsed, setCollapsed] = useState(false);
  const timeAgo = iso => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    return Math.floor(s / 3600) + "h ago";
  };
  const ac = action => {
    if (!action) return WB_MUTED;
    const a = action.toLowerCase();
    if (a.includes("buy") || a.includes("long")) return WB_GREEN;
    if (a.includes("sell") || a.includes("short")) return WB_RED;
    return WB_YELLOW;
  };
  if (!alerts || alerts.length === 0) return (
    <div style={{ padding: "8px 16px", background: WB_BG, borderBottom: `1px solid ${WB_BORDER}`, fontSize: 11, color: WB_MUTED }}>
      📡 No TradingView alerts yet — set up webhooks to see them here
    </div>
  );
  return (
    <div style={{ background: "rgba(123,47,255,0.04)", borderBottom: `1px solid ${WB_BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", cursor: "pointer" }} onClick={() => setCollapsed(!collapsed)}>
        <span style={{ fontSize: 11 }}>📡</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.1em" }}>TradingView Alerts ({alerts.length})</span>
        <span style={{ fontSize: 10, color: WB_MUTED }}>{collapsed ? "▸" : "▾"}</span>
        <button onClick={e => { e.stopPropagation(); onClear(); }} style={{ marginLeft: "auto", background: "transparent", border: `1px solid rgba(255,92,92,0.2)`, borderRadius: 4, padding: "2px 8px", color: WB_RED, fontSize: 10, cursor: "pointer" }}>Clear</button>
      </div>
      {!collapsed && (
        <div style={{ padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
          {alerts.map(a => (
            <div key={a.id} style={{ background: WB_BG, border: `1px solid ${WB_BORDER}`, borderRadius: 4, padding: "6px 10px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: "#00d4ff", minWidth: 50 }}>{a.ticker}</div>
              {a.action && <span style={{ fontSize: 10, fontWeight: 700, color: ac(a.action), textTransform: "uppercase" }}>{a.action}</span>}
              <span style={{ flex: 1, fontSize: 11, color: WB_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.message}</span>
              {a.price && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: WB_TEXT }}>${a.price}</span>}
              <span style={{ fontSize: 10, color: "#4a5568", fontFamily: "'IBM Plex Mono',monospace" }}>{timeAgo(a.receivedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Timeframe Tabs ────────────────────────────────────────────────────────────

function TimeframeTabs({ timeframes, selected, onChange, disabled }) {
  return (
    <div style={{ display: "flex", gap: 2, padding: "0 16px", background: WB_SURFACE, borderBottom: `1px solid ${WB_BORDER}` }}>
      {Object.entries(timeframes).map(([key, tf]) => (
        <button key={key} className={`tab-btn ${selected === key ? "active" : ""}`}
          onClick={() => !disabled && onChange(key)} disabled={disabled}
          style={{ color: selected === key ? WB_TEXT : WB_MUTED, padding: "8px 12px" }}>
          {tf.label}
          <span style={{ fontSize: 10, color: WB_MUTED, marginLeft: 4 }}>{tf.daysMin === 0 ? "0d" : `${tf.daysMin}-${tf.daysMax}d`}</span>
        </button>
      ))}
    </div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

function FilterBar({ allPlays, strategyFilter, setStrategyFilter, expiryFilter, setExpiryFilter }) {
  const allRows = Object.values(allPlays).flat();
  const strategies = ["All Strategies", ...new Set(allRows.map(p => p.strategy).filter(Boolean).sort())];
  const expiries = ["All Expiries", ...new Set(allRows.map(p => p.expiry).filter(Boolean).sort())];
  const count = allRows.filter(p =>
    (strategyFilter === "All Strategies" || p.strategy === strategyFilter) &&
    (expiryFilter === "All Expiries" || p.expiry === expiryFilter)
  ).length;
  return (
    <div style={{ display: "flex", gap: 8, padding: "7px 16px", background: WB_BG, borderBottom: `1px solid ${WB_BORDER}`, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Filter</span>
      <select className="wb-select" value={strategyFilter} onChange={e => setStrategyFilter(e.target.value)}>
        {strategies.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className="wb-select" value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)}>
        {expiries.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      {(strategyFilter !== "All Strategies" || expiryFilter !== "All Expiries") && (
        <button onClick={() => { setStrategyFilter("All Strategies"); setExpiryFilter("All Expiries"); }}
          style={{ background: "transparent", border: `1px solid ${WB_BORDER}`, borderRadius: 4, padding: "3px 8px", color: WB_MUTED, fontSize: 10, cursor: "pointer" }}>✕ Clear</button>
      )}
      <span style={{ fontSize: 10, color: WB_MUTED, marginLeft: "auto" }}>{count} plays</span>
    </div>
  );
}

// ── Chart Modal ───────────────────────────────────────────────────────────────

function ChartModal({ ticker, onClose }) {
  const [interval, setInterval] = useState("D");
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const intervals = [["1","1m"],["5","5m"],["15","15m"],["30","30m"],["60","1h"],["240","4h"],["D","1D"],["W","1W"],["M","1M"]];

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    const chartDiv = document.createElement("div");
    chartDiv.id = "tv_widget_" + Date.now();
    chartDiv.style.height = "100%";
    chartDiv.style.width = "100%";
    containerRef.current.appendChild(chartDiv);

    const loadWidget = () => {
      if (window.TradingView && chartDiv.isConnected) {
        widgetRef.current = new window.TradingView.widget({
          container_id: chartDiv.id,
          symbol: ticker,
          interval,
          timezone: "America/New_York",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: WB_BG,
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          autosize: true,
        });
      }
    };

    if (window.TradingView) {
      loadWidget();
    } else {
      const existing = document.querySelector('script[src*="tv.js"]');
      if (existing) {
        existing.addEventListener("load", loadWidget);
      } else {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.onload = loadWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [ticker, interval]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 1000, height: "82vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${WB_BORDER}`, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace" }}>{ticker}</span>
          <span style={{ fontSize: 10, color: WB_MUTED }}>TradingView</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 2, flexWrap: "wrap" }}>
            {intervals.map(([val, label]) => (
              <button key={val} className={`tab-btn ${interval === val ? "active" : ""}`} onClick={() => setInterval(val)} style={{ color: interval === val ? WB_TEXT : WB_MUTED, padding: "3px 6px", fontSize: 10 }}>{label}</button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${WB_BORDER}`, borderRadius: 4, padding: "4px 8px", color: WB_MUTED, fontSize: 12, cursor: "pointer", marginLeft: 8 }}>✕</button>
        </div>
        <div ref={containerRef} style={{ flex: 1, overflow: "hidden" }} />
      </div>
    </div>
  );
}

// ── Play Row (Webull table style) ─────────────────────────────────────────────

function TableHeader() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 85px 65px 55px 60px 75px 85px", padding: "5px 16px", background: "#0d1421", borderBottom: `1px solid ${WB_BORDER}`, gap: 8 }}>
      {["Ticker","Strategy","Strike/Exp","Price","Chg%","IV%","Win%","Sentiment"].map((col, i) => (
        <span key={col} style={{ fontSize: 10, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, textAlign: i >= 3 ? "right" : "left" }}>{col}</span>
      ))}
    </div>
  );
}

function SentimentBadge({ sentiment }) {
  const cfg = {
    Bullish: { bg: "rgba(0,192,135,0.12)", color: WB_GREEN, label: "▲ Bull" },
    Bearish: { bg: "rgba(255,92,92,0.12)", color: WB_RED, label: "▼ Bear" },
    Neutral: { bg: "rgba(139,148,158,0.12)", color: WB_MUTED, label: "◆ Neut" },
  }[sentiment] || { bg: "rgba(139,148,158,0.1)", color: WB_MUTED, label: sentiment };
  return <div style={{ textAlign: "right" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: cfg.bg, color: cfg.color }}>{cfg.label}</span></div>;
}

function PlayRow({ play, index, marketData, optionsChains, onOpenChart }) {
  const [expanded, setExpanded] = useState(false);
  const md = marketData?.[play.ticker];
  const oc = optionsChains?.[play.ticker];
  const cc = md?.change > 0 ? WB_GREEN : md?.change < 0 ? WB_RED : WB_MUTED;
  const pc = play.probability >= 75 ? WB_GREEN : play.probability >= 60 ? WB_YELLOW : WB_RED;
  const hasEarnings = md?.earnings?.withinWeek;

  return (
    <>
      <div className={`row-hover fade-in ${expanded ? "play-row-expanded" : ""}`}
        onClick={() => setExpanded(!expanded)}
        style={{ display: "grid", gridTemplateColumns: "110px 1fr 85px 65px 55px 60px 75px 85px", padding: "7px 16px", borderBottom: `1px solid ${WB_BORDER}`, gap: 8, alignItems: "center", animationDelay: `${index * 0.03}s`, background: expanded ? "#1c2128" : "transparent", borderLeft: expanded ? `2px solid ${WB_GREEN}` : "2px solid transparent" }}>
        <div>
          <span className="ticker-link" onClick={e => { e.stopPropagation(); onOpenChart(play.ticker); }}
            style={{ fontSize: 13, fontWeight: 700, color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace", cursor: "pointer" }}>
            {play.ticker}
          </span>
          {hasEarnings && <div style={{ fontSize: 9, color: WB_RED, fontWeight: 600, marginTop: 1 }}>⚡ {md.earnings.dateString}</div>}
        </div>
        <div style={{ fontSize: 11, color: WB_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{play.strategy}</div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace" }}>{play.strike}</div>
          <div style={{ fontSize: 10, color: WB_MUTED }}>{play.expiry}</div>
        </div>
        <div style={{ fontSize: 12, color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right" }}>{md?.price ? `$${md.price}` : "—"}</div>
        <div style={{ fontSize: 12, color: cc, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right" }}>{md?.change != null ? `${md.change > 0 ? "+" : ""}${md.change.toFixed(1)}%` : "—"}</div>
        <div style={{ fontSize: 12, color: play.iv > 50 ? WB_RED : play.iv > 30 ? WB_YELLOW : WB_TEXT, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right" }}>{play.iv}%</div>
        <div style={{ fontSize: 12, color: pc, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right", fontWeight: 600 }}>{play.probability}%</div>
        <SentimentBadge sentiment={play.sentiment} />
      </div>

      {expanded && (
        <div className="fade-in" style={{ background: "#13191f", borderBottom: `1px solid ${WB_BORDER}`, padding: "12px 16px 14px 18px", borderLeft: `2px solid ${WB_GREEN}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[["Max Profit", play.maxProfit, WB_GREEN], ["Max Loss", play.maxLoss, WB_RED], ["R/R", play.rr, "#a78bfa"], ["Delta", play.delta, WB_MUTED]].map(([label, val, color]) => (
              <div key={label} style={{ background: WB_SURFACE, border: `1px solid ${WB_BORDER}`, borderRadius: 4, padding: "7px 10px" }}>
                <div style={{ fontSize: 10, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "'IBM Plex Mono',monospace" }}>{val}</div>
              </div>
            ))}
          </div>
          {oc && !oc.error && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {oc.atm?.call && (
                <div style={{ background: "rgba(0,192,135,0.05)", border: "1px solid rgba(0,192,135,0.15)", borderRadius: 4, padding: "6px 10px" }}>
                  <div style={{ fontSize: 10, color: WB_GREEN, fontWeight: 700, marginBottom: 2 }}>ATM CALL ${oc.atm.call.strike}</div>
                  <div style={{ fontSize: 12, color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace" }}>${oc.atm.call.mid} · IV {oc.atm.call.iv}%</div>
                  <div style={{ fontSize: 10, color: WB_MUTED }}>OI {oc.atm.call.openInterest} · Vol {oc.atm.call.volume}</div>
                </div>
              )}
              {oc.atm?.put && (
                <div style={{ background: "rgba(255,92,92,0.05)", border: "1px solid rgba(255,92,92,0.15)", borderRadius: 4, padding: "6px 10px" }}>
                  <div style={{ fontSize: 10, color: WB_RED, fontWeight: 700, marginBottom: 2 }}>ATM PUT ${oc.atm.put.strike}</div>
                  <div style={{ fontSize: 12, color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace" }}>${oc.atm.put.mid} · IV {oc.atm.put.iv}%</div>
                  <div style={{ fontSize: 10, color: WB_MUTED }}>OI {oc.atm.put.openInterest} · Vol {oc.atm.put.volume}</div>
                </div>
              )}
            </div>
          )}
          <p style={{ fontSize: 12, color: WB_MUTED, lineHeight: 1.7, margin: 0 }}>{play.rationale}</p>
          {play.premarketNote && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#7dd3fc", background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 4, padding: "6px 10px", lineHeight: 1.6 }}>
              📡 {play.premarketNote}
            </div>
          )}
          <button onClick={e => { e.stopPropagation(); onOpenChart(play.ticker); }}
            style={{ marginTop: 10, background: "rgba(0,192,135,0.08)", border: "1px solid rgba(0,192,135,0.25)", borderRadius: 4, padding: "5px 12px", color: WB_GREEN, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            📈 View Chart
          </button>
        </div>
      )}
    </>
  );
}

function SectionHeader({ title, icon, count, loading }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", background: WB_BG, borderBottom: `1px solid ${WB_BORDER}`, borderTop: `1px solid ${WB_BORDER}`, marginTop: 4 }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      {count > 0 && <span style={{ fontSize: 10, color: WB_MUTED, background: "#21262d", borderRadius: 3, padding: "1px 5px" }}>{count}</span>}
      {loading && <Spinner />}
    </div>
  );
}

function Section({ title, icon, plays, loading, marketData, optionsChains, onOpenChart, strategyFilter, expiryFilter }) {
  const filtered = plays.filter(p =>
    (strategyFilter === "All Strategies" || p.strategy === strategyFilter) &&
    (expiryFilter === "All Expiries" || p.expiry === expiryFilter)
  );
  if (filtered.length === 0 && !loading) return null;
  return (
    <div>
      <SectionHeader title={title} icon={icon} count={filtered.length} loading={loading && plays.length === 0} />
      {filtered.length > 0 && <TableHeader />}
      {filtered.map((p, i) => <PlayRow key={p.ticker + i} play={p} index={i} marketData={marketData} optionsChains={optionsChains} onOpenChart={onOpenChart} />)}
      {!loading && plays.length === 0 && <div style={{ padding: "12px 16px", fontSize: 12, color: WB_MUTED, fontStyle: "italic" }}>No plays yet.</div>}
    </div>
  );
}

// ── Screener ──────────────────────────────────────────────────────────────────

function ScreenerSection({ results, loading, loaded, sort, setSort, limit, setLimit, onRescan, onOpenChart }) {
  const sortLabels = { score: "Top Score", iv: "Highest IV", volume: "Volume Spike", move: "Biggest Move" };
  const urgColor = (i) => i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : WB_MUTED;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: WB_BG, borderBottom: `1px solid ${WB_BORDER}`, borderTop: `1px solid ${WB_BORDER}`, marginTop: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>🔍 Stock Screener</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <select className="wb-select" value={sort} onChange={e => setSort(e.target.value)}>
            {Object.entries(sortLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select className="wb-select" value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
            {[10,20,30,50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={onRescan} disabled={loading}
            style={{ background: loading ? "transparent" : "rgba(0,192,135,0.08)", border: `1px solid ${loading ? WB_BORDER : "rgba(0,192,135,0.3)"}`, borderRadius: 4, padding: "4px 12px", color: loading ? WB_MUTED : WB_GREEN, fontSize: 11, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {loading ? <><Spinner /> Scanning…</> : loaded ? "↻ Rescan" : "▶ Run Screener"}
          </button>
        </div>
      </div>

      {!loaded && !loading && (
        <div style={{ padding: "40px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: WB_MUTED, marginBottom: 16 }}>Scan ~200 liquid US stocks for high volume, IV spikes, and price movement</div>
          <button onClick={onRescan} style={{ background: "rgba(0,192,135,0.1)", border: "1px solid rgba(0,192,135,0.3)", borderRadius: 6, padding: "8px 20px", color: WB_GREEN, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>▶ Run Screener</button>
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 16px" }}>
          <Spinner size={18} />
          <span style={{ fontSize: 12, color: WB_MUTED }}>Scanning universe… ~30 seconds</span>
        </div>
      )}

      {loaded && !loading && results.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "50px 90px 75px 65px 65px 65px 65px 1fr", padding: "5px 16px", background: "#0d1421", borderBottom: `1px solid ${WB_BORDER}`, gap: 8 }}>
            {["Rank","Ticker","Price","Chg%","Volume","IV%","Vol Ratio","Score"].map((col, i) => (
              <span key={col} style={{ fontSize: 10, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, textAlign: i >= 2 ? "right" : "left" }}>{col}</span>
            ))}
          </div>
          {results.map((r, i) => {
            const cc = r.change > 0 ? WB_GREEN : r.change < 0 ? WB_RED : WB_MUTED;
            const sc = r.score >= 60 ? WB_GREEN : r.score >= 35 ? WB_YELLOW : WB_MUTED;
            return (
              <div key={r.ticker} className="row-hover fade-in" onClick={() => onOpenChart(r.ticker)}
                style={{ display: "grid", gridTemplateColumns: "50px 90px 75px 65px 65px 65px 65px 1fr", padding: "7px 16px", borderBottom: `1px solid ${WB_BORDER}`, gap: 8, alignItems: "center", animationDelay: `${i * 0.03}s` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: urgColor(i), fontFamily: "'IBM Plex Mono',monospace" }}>#{i + 1}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace" }}>{r.ticker}</div>
                <div style={{ fontSize: 12, color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right" }}>${r.price}</div>
                <div style={{ fontSize: 12, color: cc, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right", fontWeight: 600 }}>{r.change > 0 ? "+" : ""}{r.change?.toFixed(1)}%</div>
                <div style={{ fontSize: 11, color: WB_MUTED, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right" }}>{r.volume || "—"}</div>
                <div style={{ fontSize: 12, color: r.iv > 60 ? WB_RED : r.iv > 35 ? WB_YELLOW : WB_MUTED, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right" }}>{r.iv ? `${r.iv}%` : "—"}</div>
                <div style={{ fontSize: 12, color: r.volRatio > 3 ? WB_GREEN : r.volRatio > 1.5 ? WB_YELLOW : WB_MUTED, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right" }}>{r.volRatio ? `${r.volRatio}x` : "—"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: WB_BORDER, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(r.score, 100)}%`, background: sc, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sc, fontFamily: "'IBM Plex Mono',monospace", minWidth: 28 }}>{r.score}</span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Earnings Section ──────────────────────────────────────────────────────────

function EarningsSection({ earnings = [], loading, onOpenChart }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [details, setDetails] = useState({});
  const [detailsLoading, setDetailsLoading] = useState({});
  const filtered = filter === "week" ? earnings.filter(e => e.daysUntil <= 7) : filter === "today" ? earnings.filter(e => e.daysUntil <= 1) : earnings;
  const urgColor = d => d <= 1 ? WB_RED : d <= 3 ? WB_YELLOW : d <= 7 ? "#00d4ff" : WB_MUTED;
  const ratingColor = r => {
    if (!r) return WB_MUTED;
    const l = r.toLowerCase();
    if (l.includes("buy") || l.includes("outperform") || l.includes("overweight")) return WB_GREEN;
    if (l.includes("sell") || l.includes("underperform")) return WB_RED;
    return WB_YELLOW;
  };
  const toggleExpand = async (ticker) => {
    const isOpen = expanded[ticker];
    setExpanded(prev => ({ ...prev, [ticker]: !isOpen }));
    if (!isOpen && !details[ticker]) {
      setDetailsLoading(prev => ({ ...prev, [ticker]: true }));
      try {
        const r = await fetch(`${API_BASE}/api/earnings-detail/${ticker}`);
        const d = await r.json();
        setDetails(prev => ({ ...prev, [ticker]: d }));
      } catch {}
      setDetailsLoading(prev => ({ ...prev, [ticker]: false }));
    }
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", background: WB_BG, borderBottom: `1px solid ${WB_BORDER}`, borderTop: `1px solid ${WB_BORDER}`, marginTop: 4 }}>
        <span style={{ fontSize: 11 }}>📅</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Earnings Calendar</span>
        {loading && <Spinner />}
        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          {[["all","All"],["week","Week"],["today","Today"]].map(([key, label]) => (
            <button key={key} className={`tab-btn ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)} style={{ color: filter === key ? WB_TEXT : WB_MUTED, padding: "3px 8px", fontSize: 10 }}>
              {label}
              {key === "week" && earnings.filter(e => e.daysUntil <= 7).length > 0 && <span style={{ marginLeft: 4, background: "rgba(255,184,0,0.2)", color: WB_YELLOW, borderRadius: 3, padding: "0 4px", fontSize: 9 }}>{earnings.filter(e => e.daysUntil <= 7).length}</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "90px 70px 100px 70px 80px 80px 1fr", padding: "5px 16px", background: "#0d1421", borderBottom: `1px solid ${WB_BORDER}`, gap: 8 }}>
        {["Date","Ticker","Price","Days","EPS Est","Rating","Target"].map((col, i) => (
          <span key={col} style={{ fontSize: 10, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, textAlign: i >= 3 ? "right" : "left" }}>{col}</span>
        ))}
      </div>
      {filtered.map((e, i) => {
        const d = details[e.ticker];
        const isExpanded = expanded[e.ticker];
        return (
          <div key={e.ticker + i}>
            <div className="row-hover fade-in" onClick={() => toggleExpand(e.ticker)}
              style={{ display: "grid", gridTemplateColumns: "90px 70px 100px 70px 80px 80px 1fr", padding: "7px 16px", borderBottom: `1px solid ${WB_BORDER}`, gap: 8, alignItems: "center", animationDelay: `${i * 0.03}s`, borderLeft: `2px solid ${urgColor(e.daysUntil)}`, background: isExpanded ? "#1c2128" : "transparent" }}>
              <div style={{ fontSize: 12, color: urgColor(e.daysUntil), fontFamily: "'IBM Plex Mono',monospace" }}>{e.earningsDate}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace" }} onClick={ev => { ev.stopPropagation(); onOpenChart(e.ticker); }}>{e.ticker}</div>
              <div style={{ fontSize: 12, color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace" }}>{e.price ? `$${e.price}` : "—"}{e.change != null && <span style={{ fontSize: 10, color: e.change >= 0 ? WB_GREEN : WB_RED, marginLeft: 4 }}>{e.change >= 0 ? "+" : ""}{e.change}%</span>}</div>
              <div style={{ textAlign: "right" }}>{e.daysUntil <= 3 ? <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: e.daysUntil <= 1 ? "rgba(255,92,92,0.15)" : "rgba(255,184,0,0.12)", color: urgColor(e.daysUntil) }}>{e.daysUntil === 0 ? "TODAY" : e.daysUntil === 1 ? "TOMORROW" : `${e.daysUntil}d`}</span> : <span style={{ fontSize: 11, color: WB_MUTED }}>in {e.daysUntil}d</span>}</div>
              <div style={{ fontSize: 12, color: "#a78bfa", fontFamily: "'IBM Plex Mono',monospace", textAlign: "right" }}>{e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : "—"}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: ratingColor(d?.rating), textAlign: "right" }}>{d?.rating || "—"}</div>
              <div style={{ fontSize: 12, color: WB_GREEN, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right" }}>{d?.targetPrice ? `$${d.targetPrice}` : "—"}</div>
            </div>
            {isExpanded && (
              <div className="fade-in" style={{ background: "#13191f", borderBottom: `1px solid ${WB_BORDER}`, padding: "12px 16px", borderLeft: `2px solid ${urgColor(e.daysUntil)}` }}>
                {detailsLoading[e.ticker] && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Spinner /><span style={{ fontSize: 12, color: WB_MUTED }}>Loading details…</span></div>}
                {d && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                      {[["EPS Estimate", d.epsEstimate != null ? `$${d.epsEstimate}` : "—", "#a78bfa"], ["Revenue Est", d.revenueEstimate || "—", WB_TEXT], ["EPS Growth", d.epsGrowth != null ? `${d.epsGrowth > 0 ? "+" : ""}${d.epsGrowth}%` : "—", d.epsGrowth > 0 ? WB_GREEN : WB_RED], ["Price Target", d.targetPrice ? `$${d.targetPrice}` : "—", WB_GREEN]].map(([label, val, color]) => (
                        <div key={label} style={{ background: WB_SURFACE, border: `1px solid ${WB_BORDER}`, borderRadius: 4, padding: "7px 10px" }}>
                          <div style={{ fontSize: 10, color: WB_MUTED, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "'IBM Plex Mono',monospace" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {d.surpriseHistory?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>EPS Surprise History</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {d.surpriseHistory.map((s, idx) => (
                            <div key={idx} style={{ flex: 1, background: s.surprise >= 0 ? "rgba(0,192,135,0.08)" : "rgba(255,92,92,0.08)", border: `1px solid ${s.surprise >= 0 ? "rgba(0,192,135,0.2)" : "rgba(255,92,92,0.2)"}`, borderRadius: 4, padding: "6px 8px", textAlign: "center" }}>
                              <div style={{ fontSize: 9, color: WB_MUTED, marginBottom: 2 }}>{s.quarter}</div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: s.surprise >= 0 ? WB_GREEN : WB_RED, fontFamily: "'IBM Plex Mono',monospace" }}>{s.surprise >= 0 ? "+" : ""}{s.surprise}%</div>
                              <div style={{ fontSize: 9, color: WB_MUTED, marginTop: 1 }}>Est ${s.estimate}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {d.rating && <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div><div style={{ fontSize: 10, color: WB_MUTED, textTransform: "uppercase", marginBottom: 2 }}>Analyst Rating</div><div style={{ fontSize: 13, fontWeight: 700, color: ratingColor(d.rating) }}>{d.rating}</div></div>
                      {d.numAnalysts && <div><div style={{ fontSize: 10, color: WB_MUTED, textTransform: "uppercase", marginBottom: 2 }}>Analysts</div><div style={{ fontSize: 13, fontWeight: 600, color: WB_TEXT }}>{d.numAnalysts}</div></div>}
                      <button onClick={() => onOpenChart(e.ticker)} style={{ marginLeft: "auto", background: "rgba(0,192,135,0.08)", border: "1px solid rgba(0,192,135,0.25)", borderRadius: 4, padding: "5px 12px", color: WB_GREEN, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>📈 View Chart</button>
                    </div>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!loading && filtered.length === 0 && <div style={{ padding: "12px 16px", fontSize: 12, color: WB_MUTED, fontStyle: "italic" }}>No upcoming earnings.</div>}
    </div>
  );
}

// ── Watchlist Editor ──────────────────────────────────────────────────────────

function WatchlistEditor({ watchlist, onSave }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(watchlist.join(", "));
  const saveAndClose = () => {
    const tickers = text.split(/[\s,]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
    onSave(tickers);
    setOpen(false);
  };
  return (
    <div style={{ padding: "8px 16px", background: WB_SURFACE, borderBottom: `1px solid ${WB_BORDER}` }}>
      <button onClick={() => setOpen(!open)} style={{ background: "transparent", border: `1px solid ${WB_BORDER}`, borderRadius: 4, padding: "4px 10px", color: WB_MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
        ⚙ {open ? "Close" : "Edit Watchlist"} {watchlist.length > 0 && `(${watchlist.length})`}
      </button>
      {open && (
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && saveAndClose()} placeholder="PLTR, SMCI, ARM..."
            style={{ flex: 1, background: WB_BG, border: `1px solid ${WB_BORDER}`, borderRadius: 4, padding: "6px 10px", color: WB_TEXT, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, outline: "none" }} />
          <button onClick={saveAndClose} style={{ background: "rgba(0,192,135,0.1)", border: "1px solid rgba(0,192,135,0.3)", borderRadius: 4, padding: "6px 12px", color: WB_GREEN, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
          <button onClick={() => setText("")} style={{ background: "transparent", border: `1px solid ${WB_BORDER}`, borderRadius: 4, padding: "6px 12px", color: WB_MUTED, fontSize: 11, cursor: "pointer" }}>Clear</button>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [sections, setSections] = useState({});
  const [timeframes, setTimeframes] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState(() => localStorage.getItem("timeframe") || "weekly");
  const [allPlays, setAllPlays] = useState({});
  const [marketData, setMarketData] = useState({});
  const [optionsChains, setOptionsChains] = useState({});
  const [gammaExposure, setGammaExposure] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [watchlist, setWatchlist] = useState(() => { try { return JSON.parse(localStorage.getItem("watchlist") || "[]"); } catch { return []; } });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("options");
  const [chartTicker, setChartTicker] = useState(null);
  const [strategyFilter, setStrategyFilter] = useState("All Strategies");
  const [expiryFilter, setExpiryFilter] = useState("All Expiries");
  const [screenerResults, setScreenerResults] = useState([]);
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [screenerLoaded, setScreenerLoaded] = useState(false);
  const [screenerSort, setScreenerSort] = useState("score");
  const [screenerLimit, setScreenerLimit] = useState(20);
  const [earningsData, setEarningsData] = useState([]);
  const [earningsLoading, setEarningsLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/sections`, { headers: { "ngrok-skip-browser-warning": "true" } }).then(r => r.json()).then(setSections).catch(() => {});
    fetch(`${API_BASE}/api/timeframes`, { headers: { "ngrok-skip-browser-warning": "true" } }).then(r => r.json()).then(setTimeframes).catch(() => {});
  }, []);

  const fetchAlerts = useCallback(() => {
    fetch(`${API_BASE}/api/alerts`).then(r => r.json()).then(d => setAlerts(d.alerts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const clearAlerts = useCallback(() => {
    fetch(`${API_BASE}/api/alerts/clear`, { method: "POST" }).then(() => setAlerts([])).catch(() => {});
  }, []);

  const fetchScreener = useCallback((sort, limit) => {
    setScreenerLoading(true);
    fetch(`${API_BASE}/api/screener?sort=${sort}&limit=${limit}`)
      .then(r => r.json())
      .then(d => { setScreenerResults(d); setScreenerLoading(false); setScreenerLoaded(true); })
      .catch(() => setScreenerLoading(false));
  }, []);

  const fetchEarnings = useCallback(() => {
    setEarningsLoading(true);
    fetch(`${API_BASE}/api/earnings-calendar`)
      .then(r => r.json())
      .then(d => { setEarningsData(d); setEarningsLoading(false); })
      .catch(() => setEarningsLoading(false));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    fetchScreener(screenerSort, screenerLimit);
    fetchEarnings();
    try {
      setStep("Fetching market data…");
      const mdRes = await fetch(`${API_BASE}/api/market-data`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customWatchlist: watchlist }) });
      if (!mdRes.ok) throw new Error("Backend not responding on port 3003");
      const md = await mdRes.json();
      setMarketData(md);

      setStep(`Fetching ${timeframes[selectedTimeframe]?.label || ""} options chains…`);
      const tickersForChains = Object.keys(md).filter(t => !t.startsWith("^") && md[t] && !md[t].error);
      const ocRes = await fetch(`${API_BASE}/api/options-chains`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers: tickersForChains, timeframe: selectedTimeframe }) });
      const oc = ocRes.ok ? await ocRes.json() : {};
      setOptionsChains(oc);

      setStep("Calculating gamma exposure…");
      try {
        const gexRes = await fetch(`${API_BASE}/api/gamma-exposure`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers: ["SPY", "QQQ", "IWM"] }) });
        if (gexRes.ok) setGammaExposure(await gexRes.json());
      } catch {}

      setStep("Generating plays with Claude AI…");
      const playsRes = await fetch(`${API_BASE}/api/generate-plays`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marketData: md, optionsChains: oc, customWatchlist: watchlist, timeframe: selectedTimeframe }) });
      if (!playsRes.ok) { const e = await playsRes.json(); throw new Error(e.error || "Failed"); }
      const result = await playsRes.json();
      setAllPlays(result.plays || {});
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setStep(""); }
  }, [watchlist, selectedTimeframe, timeframes, fetchScreener, fetchEarnings, screenerSort, screenerLimit]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setStrategyFilter("All Strategies"); setExpiryFilter("All Expiries"); }, [allPlays]);

  const saveWatchlist = list => { setWatchlist(list); localStorage.setItem("watchlist", JSON.stringify(list)); };
  const changeTimeframe = tf => { setSelectedTimeframe(tf); localStorage.setItem("timeframe", tf); };

  const liveCount = Object.values(marketData).filter(v => v && !v.error && v.price).length;
  const totalCount = Object.keys(marketData).length;
  const vixData = marketData["^VIX"];
  const displaySections = { ...sections };
  if (watchlist.length > 0) displaySections.custom = { label: "My Watchlist", icon: "⭐", tickers: watchlist };
  const totalPlays = Object.values(allPlays).flat().length;

  return (
    <div style={{ minHeight: "100vh", background: WB_BG, color: WB_TEXT, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <style>{css}</style>

      {chartTicker && <ChartModal ticker={chartTicker} onClose={() => setChartTicker(null)} />}

      {/* Nav */}
      <div style={{ background: WB_SURFACE, borderBottom: `1px solid ${WB_BORDER}`, padding: "0 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, height: 44 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LiveDot loading={loading} liveCount={liveCount} />
            <span style={{ fontSize: 15, fontWeight: 700, color: WB_GREEN, letterSpacing: "-0.5px" }}>optionflow</span>
          </div>
          <div style={{ width: 1, height: 20, background: WB_BORDER }} />
          {[["options","Options"],["screener","Screener"],["earnings","Earnings"]].map(([key, label]) => (
            <button key={key} className={`tab-btn ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)} style={{ color: activeTab === key ? WB_TEXT : WB_MUTED }}>{label}</button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            {loading ? <span style={{ fontSize: 11, color: WB_YELLOW, fontFamily: "'IBM Plex Mono',monospace" }}>{step || "LOADING…"}</span>
              : lastUpdated && <span style={{ fontSize: 11, color: WB_MUTED, fontFamily: "'IBM Plex Mono',monospace" }}>{liveCount}/{totalCount} live · {lastUpdated}</span>}
            <button onClick={fetchAll} disabled={loading}
              style={{ background: loading ? "transparent" : "rgba(0,192,135,0.08)", border: `1px solid ${loading ? WB_BORDER : "rgba(0,192,135,0.3)"}`, borderRadius: 4, padding: "5px 12px", color: loading ? WB_MUTED : WB_GREEN, fontSize: 11, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {loading ? <Spinner /> : "↻ Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Subheader */}
      <div style={{ background: WB_SURFACE, borderBottom: `1px solid ${WB_BORDER}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: WB_MUTED }}>Daily High-Prob Option Plays</div>
          <div style={{ fontSize: 11, color: WB_MUTED, marginTop: 1 }}>{today}</div>
        </div>
        <div style={{ display: "flex", gap: 24, marginLeft: "auto", flexWrap: "wrap" }}>
          {[["VIX", vixData?.price || "—", vixData ? getVixZone(vixData.price).color : WB_MUTED], ["Timeframe", timeframes[selectedTimeframe]?.label || selectedTimeframe, WB_TEXT], ["Plays", totalPlays || "—", WB_GREEN], ["Chains", Object.values(optionsChains).filter(v => v && !v.error).length || "—", WB_TEXT]].map(([label, val, color]) => (
            <div key={label} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: WB_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "'IBM Plex Mono',monospace" }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <VixStrip data={vixData} />

      {error && (
        <div style={{ margin: "8px 16px", background: "rgba(255,92,92,0.07)", border: "1px solid rgba(255,92,92,0.2)", borderRadius: 4, padding: "8px 12px", fontSize: 12, color: WB_RED, display: "flex", gap: 12, alignItems: "center" }}>
          {error} <button onClick={fetchAll} style={{ background: "none", border: "none", color: "#ff8fa3", cursor: "pointer", textDecoration: "underline", fontSize: 12 }}>Retry</button>
        </div>
      )}

      <div style={{ padding: "5px 16px", background: "rgba(255,184,0,0.04)", borderBottom: `1px solid rgba(255,184,0,0.1)`, fontSize: 10, color: "#92813a" }}>
        ⚠ Educational use only — AI-generated plays, not financial advice.
      </div>

      {/* GEX + Alerts always visible */}
      <GammaPanel gamma={gammaExposure} />
      <AlertsPanel alerts={alerts} onClear={clearAlerts} />

      {/* Tabs */}
      <div style={{ display: activeTab === "options" ? "block" : "none" }}>
        <TimeframeTabs timeframes={timeframes} selected={selectedTimeframe} onChange={changeTimeframe} disabled={loading} />
        <WatchlistEditor watchlist={watchlist} onSave={saveWatchlist} />
        {totalPlays > 0 && <FilterBar allPlays={allPlays} strategyFilter={strategyFilter} setStrategyFilter={setStrategyFilter} expiryFilter={expiryFilter} setExpiryFilter={setExpiryFilter} />}
        {Object.entries(displaySections).map(([key, sec]) => (
          <Section key={key} title={sec.label} icon={sec.icon || "📈"} plays={allPlays[key] || []} loading={loading && !(allPlays[key]?.length)} marketData={marketData} optionsChains={optionsChains} onOpenChart={setChartTicker} strategyFilter={strategyFilter} expiryFilter={expiryFilter} />
        ))}
      </div>

      <div style={{ display: activeTab === "screener" ? "block" : "none" }}>
        <ScreenerSection results={screenerResults} loading={screenerLoading} loaded={screenerLoaded} sort={screenerSort} setSort={setScreenerSort} limit={screenerLimit} setLimit={setScreenerLimit} onRescan={() => fetchScreener(screenerSort, screenerLimit)} onOpenChart={setChartTicker} />
      </div>

      <div style={{ display: activeTab === "earnings" ? "block" : "none" }}>
        <EarningsSection earnings={earningsData} loading={earningsLoading} onOpenChart={setChartTicker} />
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
