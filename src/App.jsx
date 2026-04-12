import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";

const DOC_REF = () => doc(db, "covo", "shared");
const USERS_REF = () => doc(db, "covo", "users");

/* ═══ THEME CONTEXT ═══ */
const ThemeCtx = createContext();
const THEMES = {
  dark: { bg1: "#0a1f16", bg2: "#0f2e1f", bg3: "#132e1a", text: "#eae2d6", muted: "#7c8a6d", card: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.06)", accent1: "#f0a500", accent2: "#00b894" },
  light: { bg1: "#f0efe8", bg2: "#e8e6df", bg3: "#dfddd6", text: "#1a2a1e", muted: "#6a7a5e", card: "rgba(0,0,0,0.04)", border: "rgba(0,0,0,0.08)", accent1: "#d49000", accent2: "#00966e" },
};

/* ═══ SOUNDS ═══ */
let _soundEnabled = false;
const CLICK_SOUND_B64 = "data:audio/mp3;base64,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OMMUqLD0MREDHlQaCJQpZYQD3DQClA0DBwuBQ6BgpBGmUqwsEEO80gH/+7Jk3wAGdWFIzXHgAFXK6f+nlAEsaiMXGd0AAuGyZC8zEAADDYqIBIQtKMgRIYKBgYLKy6xWlDQBrk0667oPZcyh0KJ7XrlQQaGjTKlHVpL8VY+KBa2qZe7F2gLqi7E1VJA7Uff+GKkZYsmdXhtWBw1uK0Uc9AMCQ7AjqzMmjctrw65UzLqeDom/lLKX/W8ueG4AkMkvyx4MYDfWJ0969Uszk5GZTVsc+GdS/KnsUVyvfpbuHfijiSC9OYUlDI7bkSyxT58/////X//////////////7/////9f//////////T09uHIxYl9vvc7YAAEAITASDAACiwCsBJIcMAiTJjM5RMEu0gIBhwXFP58GtjxxCEUHXAG4KSDnjSDIIb2PoEZGGUBcZJDOE8ff9bJpv6/UggybmJVOnyySJDRojHnzo0yfGeLbonjpJDQFJCgxGI3xxEyLokBzCHkeKkM+OWTJfHARhYIiVBZ5BEi+ZIl0nS+VSfRHh1k+RhqcJknjM8af/Q/9f+pS0DpqYGRcNz5sZO/UzkyykEqV9BIwSQN0ULnU6UxBTUUzLjEwMFVVVRAJMshNQtNcrNIXJhBi0hu5R0axslpmBZhAZggphAphApggJZkuSEeDVCbCbCbC5D1EKLkoXr1WnKaJonSoY0FOnKaJoltJyTk0jSNI0jSOpRMz56rVa9rh8rkOVrK9evXrCnUNZo3+LetcsKtVqtevXtbf//Na2tbfta1oL17Frr2t8WhRrbzW1rWta1rVgvXr169evYUa1rWta1df+1oT6oKCgoKFBQUFBIL/hQL4KCgwUFBQUCgoKK//6ChQUFD/+7JkYI/2NVHGB2ngAkolOMXnoABAAAGkAAAAIAAANIAAAARQSCgoKCgCQBuOZRQyUhegZQFkBZE2JcqrsKtVqtetcioKQFQFQWiosLMzMzNqq1///8qzMzMzX+zNf/+oqHINRY46KCmxRX5AoKKyO4FfFUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=";
let _clickAudio = null;
function getClickAudio() { if (!_clickAudio) { _clickAudio = new Audio(CLICK_SOUND_B64); _clickAudio.volume = 0.5; } return _clickAudio; }
function setSoundEnabled(v) { _soundEnabled = v; }
function isSoundEnabled() { return _soundEnabled; }
function playSound() {
  if (!_soundEnabled) return;
  try { const a = getClickAudio(); a.currentTime = 0; a.play().catch(() => {}); } catch (e) {}
}
function haptic(ms = 10) { try { navigator?.vibrate?.(ms); } catch (e) {} }
function tap() { haptic(); playSound(); }

/* ═══ CONSTANTS ═══ */
const SECTIONS = [
  { id: "movies", icon: "📋", label: "Lista Film" },
  { id: "wheel", icon: "🎰", label: "Estrazione" },
  { id: "watched", icon: "✅", label: "Già Visti" },
  { id: "planner", icon: "🕯️", label: "Date Night" },
  { id: "reviews", icon: "📝", label: "Recensioni" },
  { id: "wishlist", icon: "💫", label: "Wishlist" },
  { id: "gusti", icon: "💚", label: "I Nostri Gusti" },
  { id: "pigiami", icon: "🛌", label: "Classifica Pigiami" },
  { id: "achievements", icon: "🏆", label: "Traguardi" },
  { id: "calendar", icon: "📅", label: "Calendario" },
  { id: "stats", icon: "📊", label: "Statistiche" },
];

const CATEGORIES = [
  { id: "azione", icon: "💥", label: "Azione", color: "#e94560" },
  { id: "commedia", icon: "😂", label: "Commedia", color: "#f0a500" },
  { id: "horror", icon: "👻", label: "Horror", color: "#8b5cf6" },
  { id: "romantico", icon: "💕", label: "Romantico", color: "#ec4899" },
  { id: "scifi", icon: "🚀", label: "Sci-Fi", color: "#06b6d4" },
  { id: "thriller", icon: "🔪", label: "Thriller", color: "#ef4444" },
  { id: "dramma", icon: "🎭", label: "Dramma", color: "#3b82f6" },
  { id: "animazione", icon: "🎨", label: "Animazione", color: "#10b981" },
  { id: "documentario", icon: "🎓", label: "Documentario", color: "#6366f1" },
  { id: "altro", icon: "🎬", label: "Altro", color: "#7c8a6d" },
];

const WISH_TYPES = [
  { id: "serie", icon: "📺", label: "Serie TV" },
  { id: "ristorante", icon: "🍽️", label: "Ristorante" },
  { id: "viaggio", icon: "✈️", label: "Viaggio" },
  { id: "esperienza", icon: "🎯", label: "Esperienza" },
  { id: "altro_w", icon: "💫", label: "Altro" },
];

const RAND_ACT = ["Film a casa", "Cinema", "Passeggiata", "Gioco da tavolo", "Cuciniamo insieme", "Serata serie TV", "Videogiochi insieme", "Picnic", "Spa in casa"];
const RAND_FOOD = ["Pizza", "Sushi", "Pasta", "Hamburger", "Poke bowl", "Tacos", "Popcorn e snack", "Aperitivo", "Dolci fatti in casa"];
const RAND_DRINK = ["Vino rosso", "Birra artigianale", "Cocktail", "Tè caldo", "Cioccolata calda", "Spritz", "Succo di frutta", "Bollicine"];

const TMDB_KEY = "0f9faaec733c2818c364356c4fd6f2ea";
const PJ_EMOJIS = ["👘", "🧸", "🐻", "🦊", "🐙", "🌙", "⭐", "🔮", "🧶", "🎀", "🐱", "🐰"];
const PROFILE_EMOJIS = ["🐙", "🦑", "🐉", "🦊", "🐱", "🐻", "🦋", "🌙", "⭐", "🔮", "🎀", "👑", "🌸", "🍄", "🦄", "🐸"];
const PROFILE_COLORS = ["#f0a500", "#00b894", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444", "#3b82f6", "#10b981"];

const EMPTY = { movies: [], watched: [], plans: [], reviews: {}, anniversary: null, categories: {}, reactions: {}, wishlist: [], gusti: [], pigiami: [] };

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return `hsl(${Math.abs(h) % 360}, 50%, 38%)`; }
function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
function getGreeting() { const h = new Date().getHours(); if (h < 6) return "Buonanotte"; if (h < 13) return "Buongiorno"; if (h < 18) return "Buon pomeriggio"; return "Buonasera"; }
function toDate(s) { if (!s) return null; const p = s.split(/[-/.]/); if (p[0].length === 4) return new Date(+p[0], +p[1]-1, +p[2]); return new Date(+p[2], +p[1]-1, +p[0]); }
function daysUntil(dateStr) { const t = toDate(dateStr); if (!t || isNaN(t)) return null; const now = new Date(); now.setHours(0,0,0,0); return Math.ceil((t - now) / 86400000); }

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0 || typeof target === "string") { setVal(target); return; }
    let start = null;
    const step = (ts) => { if (!start) start = ts; const p = Math.min((ts - start) / duration, 1); setVal(Math.floor(p * target)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

/* ═══ ACHIEVEMENTS ═══ */
function getAchievements(data) {
  const a = [];
  const w = data.watched?.length || 0;
  const m = data.movies?.length || 0;
  const p = data.plans?.length || 0;
  const r = Object.keys(data.reviews || {}).length;
  const g = (data.gusti || []).length;
  const wl = (data.wishlist || []).length;
  const pj = (data.pigiami || []).length;
  const wlDone = (data.wishlist || []).filter(x => x.done).length;
  const unanimi = Object.values(data.reviews || {}).filter(rv => rv.lui !== undefined && rv.lei !== undefined && Math.abs(rv.lui - rv.lei) <= 1).length;

  // Film
  a.push({ id: "first_film", icon: "🎬", title: "Primo Film!", desc: "Aggiungi il primo film alla lista", done: m >= 1 });
  a.push({ id: "film_10", icon: "📚", title: "Cinefili", desc: "10 film in lista", done: m >= 10 });
  a.push({ id: "film_25", icon: "🎞️", title: "Maratona", desc: "25 film in lista", done: m >= 25 });
  // Watched
  a.push({ id: "first_watch", icon: "🍿", title: "Prima Visione!", desc: "Guarda il primo film insieme", done: w >= 1 });
  a.push({ id: "watch_5", icon: "📺", title: "Serata Cinema", desc: "5 film visti insieme", done: w >= 5 });
  a.push({ id: "watch_10", icon: "🎥", title: "Cinefili Doc", desc: "10 film visti insieme", done: w >= 10 });
  a.push({ id: "watch_25", icon: "🏆", title: "Maratoneti", desc: "25 film visti insieme", done: w >= 25 });
  // Plans
  a.push({ id: "first_plan", icon: "🕯️", title: "Prima Serata!", desc: "Pianifica la prima serata", done: p >= 1 });
  a.push({ id: "plan_10", icon: "💑", title: "Romantici", desc: "10 serate pianificate", done: p >= 10 });
  // Reviews
  a.push({ id: "first_review", icon: "📝", title: "Critici!", desc: "Prima recensione", done: r >= 1 });
  a.push({ id: "review_10", icon: "🎓", title: "Esperti", desc: "10 recensioni", done: r >= 10 });
  a.push({ id: "unanimi_3", icon: "🤝", title: "Anime Gemelle", desc: "3 recensioni unanimi", done: unanimi >= 3 });
  // Wishlist
  a.push({ id: "wish_1", icon: "💫", title: "Sognatori", desc: "Primo desiderio in wishlist", done: wl >= 1 });
  a.push({ id: "wish_done_5", icon: "✨", title: "Realizzatori", desc: "5 desideri realizzati", done: wlDone >= 5 });
  // Gusti
  a.push({ id: "gusti_5", icon: "💚", title: "Ci Conosciamo", desc: "5 gusti condivisi", done: g >= 5 });
  a.push({ id: "gusti_20", icon: "💛", title: "Open Book", desc: "20 gusti condivisi", done: g >= 20 });
  // Pigiami
  a.push({ id: "pj_1", icon: "🛌", title: "Fashion Show!", desc: "Primo pigiama classificato", done: pj >= 1 });
  a.push({ id: "pj_5", icon: "👘", title: "Guardaroba", desc: "5 pigiami classificati", done: pj >= 5 });

  return a;
}

/* ═══ SHARED COMPONENTS ═══ */
function Confetti({ active }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!active) return;
    const colors = ["#f0a500", "#00b894", "#ff6b6b", "#c9a0ff", "#64dfdf", "#ec4899"];
    const ps = [...Array(40)].map((_, i) => ({
      id: i, x: 50 + (Math.random() - 0.5) * 20, y: 50,
      dx: (Math.random() - 0.5) * 200, rot: Math.random() * 720, size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? "circle" : "rect",
    }));
    setParticles(ps);
    const t = setTimeout(() => setParticles([]), 2500);
    return () => clearTimeout(t);
  }, [active]);
  if (particles.length === 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 10 }}>
      <style>{`@keyframes confetti-fall { 0% { transform: translate(0,0) rotate(0deg); opacity:1; } 100% { transform: translate(var(--dx), 300px) rotate(var(--rot)); opacity:0; } }`}</style>
      {particles.map(p => (
        <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.shape === "rect" ? p.size * 1.5 : p.size, borderRadius: p.shape === "circle" ? "50%" : 2, background: p.color, "--dx": `${p.dx}px`, "--rot": `${p.rot}deg`, animation: `confetti-fall 2s cubic-bezier(.25,.46,.45,.94) forwards` }} />
      ))}
    </div>
  );
}

function TentacleSep() {
  const T = useContext(ThemeCtx);
  return (
    <svg viewBox="0 0 360 16" style={{ width: "100%", maxWidth: 360, height: 16, opacity: 0.2, margin: "4px 0" }}>
      <path d="M0,8 Q30,2 60,8 T120,8 T180,8 T240,8 T300,8 T360,8" fill="none" stroke={T.accent2} strokeWidth="1.5" />
      <path d="M0,10 Q30,14 60,10 T120,10 T180,10 T240,10 T300,10 T360,10" fill="none" stroke={T.accent1} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function Sparkline({ values, color = "#f0a500", width = 60, height = 20 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1); const min = Math.min(...values, 0); const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return <svg width={width} height={height} style={{ marginLeft: 8, flexShrink: 0 }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 24, maxWidth: 440, margin: "0 auto", minHeight: "100vh", background: "linear-gradient(170deg,#0a1f16 0%,#0f2e1f 40%,#132e1a 100%)" }}>
      <style>{`@keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }`}</style>
      {[{ w: "100%", h: 56, r: 14 }, { w: "100%", h: 100, r: 16 }, { w: 140, h: 140, r: "50%" }, { w: "60%", h: 30, r: 8 }, { w: "40%", h: 16, r: 8 }, { w: "100%", h: 50, r: 14 }].map((s, i) => (
        <div key={i} style={{ width: s.w, height: s.h, borderRadius: s.r, background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)", backgroundSize: "400px 100%", animation: `shimmer 1.5s ease-in-out infinite ${i * 0.15}s` }} />
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 360 }}>
        {[...Array(8)].map((_, i) => <div key={i} style={{ height: 80, borderRadius: 16, background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)", backgroundSize: "400px 100%", animation: `shimmer 1.5s ease-in-out infinite ${0.1 + i * 0.08}s` }} />)}
      </div>
    </div>
  );
}

function Toast({ msg }) { if (!msg) return null; return <div style={S.toast}>{msg}</div>; }

/* ═══ EXPORT PDF ═══ */
function exportPDF(data, usersDoc) {
  const rv = Object.entries(data.reviews || {});
  const avgT = rv.length > 0 ? (rv.reduce((s, [, r]) => s + (r.avg || 0), 0) / rv.length).toFixed(1) : "-";
  const best = rv.sort((a, b) => (b[1].avg || 0) - (a[1].avg || 0))[0];
  const w = new window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Il Nostro Anno - Covo di Cthulhu</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#0a1f16;color:#eae2d6;padding:40px;max-width:600px;margin:0 auto}
  h1{text-align:center;font-size:28px;background:linear-gradient(135deg,#00b894,#f0a500);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
  h2{color:#f0a500;font-size:18px;margin:24px 0 8px;border-bottom:1px solid rgba(240,165,0,0.2);padding-bottom:4px}
  .sub{text-align:center;color:#7c8a6d;font-size:14px;margin-bottom:24px}
  .stat{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
  .stat .l{color:#7c8a6d}.stat .v{font-weight:700;color:#f0a500}
  .film{padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.03)}
  .footer{text-align:center;margin-top:32px;color:#3a4a2e;font-size:11px;font-style:italic}
  @media print{body{background:#fff;color:#333}h1{-webkit-text-fill-color:#00b894}.stat .v{color:#d49000}.footer{color:#999}}</style></head><body>
  <div style="text-align:center;font-size:48px;margin-bottom:8px">🐙</div>
  <h1>Il Nostro Anno Insieme</h1>
  <div class="sub">${usersDoc?.luiName || "Lui"} & ${usersDoc?.leiName || "Lei"} · Covo di Cthulhu</div>
  <h2>📊 Numeri</h2>
  <div class="stat"><span class="l">Film in lista</span><span class="v">${data.movies?.length || 0}</span></div>
  <div class="stat"><span class="l">Film visti insieme</span><span class="v">${data.watched?.length || 0}</span></div>
  <div class="stat"><span class="l">Serate pianificate</span><span class="v">${data.plans?.length || 0}</span></div>
  <div class="stat"><span class="l">Recensioni</span><span class="v">${rv.length}</span></div>
  <div class="stat"><span class="l">Media di coppia</span><span class="v">${avgT}/10</span></div>
  ${best ? `<div class="stat"><span class="l">Miglior film</span><span class="v">${best[0]} (${best[1].avg})</span></div>` : ""}
  <h2>✅ Film Visti</h2>
  ${(data.watched || []).map(w => `<div class="film">🎬 ${w.title} <span style="color:#7c8a6d;font-size:12px">· ${w.date}</span>${data.reviews?.[w.title]?.avg ? ` <span style="color:#f0a500">★ ${data.reviews[w.title].avg}</span>` : ""}</div>`).join("") || "<p style='color:#7c8a6d'>Nessun film visto</p>"}
  <h2>📝 Top Recensioni</h2>
  ${rv.slice(0, 10).map(([t, r]) => `<div class="film">${t} <span style="color:#f0a500;font-weight:700">${r.avg}/10</span> ${r.luiComment ? `<br><span style="font-size:12px;color:#7c8a6d">🙋‍♂️ "${r.luiComment}"</span>` : ""}${r.leiComment ? `<br><span style="font-size:12px;color:#7c8a6d">🙋‍♀️ "${r.leiComment}"</span>` : ""}</div>`).join("")}
  <div class="footer">Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn 🐙<br>Generato il ${new Date().toLocaleDateString("it-IT")}</div>
  </body></html>`);
  w.document.close();
}

/* ═══ MAIN APP ═══ */
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState("hub");
  const [usersDoc, setUsersDoc] = useState(null);
  const [animDir, setAnimDir] = useState("");
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("covo-theme") || "dark");
  const [soundOn, setSoundOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevRef = useRef(null);

  const T = THEMES[theme];
  const toggleTheme = () => { const n = theme === "dark" ? "light" : "dark"; setTheme(n); localStorage.setItem("covo-theme", n); };
  const toggleSound = () => { const n = !soundOn; setSoundOn(n); setSoundEnabled(n); if (n) playSound(); };

  const navigate = (s) => { tap(); setAnimDir("slide-in"); setScreen(s); window.history.pushState({ screen: s }, ""); };
  const goBack = () => { tap(); setAnimDir("slide-out"); setScreen("hub"); };

  useEffect(() => {
    window.history.replaceState({ screen: "hub" }, "");
    const h = (e) => { setAnimDir("slide-out"); setScreen(e.state?.screen || "hub"); };
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
  }, []);

  useEffect(() => { return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }); }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(USERS_REF(), (snap) => {
      const d = snap.exists() ? snap.data() : {};
      setUsersDoc(d);
      if (d.lui === user.uid) setRole("lui");
      else if (d.lei === user.uid) setRole("lei");
      else setRole(null);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !role) return;
    return onSnapshot(DOC_REF(), (snap) => {
      if (snap.exists()) {
        const nd = { ...EMPTY, ...snap.data() };
        if (prevRef.current && loaded) {
          const p = prevRef.current;
          const o = role === "lui" ? "Lei" : "Lui";
          if (nd.movies.length > p.movies.length) { const a = nd.movies.find(m => !p.movies.includes(m)); if (a) showT(`${o} ha aggiunto "${a}" 🎬`); }
          if (nd.watched.length > p.watched.length) { const a = nd.watched.find(w => !p.watched.some(pw => pw.title === w.title)); if (a) showT(`${o} ha segnato "${a.title}" come visto ✅`); }
          if ((nd.wishlist||[]).length > (p.wishlist||[]).length) { const a = nd.wishlist.find(w => !(p.wishlist||[]).some(pw => pw.id === w.id)); if (a) showT(`${o} ha aggiunto "${a.title}" alla wishlist 💫`); }
        }
        prevRef.current = nd;
        setData(nd);
      }
      setLoaded(true);
    });
  }, [user, role, loaded]);

  const showT = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };
  const save = useCallback((d) => { setData(d); prevRef.current = d; setDoc(DOC_REF(), d, { merge: true }).catch(console.error); }, []);
  const login = async () => { tap(); try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };
  const pickRole = async (r) => { tap(); await setDoc(USERS_REF(), { ...usersDoc, [r]: user.uid, [`${r}Name`]: user.displayName, [`${r}Photo`]: user.photoURL }, { merge: true }); setRole(r); const s = await getDoc(DOC_REF()); if (!s.exists()) await setDoc(DOC_REF(), EMPTY); };
  const logout = async () => { tap(); await signOut(auth); setRole(null); setLoaded(false); setScreen("hub"); };

  const bgGrad = `linear-gradient(170deg,${T.bg1} 0%,${T.bg2} 40%,${T.bg3} 100%)`;

  const [welcomed, setWelcomed] = useState(() => localStorage.getItem("covo-welcomed") === "1");
  const dismissWelcome = () => { setWelcomed(true); localStorage.setItem("covo-welcomed", "1"); };

  if (!welcomed) return <WelcomeOverlay onDone={dismissWelcome} />;
  if (authLoading) return <Skeleton />;

  if (!user) return (
    <ThemeCtx.Provider value={T}>
    <div style={{ ...S.authPage, background: bgGrad, animation: "fade-in 0.5s ease" }}>
      <div style={{ fontSize: 64, animation: "pop-in 0.6s ease" }}>🐙</div>
      <h1 style={S.hubTitle}>Covo di Cthulhu</h1>
      <p style={{ color: T.muted, margin: "8px 0 28px", fontSize: 14 }}>Accedi per entrare nel Covo</p>
      <button style={S.googleBtn} onClick={login}>
        <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10 }}><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.1 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 15.6 18.8 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.4 0-9.9-3.5-11.3-8.3l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>
        Accedi con Google
      </button>
    </div>
    </ThemeCtx.Provider>
  );

  if (!role) return (
    <ThemeCtx.Provider value={T}>
    <div style={{ ...S.authPage, background: bgGrad, animation: "fade-in 0.5s ease" }}>
      <img src={user.photoURL} alt="" style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${T.accent2}` }} />
      <p style={{ color: T.text, margin: "12px 0 4px", fontWeight: 700 }}>Ciao {user.displayName}!</p>
      <p style={{ color: T.muted, fontSize: 13, margin: "0 0 20px" }}>Chi sei nel Covo?</p>
      <div style={{ display: "flex", gap: 16 }}>
        <button style={{ ...S.roleBtn, opacity: usersDoc?.lui && usersDoc.lui !== user.uid ? 0.3 : 1, animation: "pop-in 0.4s ease 0.1s both" }} disabled={usersDoc?.lui && usersDoc.lui !== user.uid} onClick={() => pickRole("lui")}><span style={{ fontSize: 32 }}>{usersDoc?.luiEmoji || "🙋‍♂️"}</span><span>Lui</span></button>
        <button style={{ ...S.roleBtn, opacity: usersDoc?.lei && usersDoc.lei !== user.uid ? 0.3 : 1, animation: "pop-in 0.4s ease 0.2s both" }} disabled={usersDoc?.lei && usersDoc.lei !== user.uid} onClick={() => pickRole("lei")}><span style={{ fontSize: 32 }}>{usersDoc?.leiEmoji || "🙋‍♀️"}</span><span>Lei</span></button>
      </div>
      <button style={{ ...S.linkBtn, marginTop: 20 }} onClick={logout}>Cambia account</button>
    </div>
    </ThemeCtx.Provider>
  );

  if (!loaded) return <Skeleton />;

  const myEmoji = usersDoc?.[`${role}Emoji`] || (role === "lui" ? "🙋‍♂️" : "🙋‍♀️");
  const myColor = usersDoc?.[`${role}Color`] || T.accent2;
  const otherRole = role === "lui" ? "lei" : "lui";
  const otherEmoji = usersDoc?.[`${otherRole}Emoji`] || (otherRole === "lui" ? "🙋‍♂️" : "🙋‍♀️");

  const screenProps = { data, save, role, myEmoji, otherEmoji, usersDoc };

  const settingsProps = { settingsOpen, setSettingsOpen, theme, toggleTheme, soundOn, toggleSound, T };

  if (screen === "hub") return <ThemeCtx.Provider value={T}><Toast msg={toast} /><SettingsPanel {...settingsProps} /><Hub onGo={navigate} {...screenProps} user={user} logout={logout} /></ThemeCtx.Provider>;

  return (
    <ThemeCtx.Provider value={T}><Toast msg={toast} /><SettingsPanel {...settingsProps} /><div style={{ ...S.page, background: bgGrad, color: T.text }} key={screen}><div style={{ animation: `${animDir} 0.3s ease` }}>
      <button style={S.backBtn} onClick={() => { goBack(); window.history.back(); }}>← Covo</button>
      {screen === "movies" && <MovieList {...screenProps} />}
      {screen === "wheel" && <Wheel movies={data.movies} />}
      {screen === "watched" && <Watched {...screenProps} />}
      {screen === "planner" && <Planner {...screenProps} />}
      {screen === "reviews" && <Reviews {...screenProps} />}
      {screen === "wishlist" && <Wishlist {...screenProps} />}
      {screen === "gusti" && <Gusti {...screenProps} />}
      {screen === "pigiami" && <Pigiami {...screenProps} />}
      {screen === "achievements" && <Achievements data={data} />}
      {screen === "calendar" && <Calendar data={data} />}
      {screen === "stats" && <Stats {...screenProps} />}
      {screen === "profilo" && <Profile role={role} usersDoc={usersDoc} />}
    </div></div></ThemeCtx.Provider>
  );
}

/* ═══ SETTINGS PANEL ═══ */
function SettingsPanel({ settingsOpen, setSettingsOpen, theme, toggleTheme, soundOn, toggleSound, T }) {
  return (
    <>
      {/* Floating gear button */}
      <button onClick={() => { tap(); setSettingsOpen(!settingsOpen); }} style={{
        position: "fixed", bottom: 20, left: 20, zIndex: 1000,
        width: 44, height: 44, borderRadius: "50%",
        background: settingsOpen ? T.accent1 : `${T.accent1}22`,
        border: `1px solid ${T.accent1}44`,
        color: settingsOpen ? T.bg1 : T.accent1,
        fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.2s ease",
        boxShadow: `0 2px 12px ${T.bg1}88`,
      }}>⚙️</button>

      {/* Panel */}
      {settingsOpen && (
        <div style={{
          position: "fixed", bottom: 72, left: 20, zIndex: 999,
          padding: "16px 20px", borderRadius: 16,
          background: theme === "dark" ? "#132e1a" : "#e8e6df",
          border: `1px solid ${T.border}`,
          boxShadow: `0 8px 32px ${T.bg1}cc`,
          display: "flex", flexDirection: "column", gap: 14,
          animation: "pop-in 0.25s ease",
          minWidth: 200,
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 2 }}>⚙️ Impostazioni</div>

          {/* Sound toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: T.text }}>🔊 Suoni</span>
            <button onClick={toggleSound} style={{
              width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
              background: soundOn ? T.accent2 : `${T.muted}44`,
              position: "relative", transition: "background 0.2s",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3,
                left: soundOn ? 25 : 3,
                transition: "left 0.2s ease",
              }} />
            </button>
          </div>

          {/* Theme toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: T.text }}>{theme === "dark" ? "🌙" : "☀️"} Tema {theme === "dark" ? "scuro" : "chiaro"}</span>
            <button onClick={toggleTheme} style={{
              width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
              background: theme === "light" ? T.accent1 : `${T.muted}44`,
              position: "relative", transition: "background 0.2s",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3,
                left: theme === "light" ? 25 : 3,
                transition: "left 0.2s ease",
              }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══ WELCOME ANIMATION ═══ */
const LOVECRAFT_QUOTES = [
  "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
  "Nella sua dimora a R'lyeh, il morto Cthulhu attende sognando",
  "Non è morto ciò che in eterno può attendere",
  "Benvenuti nel Covo... 🐙",
];

function WelcomeOverlay({ onDone }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => setPhase(3), 3200);
    const t4 = setTimeout(() => { onDone(); }, 4800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0a1f16", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }} onClick={onDone}>
      <style>{`
        @keyframes welcome-eye { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes welcome-title { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes welcome-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes welcome-out { to { opacity: 0; transform: scale(1.1); } }
      `}</style>
      <div style={{ fontSize: 80, animation: phase >= 0 ? "welcome-eye 0.8s ease forwards" : "none", opacity: 0 }}>🐙</div>
      {phase >= 1 && <h1 style={{ fontSize: 32, fontWeight: 900, background: "linear-gradient(135deg,#00b894,#f0a500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "welcome-title 0.6s ease forwards" }}>Covo di Cthulhu</h1>}
      {phase >= 2 && <p style={{ fontSize: 14, color: "#7c8a6d", textAlign: "center", maxWidth: 280, animation: "welcome-fade 0.8s ease forwards", fontStyle: "italic" }}>{LOVECRAFT_QUOTES[Math.floor(Math.random() * LOVECRAFT_QUOTES.length)]}</p>}
      {phase >= 3 && <div style={{ animation: "welcome-out 1.5s ease forwards", position: "absolute", inset: 0, background: "#0a1f16" }} />}
      {phase >= 2 && <p style={{ position: "absolute", bottom: 40, fontSize: 11, color: "#4a6a3e", animation: "welcome-fade 0.5s ease" }}>Tocca per continuare</p>}
    </div>
  );
}

/* ═══ HUB ═══ */
function Hub({ onGo, data, save, role, user, usersDoc, logout, myEmoji }) {
  const T = useContext(ThemeCtx);
  const { movies, watched, plans, anniversary } = data;
  const [glow, setGlow] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [sugg, setSugg] = useState(null);
  const [slotAnim, setSlotAnim] = useState(false);
  const [pressedCard, setPressedCard] = useState(null);
  const [eyeTaps, setEyeTaps] = useState(0);
  const [easterEgg, setEasterEgg] = useState(false);
  const eyeTimer = useRef(null);
  useEffect(() => { const t = setTimeout(() => setGlow(true), 300); return () => clearTimeout(t); }, []);
  const setAnniv = (d) => { save({ ...data, anniversary: d }); setEditingDate(false); };
  const handleEyeTap = () => {
    haptic(5);
    const n = eyeTaps + 1;
    setEyeTaps(n);
    clearTimeout(eyeTimer.current);
    if (n >= 5) {
      setEasterEgg(true); setEyeTaps(0); playSound();
      setTimeout(() => setEasterEgg(false), 3000);
    } else {
      eyeTimer.current = setTimeout(() => setEyeTaps(0), 1500);
    }
  };

  const randomSugg = () => {
    tap(); playSound(); setSlotAnim(true); setSugg(null);
    setTimeout(() => { playSound(); haptic(30); setSugg({ act: rnd(RAND_ACT), food: rnd(RAND_FOOD), drink: rnd(RAND_DRINK), movie: movies.length > 0 ? rnd(movies) : null }); setSlotAnim(false); }, 800);
  };

  let ai = null;
  if (anniversary) {
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [ay, am, ad] = anniversary.split("-").map(Number);
    const fM = () => { let c = new Date(today.getFullYear(), today.getMonth(), ad); if (c <= today) c = new Date(today.getFullYear(), today.getMonth() + 1, ad); if (c.getDate() !== ad) c = new Date(today.getFullYear(), today.getMonth() + 2, ad); return c; };
    const fA = () => { let c = new Date(today.getFullYear(), am - 1, ad); if (c <= today) c = new Date(today.getFullYear() + 1, am - 1, ad); return c; };
    const dd = (d) => Math.ceil((d - today) / 86400000);
    const tm = (today.getFullYear() - ay) * 12 + (today.getMonth() - (am - 1));
    ai = { dM: dd(fM()), dA: dd(fA()), y: Math.floor(tm / 12), m: tm % 12 };
  }
  const oR = role === "lui" ? "lei" : "lui";
  const oN = usersDoc?.[`${oR}Name`];
  const myColor = usersDoc?.[`${role}Color`] || T.accent2;

  const nextPlan = plans.filter(p => { const d = daysUntil(p.date); return d !== null && d >= 0; }).sort((a,b) => (daysUntil(a.date)||0) - (daysUntil(b.date)||0))[0];
  const nextDays = nextPlan ? daysUntil(nextPlan.date) : null;

  // Achievements count
  const achs = getAchievements(data);
  const achsDone = achs.filter(a => a.done).length;

  const cardSubs = {
    movies: `${movies.length} film`, wheel: movies.length < 2 ? "min. 2 film" : "Pronto!",
    watched: `${watched.length} visti`, planner: `${plans.length} serate`,
    reviews: `${Object.keys(data.reviews||{}).length} recensioni`,
    wishlist: `${(data.wishlist||[]).filter(w=>w.done).length}/${(data.wishlist||[]).length}`,
    gusti: `${(data.gusti||[]).length} gusti`, pigiami: `${(data.pigiami||[]).length} pigiami`,
    achievements: `${achsDone}/${achs.length}`,
    calendar: "Vista mese",
    stats: "Panoramica",
  };

  const annivDM = useCountUp(ai && ai.dM !== 0 ? ai.dM : 0, 1000);
  const annivDA = useCountUp(ai && ai.dA !== 0 ? ai.dA : 0, 1200);
  const bgGrad = `linear-gradient(170deg,${T.bg1} 0%,${T.bg2} 40%,${T.bg3} 100%)`;

  return (
    <div style={{ ...S.hub, background: bgGrad, color: T.text }}>
      <style>{`
        @keyframes orbit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes counter-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes orbit-glow { 0%,100% { box-shadow: 0 0 30px ${T.accent1}44; } 50% { box-shadow: 0 0 50px ${T.accent1}55, 0 0 80px ${T.accent2}22; } }
        @keyframes aurora { 0% { transform: translate(-50%,-50%) scale(1); opacity:0.3; } 33% { transform: translate(-45%,-55%) scale(1.1); opacity:0.45; } 66% { transform: translate(-55%,-48%) scale(0.95); opacity:0.35; } 100% { transform: translate(-50%,-50%) scale(1); opacity:0.3; } }
        @keyframes slot-spin { 0% { transform: translateY(0); opacity:1; } 30% { transform: translateY(-20px); opacity:0; } 70% { transform: translateY(20px); opacity:0; } 100% { transform: translateY(0); opacity:1; } }
        @keyframes card-glow { 0% { box-shadow: 0 0 0 ${T.accent1}00; } 50% { box-shadow: 0 0 20px ${T.accent1}33, inset 0 0 15px ${T.accent1}0d; } 100% { box-shadow: 0 0 0 ${T.accent1}00; } }
      `}</style>

      {/* User bar + theme toggle + profile */}
      <div style={{ ...S.userBar, animation: "fade-in 0.4s ease" }}>
        <AvatarDisplay role={role} usersDoc={usersDoc} size={36} fontSize={20} onClick={() => { tap(); onGo("profilo"); }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{getGreeting()}, {user.displayName?.split(" ")[0]} <span style={{ color: myColor, fontSize: 11 }}>({role})</span></div>
          {oN && <div style={{ fontSize: 11, color: T.muted }}>con {oN} 💜</div>}
        </div>
        <button style={S.linkBtn} onClick={logout}>Esci</button>
      </div>

      {/* Anniversary */}
      <div style={{ ...S.annivBanner, background: `${T.accent1}0a`, border: `1px solid ${T.accent1}1f`, animation: "fade-in 0.5s ease 0.1s both" }}>
        {!anniversary || editingDate ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, color: T.accent1 }}>💜 Quando è il vostro anniversario?</span><input type="date" style={{ ...S.input, textAlign: "center", maxWidth: 200 }} defaultValue={anniversary || ""} onChange={(e) => e.target.value && setAnniv(e.target.value)} /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 11, color: T.muted, cursor: "pointer" }} onClick={() => setEditingDate(true)}>💜 Insieme da {ai.y > 0 ? `${ai.y} ann${ai.y > 1 ? "i" : "o"} e ` : ""}{ai.m} mes{ai.m !== 1 ? "i" : "e"} · ✏️</div>
            <div style={S.annivCd}>
              <div style={S.annivBox}><div style={{ ...S.annivNum, color: T.accent1 }}>{ai.dM === 0 ? "🎉" : annivDM}</div><div style={{ ...S.annivLbl, color: T.muted }}>{ai.dM === 0 ? "Mesiversario!" : `giorn${ai.dM !== 1 ? "i" : "o"} al mesiversario`}</div></div>
              <div style={S.annivDiv} />
              <div style={S.annivBox}><div style={{ ...S.annivNum, color: T.accent2 }}>{ai.dA === 0 ? "🎉" : annivDA}</div><div style={{ ...S.annivLbl, color: T.muted }}>{ai.dA === 0 ? "Anniversario!" : `giorn${ai.dA !== 1 ? "i" : "o"} all'anniversario`}</div></div>
            </div>
          </div>
        )}
      </div>

      {nextPlan && (
        <div style={{ ...S.nextPlanBanner, animation: "fade-in 0.5s ease 0.15s both" }} onClick={() => onGo("planner")}>
          <div style={{ fontSize: 11, color: T.accent2, fontWeight: 700 }}>🕯️ Prossima serata {nextDays === 0 ? "— STASERA!" : nextDays === 1 ? "— domani!" : `tra ${nextDays} giorni`}</div>
          <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>📅 {nextPlan.date}{nextPlan.time ? ` · 🕐 ${nextPlan.time}` : ""}{nextPlan.activity && ` · 🎭 ${nextPlan.activity}`}</div>
        </div>
      )}

      <TentacleSep />

      {easterEgg && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, animation: "fade-in 0.3s ease" }} onClick={() => setEasterEgg(false)}>
          <div style={{ fontSize: 80, animation: "pop-in 0.5s ease" }}>🐙</div>
          <p style={{ color: "#00b894", fontSize: 16, fontWeight: 800, animation: "fade-in 0.5s ease 0.2s both", textAlign: "center", padding: "0 20px" }}>{LOVECRAFT_QUOTES[Math.floor(Math.random() * LOVECRAFT_QUOTES.length)]}</p>
          <p style={{ color: "#f0a500", fontSize: 11, animation: "fade-in 0.5s ease 0.5s both" }}>Hai risvegliato Cthulhu!</p>
        </div>
      )}
      <div style={{ ...S.eyeWrap, opacity: glow ? 1 : 0, transform: glow ? "scale(1)" : "scale(0.7)", cursor: "pointer" }} onClick={handleEyeTap}>
        <div style={{ position: "absolute", width: 180, height: 180, left: "50%", top: "50%", borderRadius: "50%", background: `radial-gradient(ellipse, ${T.accent2}4d 0%, ${T.accent1}26 40%, transparent 70%)`, animation: "aurora 8s ease-in-out infinite", filter: "blur(20px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 130, height: 130, animation: "orbit-spin 12s linear infinite" }}>
          {[...Array(8)].map((_, i) => <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: 3, height: 58, background: `linear-gradient(to bottom,${T.accent2},transparent)`, transformOrigin: "top center", borderRadius: 3, opacity: 0.55, transform: `rotate(${i*45}deg)` }} />)}
        </div>
        <div style={{ position: "absolute", width: 90, height: 90, animation: "counter-spin 18s linear infinite", opacity: 0.3 }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: 2, height: 40, background: `linear-gradient(to bottom,${T.accent1}80,transparent)`, transformOrigin: "top center", borderRadius: 2, transform: `rotate(${i*60}deg)` }} />)}
        </div>
        <div style={{ ...S.eye, background: `radial-gradient(circle,${T.accent2} 0%,${T.accent2}66 60%,${T.bg1} 100%)`, animation: "orbit-glow 5s ease-in-out infinite" }}><div style={{ ...S.pupil, background: T.bg1 }} /></div>
      </div>

      <h1 style={S.hubTitle}>Covo di Cthulhu</h1>
      <p style={{ ...S.hubSub, color: T.muted }}>{movies.length} film · {watched.length} visti · {plans.length} serate</p>

      <TentacleSep />

      <button style={{ ...S.suggBtn, borderColor: `${T.accent1}4d`, background: `${T.accent1}0f`, color: T.accent1, animation: "fade-in 0.4s ease 0.2s both" }} onClick={randomSugg}>
        {slotAnim ? "🎰 Girando..." : "🎲 Stasera cosa facciamo?"}
      </button>
      {slotAnim && <div style={{ ...S.suggCard, textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: 28 }}>{["🎭", "🍕", "🍷"].map((e, i) => <span key={i} style={{ animation: `slot-spin 0.4s ease ${i * 0.15}s infinite` }}>{e}</span>)}</div></div>}
      {sugg && !slotAnim && (
        <div style={{ ...S.suggCard, animation: "pop-in 0.4s ease" }}>
          <div style={{ fontWeight: 800, color: T.accent1, fontSize: 14, marginBottom: 6 }}>Proposta della serata:</div>
          {[{ icon: "🎭", text: sugg.act, delay: 0 }, { icon: "🍕", text: sugg.food, delay: 0.1 }, { icon: "🍷", text: sugg.drink, delay: 0.2 }, ...(sugg.movie ? [{ icon: "🎬", text: sugg.movie, delay: 0.3 }] : [])].map((item, i) => (
            <div key={i} style={{ animation: `fade-in 0.3s ease ${item.delay}s both` }}>{item.icon} {item.text}</div>
          ))}
          <button style={{ ...S.suggBtn, marginTop: 8, fontSize: 12, padding: "8px 0", borderColor: `${T.accent1}4d`, background: `${T.accent1}0f`, color: T.accent1 }} onClick={randomSugg}>🔄 Altra proposta</button>
        </div>
      )}

      <div style={S.grid}>
        {SECTIONS.map((s, i) => (
          <button key={s.id} style={{ ...S.card, border: `1px solid ${T.accent1}1f`, background: T.card, color: T.text, animation: `pop-in 0.35s ease ${0.1 + i * 0.05}s both`, ...(pressedCard === s.id ? { animation: "card-glow 0.6s ease" } : {}) }}
            onClick={() => { setPressedCard(s.id); setTimeout(() => { setPressedCard(null); onGo(s.id); }, 250); }}>
            <span style={S.cardIcon}>{s.icon}</span>
            <span style={S.cardLbl}>{s.label}</span>
            <span style={{ fontSize: 10, color: T.muted, marginTop: -2 }}>{cardSubs[s.id]}</span>
          </button>
        ))}
      </div>
      <p style={{ ...S.footer, color: `${T.muted}66` }}>Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn 🐙</p>
    </div>
  );
}

/* ═══ AVATAR HELPERS ═══ */
function resizeImage(file, maxSize = 128) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = maxSize; canvas.height = maxSize;
        const ctx = canvas.getContext("2d");
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2, sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function AvatarDisplay({ role, usersDoc, size = 36, fontSize = 20, onClick, style = {} }) {
  const T = useContext(ThemeCtx);
  const avatar = usersDoc?.[`${role}Avatar`];
  const emoji = usersDoc?.[`${role}Emoji`] || (role === "lui" ? "🙋‍♂️" : "🙋‍♀️");
  const color = usersDoc?.[`${role}Color`] || T.accent2;
  if (avatar) {
    return <img src={avatar} alt="" onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${color}`, objectFit: "cover", cursor: onClick ? "pointer" : "default", ...style }} />;
  }
  return <div onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize, cursor: onClick ? "pointer" : "default", ...style }}>{emoji}</div>;
}

/* ═══ PROFILE SETTINGS ═══ */
function Profile({ role, usersDoc }) {
  const T = useContext(ThemeCtx);
  const myEmoji = usersDoc?.[`${role}Emoji`] || (role === "lui" ? "🙋‍♂️" : "🙋‍♀️");
  const myColor = usersDoc?.[`${role}Color`] || T.accent2;
  const myAvatar = usersDoc?.[`${role}Avatar`] || null;
  const fileRef = useRef(null);

  const setEmoji = async (e) => { tap(); await setDoc(USERS_REF(), { ...usersDoc, [`${role}Emoji`]: e, [`${role}Avatar`]: null }, { merge: true }); };
  const setColor = async (c) => { tap(); await setDoc(USERS_REF(), { ...usersDoc, [`${role}Color`]: c }, { merge: true }); };
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    tap(); playSound();
    const base64 = await resizeImage(file, 128);
    await setDoc(USERS_REF(), { ...usersDoc, [`${role}Avatar`]: base64 }, { merge: true });
  };
  const removeAvatar = async () => { tap(); await setDoc(USERS_REF(), { ...usersDoc, [`${role}Avatar`]: null }, { merge: true }); };

  return (
    <div style={S.sec}>
      <h2 style={{ ...S.secTitle, color: T.accent1 }}>⚙️ Il Mio Profilo</h2>

      {/* Avatar preview */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <AvatarDisplay role={role} usersDoc={usersDoc} size={80} fontSize={48} />
        <p style={{ fontWeight: 700, color: T.text }}>{usersDoc?.[`${role}Name`]} <span style={{ color: myColor }}>({role})</span></p>
      </div>

      {/* Upload photo */}
      <h3 style={{ fontSize: 14, color: T.muted, margin: "8px 0 6px" }}>📷 Foto profilo</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
        <button style={{ ...S.bigBtn, flex: 1, fontSize: 13, padding: "10px 0" }} onClick={() => fileRef.current?.click()}>📷 Carica foto</button>
        {myAvatar && <button style={{ ...S.xBtn, width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={removeAvatar}>Rimuovi</button>}
      </div>

      <h3 style={{ fontSize: 14, color: T.muted, margin: "12px 0 6px" }}>oppure scegli un emoji</h3>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PROFILE_EMOJIS.map(e => (
          <button key={e} onClick={() => setEmoji(e)} style={{ ...S.emojiBtn, fontSize: 24, padding: "6px 10px", background: !myAvatar && myEmoji === e ? `${T.accent1}33` : "transparent", borderColor: !myAvatar && myEmoji === e ? T.accent1 : T.border }}>{e}</button>
        ))}
      </div>

      <h3 style={{ fontSize: 14, color: T.muted, margin: "12px 0 6px" }}>🎨 Scegli il tuo colore</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PROFILE_COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)} style={{ width: 36, height: 36, borderRadius: "50%", background: c, border: myColor === c ? "3px solid #fff" : "2px solid transparent", cursor: "pointer", transition: "transform 0.15s", transform: myColor === c ? "scale(1.2)" : "scale(1)" }} />
        ))}
      </div>
    </div>
  );
}

/* ═══ MOVIE LIST — with TMDB search + filters ═══ */
function MovieList({ data, save }) {
  const T = useContext(ThemeCtx);
  const [inp, setInp] = useState(""); const [cat, setCat] = useState("altro"); const [search, setSearch] = useState("");
  const [tmdbResults, setTmdbResults] = useState([]); const [tmdbLoading, setTmdbLoading] = useState(false);
  const [filterCat, setFilterCat] = useState("all"); const [sortBy, setSortBy] = useState("cat");
  const [detail, setDetail] = useState(null); const [detailLoading, setDetailLoading] = useState(false);
  const tmdbTimer = useRef(null);

  const fetchDetail = async (title) => {
    const key = TMDB_KEY;
    if (!key) return;
    tap(); setDetailLoading(true); setDetail({ title, loading: true });
    try {
      const q = title.replace(/\s*\(\d{4}\)\s*$/, "").trim();
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(q)}&language=it-IT&page=1`);
      const d = await res.json();
      if (d.results && d.results.length > 0) {
        const m = d.results[0];
        setDetail({ title, tmdb: m });
      } else {
        setDetail({ title, tmdb: null });
      }
    } catch (e) { setDetail({ title, tmdb: null }); }
    setDetailLoading(false);
  };

  const searchTMDB = (q) => {
    setInp(q);
    clearTimeout(tmdbTimer.current);
    if (q.trim().length < 2) { setTmdbResults([]); return; }
    tmdbTimer.current = setTimeout(async () => {
      const key = TMDB_KEY;
      if (!key) return;
      setTmdbLoading(true);
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(q)}&language=it-IT&page=1`);
        const d = await res.json();
        setTmdbResults((d.results || []).slice(0, 5));
      } catch (e) { setTmdbResults([]); }
      setTmdbLoading(false);
    }, 400);
  };

  const addMovie = (title) => { if (!title || data.movies.includes(title)) return; playSound(); haptic(); save({ ...data, movies: [...data.movies, title], categories: { ...(data.categories||{}), [title]: cat } }); setInp(""); setTmdbResults([]); };
  const addFromTmdb = (m) => { const title = `${m.title} (${(m.release_date||"").slice(0,4)})`; addMovie(title); };
  const rm = (m) => { tap(); const c = { ...(data.categories||{}) }; delete c[m]; save({ ...data, movies: data.movies.filter(x => x !== m), categories: c }); };
  const gc = (m) => CATEGORIES.find(c => c.id === ((data.categories||{})[m] || "altro")) || CATEGORIES[9];

  // Filter & sort
  let movies = data.movies.filter(m => m.toLowerCase().includes(search.toLowerCase()));
  if (filterCat !== "all") movies = movies.filter(m => ((data.categories||{})[m] || "altro") === filterCat);
  if (sortBy === "name") movies = [...movies].sort((a,b) => a.localeCompare(b));
  // Group by category
  const grouped = {}; movies.forEach(m => { const c = gc(m); if (!grouped[c.id]) grouped[c.id] = { cat: c, items: [] }; grouped[c.id].items.push(m); });

  const hasTmdbKey = true;

  return (
    <div style={S.sec}><h2 style={S.secTitle}>📋 Lista Film</h2>
      {/* Search & add */}
      {data.movies.length > 3 && <input style={S.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Cerca nella lista..." />}
      <div style={S.row}>
        <input style={S.input} value={inp} onChange={(e) => hasTmdbKey ? searchTMDB(e.target.value) : setInp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMovie(inp.trim())} placeholder={hasTmdbKey ? "🔍 Cerca su TMDB..." : "Aggiungi un film..."} />
        <button style={S.addBtn} onClick={() => addMovie(inp.trim())}>+</button>
      </div>

      {/* TMDB results */}
      {tmdbResults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tmdbResults.map(m => (
            <div key={m.id} onClick={() => addFromTmdb(m)} style={{ display: "flex", gap: 10, padding: "8px 12px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", animation: "fade-in 0.2s ease" }}>
              {m.poster_path && <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt="" style={{ width: 40, height: 60, borderRadius: 6, objectFit: "cover" }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{m.title} <span style={{ color: T.muted, fontWeight: 400 }}>({(m.release_date||"").slice(0,4)})</span></div>
                <div style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{m.overview || "Nessuna descrizione"}</div>
              </div>
              <span style={{ color: T.accent2, fontSize: 18, alignSelf: "center" }}>+</span>
            </div>
          ))}
        </div>
      )}
      {tmdbLoading && <p style={{ fontSize: 12, color: T.muted, textAlign: "center" }}>Cercando su TMDB...</p>}

      {/* Category select for new films */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{CATEGORIES.map(c => <button key={c.id} onClick={() => { tap(); setCat(c.id); }} style={{ ...S.catChip, background: cat === c.id ? c.color + "33" : "transparent", borderColor: cat === c.id ? c.color : "rgba(255,255,255,0.06)" }}>{c.icon} {c.label}</button>)}</div>

      {/* Filter & sort bar */}
      {data.movies.length > 3 && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select value={filterCat} onChange={e => { tap(); setFilterCat(e.target.value); }} style={{ ...S.input, flex: "none", width: "auto", fontSize: 12, padding: "6px 10px" }}>
            <option value="all">Tutti i generi</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
          <select value={sortBy} onChange={e => { tap(); setSortBy(e.target.value); }} style={{ ...S.input, flex: "none", width: "auto", fontSize: 12, padding: "6px 10px" }}>
            <option value="cat">Per categoria</option>
            <option value="name">Alfabetico</option>
          </select>
        </div>
      )}

      {movies.length === 0 && <p style={S.empty}>{search || filterCat !== "all" ? "Nessun risultato!" : "La lista è vuota!"}</p>}
      {sortBy === "cat" ? Object.values(grouped).map(({ cat: mc, items }) => (
        <div key={mc.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px 0 6px" }}>
            <span style={{ fontSize: 16 }}>{mc.icon}</span><span style={{ fontSize: 13, fontWeight: 700, color: mc.color }}>{mc.label}</span>
            <span style={{ fontSize: 10, color: "#7c8a6d" }}>({items.length})</span><div style={{ flex: 1, height: 1, background: mc.color + "33" }} />
          </div>
          {items.map((m, i) => <div key={m} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both`, borderLeft: `3px solid ${mc.color}`, cursor: hasTmdbKey ? "pointer" : "default" }} onClick={() => hasTmdbKey && fetchDetail(m)}><span style={S.itemText}>{m}</span>{hasTmdbKey && <span style={{ fontSize: 10, color: T.muted }}>ℹ️</span>}<button style={S.xBtn} onClick={(e) => { e.stopPropagation(); rm(m); }}>✕</button></div>)}
        </div>
      )) : movies.map((m, i) => { const mc = gc(m); return <div key={m} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both`, borderLeft: `3px solid ${mc.color}`, cursor: hasTmdbKey ? "pointer" : "default" }} onClick={() => hasTmdbKey && fetchDetail(m)}><span style={{ fontSize: 14 }}>{mc.icon}</span><span style={S.itemText}>{m}</span>{hasTmdbKey && <span style={{ fontSize: 10, color: T.muted }}>ℹ️</span>}<button style={S.xBtn} onClick={(e) => { e.stopPropagation(); rm(m); }}>✕</button></div>; })}
      <p style={S.count}>{data.movies.length} film in lista{filterCat !== "all" ? ` (${movies.length} filtrati)` : ""}</p>

      {/* Film detail modal */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fade-in 0.2s ease" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, maxHeight: "80vh", overflow: "auto", borderRadius: 20, background: T.bg1 === "#0a1f16" ? "#132e1a" : "#e8e6df", border: `1px solid ${T.border}`, padding: 20, animation: "pop-in 0.3s ease", display: "flex", flexDirection: "column", gap: 12 }}>
            {detail.loading && <p style={{ textAlign: "center", color: T.muted, padding: 20 }}>Cercando info... 🔍</p>}
            {!detail.loading && detail.tmdb && (
              <>
                {detail.tmdb.poster_path && <img src={`https://image.tmdb.org/t/p/w342${detail.tmdb.poster_path}`} alt="" style={{ width: "100%", borderRadius: 14, maxHeight: 300, objectFit: "cover" }} />}
                <h3 style={{ fontSize: 20, fontWeight: 900, color: T.text, margin: 0 }}>{detail.tmdb.title}</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {detail.tmdb.release_date && <span style={{ fontSize: 12, color: T.muted }}>📅 {detail.tmdb.release_date.slice(0, 4)}</span>}
                  {detail.tmdb.vote_average > 0 && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: `${T.accent1}22`, color: T.accent1 }}>⭐ {detail.tmdb.vote_average.toFixed(1)}/10</span>}
                  {detail.tmdb.original_language && <span style={{ fontSize: 12, color: T.muted }}>🌍 {detail.tmdb.original_language.toUpperCase()}</span>}
                </div>
                {detail.tmdb.overview && <p style={{ fontSize: 13, color: T.text, lineHeight: 1.5, margin: 0 }}>{detail.tmdb.overview}</p>}
                {!detail.tmdb.overview && <p style={{ fontSize: 13, color: T.muted }}>Nessuna descrizione disponibile</p>}
              </>
            )}
            {!detail.loading && !detail.tmdb && <p style={{ textAlign: "center", color: T.muted, padding: 20 }}>Nessun risultato trovato su TMDB per "{detail.title}"</p>}
            <button onClick={() => setDetail(null)} style={{ ...S.bigBtn, marginTop: 4 }}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ WHEEL ═══ */
function Wheel({ movies }) {
  const [rot, setRot] = useState(0); const [spinning, setSpinning] = useState(false); const [picked, setPicked] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const spin = () => {
    if (movies.length < 2 || spinning) return; tap(); playSound(); setSpinning(true); setPicked(null);
    const nr = rot + 1440 + Math.random() * 1440; setRot(nr);
    setTimeout(() => { const seg = 360/movies.length; const norm = nr%360; const idx = Math.floor(((360-norm+seg/2)%360)/seg)%movies.length; setPicked(movies[idx]); setSpinning(false); setConfettiKey(k=>k+1); playSound(); haptic(50); }, 3600);
  };
  const sz=280, cx=sz/2, cy=sz/2, r=sz/2-6, seg=movies.length?360/movies.length:360;
  const pol=(a,rd)=>{const d=((a-90)*Math.PI)/180;return[cx+rd*Math.cos(d),cy+rd*Math.sin(d)];};
  return (
    <div style={{ ...S.sec, alignItems: "center", position: "relative" }}><h2 style={S.secTitle}>🎰 Estrazione</h2>
      {movies.length < 2 ? <p style={S.empty}>Servono almeno 2 film!</p> : <>
        <div style={{ position: "relative" }}>
          <Confetti key={confettiKey} active={!!picked} />
          <div style={S.pointer}>▼</div>
          <svg width={sz} height={sz} style={{ transition: spinning?"transform 3.5s cubic-bezier(.17,.67,.12,.99)":"none", transform:`rotate(${rot}deg)` }}>
            {movies.map((m,i)=>{const a1=i*seg,a2=a1+seg;const[x1,y1]=pol(a1,r);const[x2,y2]=pol(a2,r);const lg=seg>180?1:0;const mid=a1+seg/2;const[tx,ty]=pol(mid,r*0.6);return<g key={i}><path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2} Z`} fill={hash(m)} stroke="#0a1f16" strokeWidth="2"/><text x={tx} y={ty} fill="#fff" fontSize={movies.length>8?8:10} fontWeight="700" textAnchor="middle" dominantBaseline="central" transform={`rotate(${mid},${tx},${ty})`}>{m.length>13?m.slice(0,11)+"…":m}</text></g>;})}
          </svg>
        </div>
        <button style={{ ...S.bigBtn, opacity: spinning?0.5:1 }} onClick={spin} disabled={spinning}>{spinning?"Girando...":"🐙 Estrai dal Covo!"}</button>
        {picked && <div style={{ ...S.pickedCard, animation: "pop-in 0.5s ease" }}><div style={S.pickedLbl}>Stasera guardiamo:</div><div style={S.pickedTxt}>{picked}</div></div>}
      </>}
    </div>
  );
}

/* ═══ WATCHED ═══ */
function Watched({ data, save }) {
  const T = useContext(ThemeCtx);
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState(null);
  const mw = (m) => { tap(); playSound(); save({ ...data, movies: data.movies.filter(x => x !== m), watched: [...data.watched, { title: m, date: new Date().toLocaleDateString("it-IT") }] }); };
  const uw = (t) => { tap(); save({ ...data, watched: data.watched.filter(w => w.title !== t), movies: [...data.movies, t] }); };

  const fetchDetail = async (title) => {
    tap(); setDetail({ title, loading: true });
    try {
      const q = title.replace(/\s*\(\d{4}\)\s*$/, "").trim();
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=it-IT&page=1`);
      const d = await res.json();
      setDetail({ title, tmdb: d.results?.[0] || null });
    } catch (e) { setDetail({ title, tmdb: null }); }
  };

  const months = {}; data.watched.forEach(w => { if (!w.date) return; const parts = w.date.split("/"); if (parts.length >= 2) { const key = `${parts[1]}/${parts[2]||parts[1]}`; months[key] = `${["","Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"][+parts[1]]||parts[1]} ${parts[2]||""}`; } });
  const monthKeys = Object.keys(months);
  const filtered = filter === "all" ? data.watched : data.watched.filter(w => { if (!w.date) return false; const p = w.date.split("/"); return `${p[1]}/${p[2]||p[1]}` === filter; });
  return (
    <div style={S.sec}><h2 style={S.secTitle}>✅ Già Visti</h2>
      {data.movies.length > 0 && <><p style={{ fontSize: 12, color: "#7c8a6d", margin: 0 }}>Segna come visto:</p><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{data.movies.map(m => <button key={m} style={S.chip} onClick={() => mw(m)}>{m} ✓</button>)}</div></>}
      {monthKeys.length > 1 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}><button onClick={() => setFilter("all")} style={{ ...S.catChip, background: filter==="all"?"rgba(0,184,148,0.2)":"transparent", borderColor: filter==="all"?"#00b894":"rgba(255,255,255,0.06)" }}>Tutti ({data.watched.length})</button>{monthKeys.map(k => <button key={k} onClick={() => setFilter(k)} style={{ ...S.catChip, background: filter===k?"rgba(0,184,148,0.2)":"transparent", borderColor: filter===k?"#00b894":"rgba(255,255,255,0.06)" }}>{months[k]}</button>)}</div>}
      {filtered.length === 0 && <p style={S.empty}>Nessun film visto{filter !== "all" ? " in questo periodo" : " ancora"}!</p>}
      {filtered.map((w, i) => { const rev = (data.reviews||{})[w.title]; return (
        <div key={i} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both`, flexDirection: "column", alignItems: "stretch", gap: 4, cursor: "pointer" }} onClick={() => fetchDetail(w.title)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>🎬</span><span style={S.itemText}>{w.title}</span>
            <span style={{ fontSize: 10, color: T.muted }}>ℹ️</span>
            <span style={{ fontSize: 11, color: "#7c8a6d" }}>{w.date}</span>
            <button style={S.xBtn} onClick={(e) => { e.stopPropagation(); uw(w.title); }}>↩</button>
          </div>
          {rev && <div style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: 26, fontSize: 11, color: "#7c8a6d" }}>{rev.avg !== undefined && <span style={{ ...S.scoreBadge, fontSize: 11, padding: "1px 6px" }}>{rev.avg}/10</span>}{rev.lui !== undefined && <span>🙋‍♂️ {rev.lui}</span>}{rev.lei !== undefined && <span>🙋‍♀️ {rev.lei}</span>}</div>}
        </div>); })}

      {/* Film detail modal */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fade-in 0.2s ease" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, maxHeight: "80vh", overflow: "auto", borderRadius: 20, background: T.bg1 === "#0a1f16" ? "#132e1a" : "#e8e6df", border: `1px solid ${T.border}`, padding: 20, animation: "pop-in 0.3s ease", display: "flex", flexDirection: "column", gap: 12 }}>
            {detail.loading && <p style={{ textAlign: "center", color: T.muted, padding: 20 }}>Cercando info... 🔍</p>}
            {!detail.loading && detail.tmdb && (
              <>
                {detail.tmdb.poster_path && <img src={`https://image.tmdb.org/t/p/w342${detail.tmdb.poster_path}`} alt="" style={{ width: "100%", borderRadius: 14, maxHeight: 300, objectFit: "cover" }} />}
                <h3 style={{ fontSize: 20, fontWeight: 900, color: T.text, margin: 0 }}>{detail.tmdb.title}</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {detail.tmdb.release_date && <span style={{ fontSize: 12, color: T.muted }}>📅 {detail.tmdb.release_date.slice(0, 4)}</span>}
                  {detail.tmdb.vote_average > 0 && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: `${T.accent1}22`, color: T.accent1 }}>⭐ {detail.tmdb.vote_average.toFixed(1)}/10</span>}
                  {detail.tmdb.original_language && <span style={{ fontSize: 12, color: T.muted }}>🌍 {detail.tmdb.original_language.toUpperCase()}</span>}
                </div>
                {detail.tmdb.overview && <p style={{ fontSize: 13, color: T.text, lineHeight: 1.5, margin: 0 }}>{detail.tmdb.overview}</p>}
              </>
            )}
            {!detail.loading && !detail.tmdb && <p style={{ textAlign: "center", color: T.muted, padding: 20 }}>Nessun risultato trovato su TMDB per "{detail.title}"</p>}
            <button onClick={() => setDetail(null)} style={{ ...S.bigBtn, marginTop: 4 }}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ PLANNER ═══ */
function Planner({ data, save }) {
  const [f, sF] = useState({ date:"", time:"", movie:"", activity:"", place:"", food:"", drink:"", note:"" });
  const add = () => { if (!f.date) return; tap(); playSound(); save({ ...data, plans: [...data.plans, { ...f, id: Date.now() }] }); sF({ date:"", time:"", movie:"", activity:"", place:"", food:"", drink:"", note:"" }); };
  const rm = (id) => { tap(); save({ ...data, plans: data.plans.filter(p => p.id !== id) }); };
  const future = data.plans.filter(p => { const d = daysUntil(p.date); return d !== null && d >= 0; }).sort((a,b) => (daysUntil(a.date)||0)-(daysUntil(b.date)||0));
  const past = data.plans.filter(p => { const d = daysUntil(p.date); return d !== null && d < 0; }).sort((a,b) => (daysUntil(b.date)||0)-(daysUntil(a.date)||0));
  const unknown = data.plans.filter(p => daysUntil(p.date) === null);
  const renderPlan = (p, i, showCd) => { const d = daysUntil(p.date); return (
    <div key={p.id} style={{ ...S.planCard, animation: `fade-in 0.3s ease ${i*0.05}s both` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, color: "#f0a500" }}>📅 {p.date}{p.time?` · 🕐 ${p.time}`:""}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {showCd && d !== null && d >= 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: d===0?"rgba(0,184,148,0.25)":"rgba(240,165,0,0.15)", color: d===0?"#00b894":"#f0a500" }}>{d===0?"OGGI!":d===1?"Domani":`tra ${d}g`}</span>}
          <button style={S.xBtn} onClick={() => rm(p.id)}>✕</button>
        </div>
      </div>
      {p.movie&&<div>🎬 {p.movie}</div>}{p.activity&&<div>🎭 {p.activity}</div>}{p.place&&<div>📍 {p.place}</div>}{p.food&&<div>🍕 {p.food}</div>}{p.drink&&<div>🍷 {p.drink}</div>}{p.note&&<div style={{ fontSize: 12, color: "#7c8a6d", fontStyle: "italic" }}>"{p.note}"</div>}
    </div>); };
  return (
    <div style={S.sec}><h2 style={S.secTitle}>🕯️ Date Night Planner</h2>
      <div style={S.formGroup}>
        <div style={{ display: "flex", gap: 8 }}><input type="date" style={S.input} value={f.date} onChange={e => sF({...f, date:e.target.value})} /><input type="time" style={{ ...S.input, maxWidth: 120 }} value={f.time} onChange={e => sF({...f, time:e.target.value})} /></div>
        <select style={S.input} value={f.movie} onChange={e => sF({...f, movie:e.target.value})}><option value="">🎬 Film (opzionale)</option>{data.movies.map(m => <option key={m}>{m}</option>)}</select>
        <input style={S.input} placeholder="🎭 Attività" value={f.activity} onChange={e => sF({...f, activity:e.target.value})} />
        <input style={S.input} placeholder="📍 Dove" value={f.place} onChange={e => sF({...f, place:e.target.value})} />
        <input style={S.input} placeholder="🍕 Cibo" value={f.food} onChange={e => sF({...f, food:e.target.value})} />
        <input style={S.input} placeholder="🍷 Bevande" value={f.drink} onChange={e => sF({...f, drink:e.target.value})} />
        <input style={S.input} placeholder="📝 Note..." value={f.note} onChange={e => sF({...f, note:e.target.value})} />
        <button style={S.bigBtn} onClick={add}>+ Pianifica Serata</button>
      </div>
      {future.length > 0 && <h3 style={{ fontSize: 14, color: "#00b894", margin: "8px 0 4px" }}>🔜 Prossime serate</h3>}
      {future.map((p, i) => renderPlan(p, i, true))}
      {(past.length > 0 || unknown.length > 0) && <h3 style={{ fontSize: 14, color: "#7c8a6d", margin: "8px 0 4px" }}>📖 Serate passate</h3>}
      {[...past, ...unknown].map((p, i) => renderPlan(p, i, false))}
      {data.plans.length === 0 && <p style={S.empty}>Nessuna serata pianificata!</p>}
    </div>
  );
}

/* ═══ REVIEWS ═══ */
function Reviews({ data, save, role, myEmoji }) {
  const T = useContext(ThemeCtx);
  const [sel, setSel] = useState(""); const [score, setScore] = useState(7); const [comment, setComment] = useState("");
  const all = [...new Set([...data.movies, ...data.watched.map(w => w.title)])];
  const add = () => { if (!sel) return; tap(); playSound(); const ex = data.reviews[sel]||{}; save({ ...data, reviews: { ...data.reviews, [sel]: { ...ex, [role]: score, [`${role}Comment`]: comment, avg: +((score + (ex[role==="lui"?"lei":"lui"]||score))/2).toFixed(1), date: new Date().toLocaleDateString("it-IT") } } }); setSel(""); setComment(""); };
  const rev = Object.entries(data.reviews||{}).sort((a,b) => (b[1].avg||0)-(a[1].avg||0));
  const best = rev.length > 0 ? rev[0] : null;
  const unanimi = rev.filter(([, r]) => r.lui !== undefined && r.lei !== undefined && Math.abs(r.lui - r.lei) <= 1);
  return (
    <div style={S.sec}><h2 style={S.secTitle}>📝 Recensioni</h2>
      {(best || unanimi.length > 0) && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {best && best[1].avg >= 1 && <div style={{ flex: 1, minWidth: 140, padding: "10px 12px", background: `${T.accent1}14`, border: `1px solid ${T.accent1}26`, borderRadius: 12 }}><div style={{ fontSize: 10, color: T.muted }}>👑 Miglior Film</div><div style={{ fontSize: 14, fontWeight: 800, color: T.accent1 }}>{best[0]}</div><div style={{ fontSize: 12, color: T.text }}>{best[1].avg}/10</div></div>}
        {unanimi.length > 0 && <div style={{ flex: 1, minWidth: 140, padding: "10px 12px", background: `${T.accent2}14`, border: `1px solid ${T.accent2}26`, borderRadius: 12 }}><div style={{ fontSize: 10, color: T.muted }}>🤝 Unanimi ({unanimi.length})</div><div style={{ fontSize: 12, color: T.text }}>{unanimi.slice(0,3).map(([t])=>t).join(", ")}</div></div>}
      </div>}
      <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>Recensisci come <strong style={{ color: T.accent1 }}>{myEmoji} {role}</strong></p>
      <div style={S.formGroup}>
        <select style={S.input} value={sel} onChange={e => setSel(e.target.value)}><option value="">— Scegli film —</option>{all.map(m => <option key={m}>{m}</option>)}</select>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><label style={{ fontSize: 13, width: 60 }}>{myEmoji} Voto</label><input type="range" min="1" max="10" value={score} onChange={e => setScore(+e.target.value)} style={{ flex: 1 }} /><span style={S.scoreBadge}>{score}</span></div>
        <input style={S.input} placeholder="Un commento..." value={comment} onChange={e => setComment(e.target.value)} />
        <button style={S.bigBtn} onClick={add}>📝 Salva Recensione</button>
      </div>
      {rev.length === 0 && <p style={S.empty}>Nessuna recensione!</p>}
      {rev.map(([t, r], i) => { const isU = r.lui !== undefined && r.lei !== undefined && Math.abs(r.lui - r.lei) <= 1; return (
        <div key={t} style={{ ...S.reviewCard, animation: `fade-in 0.3s ease ${i*0.05}s both` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontWeight: 700, fontSize: 14 }}>{t}</span>{isU && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: `${T.accent2}33`, color: T.accent2, fontWeight: 700 }}>🤝 Unanimi!</span>}</div>
            <span style={{ ...S.scoreBadge, fontSize: 16, background: r.avg>=7?"rgba(76,175,80,.25)":r.avg>=5?"rgba(255,193,7,.25)":"rgba(233,69,96,.25)", color: r.avg>=7?"#81c784":r.avg>=5?"#ffd54f":"#e94560" }}>{r.avg}/10</span>
          </div>
          <div style={{ fontSize: 12, display: "flex", gap: 12 }}>{r.lui!==undefined&&<span>🙋‍♂️ {r.lui}/10</span>}{r.lei!==undefined&&<span>🙋‍♀️ {r.lei}/10</span>}<span style={{ color: T.muted }}>{r.date}</span></div>
          {r.lui !== undefined && r.lei !== undefined && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}><span style={{ fontSize: 10 }}>🙋‍♂️</span><div style={{ flex: 1, height: 6, borderRadius: 3, overflow: "hidden", background: T.card, display: "flex" }}><div style={{ width: `${(r.lui/10)*100}%`, background: "linear-gradient(90deg, #4fc3f7, #4fc3f788)", borderRadius: 3 }} /></div><div style={{ flex: 1, height: 6, borderRadius: 3, overflow: "hidden", background: T.card, display: "flex", justifyContent: "flex-end" }}><div style={{ width: `${(r.lei/10)*100}%`, background: "linear-gradient(270deg, #ec4899, #ec489988)", borderRadius: 3 }} /></div><span style={{ fontSize: 10 }}>🙋‍♀️</span></div>}
          {r.luiComment&&<div style={{ fontSize: 12, color: "#aaa" }}>🙋‍♂️ "{r.luiComment}"</div>}
          {r.leiComment&&<div style={{ fontSize: 12, color: "#aaa" }}>🙋‍♀️ "{r.leiComment}"</div>}
        </div>); })}
    </div>
  );
}

/* ═══ WISHLIST ═══ */
function Wishlist({ data, save, role }) {
  const [inp, setInp] = useState(""); const [type, setType] = useState("serie"); const [note, setNote] = useState("");
  const add = () => { const t = inp.trim(); if (!t) return; tap(); playSound(); save({ ...data, wishlist: [...(data.wishlist||[]), { id: Date.now(), title: t, type, note, addedBy: role, date: new Date().toLocaleDateString("it-IT"), done: false, priority: false }] }); setInp(""); setNote(""); };
  const toggle = (id) => { tap(); save({ ...data, wishlist: data.wishlist.map(w => w.id===id ? { ...w, done: !w.done } : w) }); };
  const toggleP = (id) => { tap(); save({ ...data, wishlist: data.wishlist.map(w => w.id===id ? { ...w, priority: !w.priority } : w) }); };
  const rm = (id) => { tap(); save({ ...data, wishlist: data.wishlist.filter(w => w.id !== id) }); };
  const sorted = [...(data.wishlist||[])].sort((a,b) => { if (a.priority&&!b.priority) return -1; if (!a.priority&&b.priority) return 1; if (!a.done&&b.done) return -1; if (a.done&&!b.done) return 1; return 0; });
  const grouped = {}; sorted.forEach(w => { if (!grouped[w.type]) grouped[w.type] = []; grouped[w.type].push(w); });
  const total = (data.wishlist||[]).length; const done = (data.wishlist||[]).filter(w=>w.done).length; const pct = total>0?Math.round((done/total)*100):0;
  return (
    <div style={S.sec}><h2 style={S.secTitle}>💫 Wishlist Condivisa</h2>
      {total > 0 && <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #00b894, #f0a500)", borderRadius: 4, transition: "width 0.5s" }} /></div><span style={{ fontSize: 12, fontWeight: 700, color: "#f0a500" }}>{pct}%</span></div>}
      <div style={S.formGroup}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{WISH_TYPES.map(wt => <button key={wt.id} onClick={() => { tap(); setType(wt.id); }} style={{ ...S.catChip, background: type===wt.id?"rgba(0,184,148,0.25)":"transparent", borderColor: type===wt.id?"#00b894":"rgba(255,255,255,0.06)" }}>{wt.icon} {wt.label}</button>)}</div>
        <input style={S.input} value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key==="Enter"&&add()} placeholder="Cosa volete fare/vedere/provare?" />
        <input style={S.input} value={note} onChange={e => setNote(e.target.value)} placeholder="📝 Note (opzionale)" />
        <button style={S.bigBtn} onClick={add}>+ Aggiungi alla Wishlist</button>
      </div>
      {Object.keys(grouped).length === 0 && <p style={S.empty}>La wishlist è vuota!</p>}
      {WISH_TYPES.map(wt => { const items = grouped[wt.id]; if (!items) return null; return <div key={wt.id}><h3 style={{ fontSize: 14, color: "#7c8a6d", margin: "8px 0 6px" }}>{wt.icon} {wt.label}</h3>{items.map((w, i) => <div key={w.id} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both`, opacity: w.done?0.5:1, borderLeft: w.priority?"3px solid #ec4899":"3px solid transparent" }}>
        <button style={{ ...S.emojiBtn, fontSize: 18 }} onClick={() => toggle(w.id)}>{w.done?"✅":"⬜"}</button>
        <div style={{ flex: 1 }}><div style={{ ...S.itemText, textDecoration: w.done?"line-through":"none" }}>{w.title}{w.priority&&" ❤️"}</div>{w.note&&<div style={{ fontSize: 11, color: "#7c8a6d" }}>{w.note}</div>}<div style={{ fontSize: 10, color: "#4a6a3e" }}>aggiunto da {w.addedBy==="lui"?"🙋‍♂️":"🙋‍♀️"} · {w.date}</div></div>
        <button onClick={() => toggleP(w.id)} style={{ ...S.emojiBtn, fontSize: 14, background: w.priority?"rgba(236,72,153,0.15)":"transparent" }}>{w.priority?"❤️":"🤍"}</button>
        <button style={S.xBtn} onClick={() => rm(w.id)}>✕</button>
      </div>)}</div>; })}
    </div>
  );
}

/* ═══ GUSTI ═══ */
const GUSTI_CATS = [{ id: "cibo", icon: "🍕", label: "Cibo" },{ id: "musica", icon: "🎵", label: "Musica" },{ id: "hobby", icon: "🎮", label: "Hobby" },{ id: "viaggio", icon: "✈️", label: "Viaggi" },{ id: "film_genere", icon: "🎬", label: "Film/Serie" },{ id: "altro_g", icon: "💚", label: "Altro" }];

function Gusti({ data, save, role }) {
  const T = useContext(ThemeCtx);
  const [inp, setInp] = useState(""); const [cat, setCat] = useState("cibo"); const [tab, setTab] = useState("miei");
  const gusti = data.gusti || []; const otherRole = role === "lui" ? "lei" : "lui";
  const add = () => { const t = inp.trim(); if (!t) return; tap(); playSound(); save({ ...data, gusti: [...gusti, { id: Date.now(), text: t, cat, owner: role, likes: [], date: new Date().toLocaleDateString("it-IT") }] }); setInp(""); };
  const rm = (id) => { tap(); save({ ...data, gusti: gusti.filter(g => g.id !== id) }); };
  const toggleLike = (id) => { tap(); save({ ...data, gusti: gusti.map(g => { if (g.id !== id) return g; const likes = g.likes||[]; return { ...g, likes: likes.includes(role)?likes.filter(l=>l!==role):[...likes, role] }; })}); };
  const miei = gusti.filter(g => g.owner === role); const altri = gusti.filter(g => g.owner === otherRole);
  const matched = gusti.filter(g => (g.likes||[]).includes("lui")&&(g.likes||[]).includes("lei") || ((g.likes||[]).includes(otherRole)&&g.owner===role) || ((g.likes||[]).includes(role)&&g.owner===otherRole));
  const renderList = (items, canDel, canLike) => {
    const grouped = {}; items.forEach(g => { if (!grouped[g.cat]) grouped[g.cat]=[]; grouped[g.cat].push(g); });
    if (items.length===0) return <p style={S.empty}>{tab==="miei"?"Aggiungi le cose che ti piacciono!":tab==="altri"?`${otherRole==="lui"?"Lui":"Lei"} non ha ancora aggiunto nulla`:"Nessun match ancora!"}</p>;
    return GUSTI_CATS.map(gc => { const ci=grouped[gc.id]; if(!ci) return null; return (<div key={gc.id}><h3 style={{ fontSize: 13, color: T.muted, margin: "10px 0 6px" }}>{gc.icon} {gc.label}</h3>
      {ci.map((g,i)=>{const isLiked=(g.likes||[]).includes(role);const isM=(g.likes||[]).includes("lui")&&(g.likes||[]).includes("lei")||(g.owner!==role&&isLiked);return(<div key={g.id} style={{ ...S.item, animation:`fade-in 0.3s ease ${i*0.04}s both`, borderLeft:isM?`3px solid ${T.accent1}`:"3px solid rgba(255,255,255,0.06)" }}>
        {canLike&&<button onClick={()=>toggleLike(g.id)} style={{ ...S.emojiBtn, fontSize: 18, background: isLiked?`${T.accent1}33`:"transparent" }}>{isLiked?"💛":"🤍"}</button>}
        <div style={{ flex: 1 }}><div style={S.itemText}>{g.text}</div><div style={{ fontSize: 10, color: "#7a8a6e" }}>{g.owner==="lui"?"🙋‍♂️":"🙋‍♀️"} · {g.date}{isM&&" · 💛 Match!"}</div></div>
        {canDel&&g.owner===role&&<button style={S.xBtn} onClick={()=>rm(g.id)}>✕</button>}
      </div>);})}</div>); });
  };
  return (
    <div style={S.sec}><h2 style={S.secTitle}>💚 I Nostri Gusti</h2>
      <div style={S.gustiTabs}>
        <button onClick={()=>{tap();setTab("miei");}} style={{ ...S.gustiTab, ...(tab==="miei"?S.gustiTabActive:{}) }}>I Miei ({miei.length})</button>
        <button onClick={()=>{tap();setTab("altri");}} style={{ ...S.gustiTab, ...(tab==="altri"?S.gustiTabActive:{}) }}>Suoi ({altri.length})</button>
        <button onClick={()=>{tap();setTab("match");}} style={{ ...S.gustiTab, ...(tab==="match"?S.gustiTabActive:{}) }}>💛 Match ({matched.length})</button>
      </div>
      {tab==="miei"&&(<div style={S.formGroup}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{GUSTI_CATS.map(c=>(<button key={c.id} onClick={()=>{tap();setCat(c.id);}} style={{ ...S.catChip, background:cat===c.id?`${T.accent1}33`:"transparent", borderColor:cat===c.id?T.accent1:T.border }}>{c.icon} {c.label}</button>))}</div><div style={S.row}><input style={S.input} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Cosa ti piace?" /><button style={S.addBtn} onClick={add}>+</button></div></div>)}
      {tab==="altri"&&<p style={{ fontSize: 12, color: T.muted, margin: 0 }}>Tocca 🤍 per dire che piace anche a te!</p>}
      {tab==="match"&&<p style={{ fontSize: 12, color: T.accent1, margin: 0 }}>Le cose che piacciono a entrambi 💛</p>}
      {tab==="miei"&&renderList(miei,true,false)}{tab==="altri"&&renderList(altri,false,true)}{tab==="match"&&renderList(matched,false,false)}
    </div>
  );
}

/* ═══ PIGIAMI ═══ */
function Pigiami({ data, save, role }) {
  const [name, setName] = useState(""); const [owner, setOwner] = useState(role); const [emoji, setEmoji] = useState("👘");
  const [comodita, setComodita] = useState(5); const [adattabilita, setAdattabilita] = useState(5); const [cute, setCute] = useState(5);
  const pigiami = data.pigiami||[]; const sorted = [...pigiami].sort((a,b)=>b.avg-a.avg); const podium = sorted.slice(0,3);
  const add = () => { const t=name.trim(); if(!t) return; tap(); playSound(); const avg=+((comodita+adattabilita+cute)/3).toFixed(1); save({ ...data, pigiami: [...pigiami, { id: Date.now(), name: t, owner, emoji, comodita, adattabilita, cute, avg, date: new Date().toLocaleDateString("it-IT") }] }); setName(""); setComodita(5); setAdattabilita(5); setCute(5); };
  const rm = (id) => { tap(); save({ ...data, pigiami: pigiami.filter(p=>p.id!==id) }); };
  const medals=["🥇","🥈","🥉"];
  const podiumOrder=podium.length>=3?[podium[1],podium[0],podium[2]]:podium;
  const podiumHeights=podium.length>=3?[90,120,70]:podium.length===2?[90,120]:[120];
  const podiumLabels=podium.length>=3?["2°","1°","3°"]:podium.length===2?["2°","1°"]:["1°"];
  const podiumColors=podium.length>=3?["rgba(192,192,192,0.25)","rgba(240,165,0,0.3)","rgba(205,127,50,0.2)"]:podium.length===2?["rgba(192,192,192,0.25)","rgba(240,165,0,0.3)"]:["rgba(240,165,0,0.3)"];
  return (
    <div style={S.sec}><h2 style={S.secTitle}>🛌 Classifica Pigiami</h2>
      <div style={S.formGroup}>
        <input style={S.input} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Nome del pigiama..." />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={()=>{tap();setOwner("lui");}} style={{ ...S.catChip, flex:1, textAlign:"center", background:owner==="lui"?"rgba(0,184,148,0.2)":"transparent", borderColor:owner==="lui"?"#00b894":"rgba(255,255,255,0.06)" }}>🙋‍♂️ Lui</button>
          <button onClick={()=>{tap();setOwner("lei");}} style={{ ...S.catChip, flex:1, textAlign:"center", background:owner==="lei"?"rgba(0,184,148,0.2)":"transparent", borderColor:owner==="lei"?"#00b894":"rgba(255,255,255,0.06)" }}>🙋‍♀️ Lei</button>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{PJ_EMOJIS.map(e=>(<button key={e} onClick={()=>{tap();setEmoji(e);}} style={{ ...S.emojiBtn, fontSize: 22, padding: "4px 8px", background:emoji===e?"rgba(240,165,0,0.2)":"transparent", borderColor:emoji===e?"#f0a500":"rgba(255,255,255,0.06)" }}>{e}</button>))}</div>
        {[{label:"😴 Comodità",val:comodita,set:setComodita},{label:"🔄 Adattabilità",val:adattabilita,set:setAdattabilita},{label:"💕 Cute",val:cute,set:setCute}].map(s=>(
          <div key={s.label} style={{ display:"flex",gap:8,alignItems:"center" }}><label style={{ fontSize:13,width:100,color:"#eae2d6" }}>{s.label}</label><input type="range" min="1" max="10" value={s.val} onChange={e=>s.set(+e.target.value)} style={{ flex:1 }} /><span style={S.scoreBadge}>{s.val}</span></div>))}
        <div style={{ textAlign:"center",fontSize:13,color:"#7c8a6d" }}>Media: <strong style={{ color:"#f0a500",fontSize:16 }}>{((comodita+adattabilita+cute)/3).toFixed(1)}</strong></div>
        <button style={S.bigBtn} onClick={add}>+ Aggiungi Pigiama</button>
      </div>
      {podium.length>0&&(<div style={{ marginTop:8 }}><h3 style={{ fontSize:14,color:"#7c8a6d",margin:"0 0 12px",textAlign:"center" }}>🏆 Podio</h3>
        <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"center",gap:10 }}>
          {podiumOrder.map((p,i)=>(<div key={p.id} style={{ display:"flex",flexDirection:"column",alignItems:"center",animation:`pop-in 0.4s ease ${0.1+i*0.1}s both` }}>
            <div style={{ fontSize:32,marginBottom:2 }}>{p.emoji||"👘"}</div>
            <div style={{ fontSize:11,fontWeight:700,color:"#eae2d6",textAlign:"center",maxWidth:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.name}</div>
            <div style={{ fontSize:16,fontWeight:900,color:"#f0a500" }}>{p.avg}</div>
            <div style={{ width:80,height:podiumHeights[i],borderRadius:"12px 12px 0 0",background:podiumColors[i],border:"1px solid rgba(255,255,255,0.08)",borderBottom:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#eae2d6",marginTop:4 }}>{podiumLabels[i]}</div>
          </div>))}
        </div><div style={{ height:2,background:"rgba(240,165,0,0.2)",borderRadius:1 }} /></div>)}
      {sorted.length===0&&<p style={S.empty}>Nessun pigiama in classifica!</p>}
      {sorted.length>0&&<h3 style={{ fontSize:14,color:"#7c8a6d",margin:"12px 0 6px" }}>📊 Classifica Completa</h3>}
      {sorted.map((p,i)=>(
        <div key={p.id} style={{ ...S.item, animation:`fade-in 0.3s ease ${i*0.04}s both`, borderLeft:`3px solid ${i<3?"#f0a500":"rgba(255,255,255,0.06)"}` }}>
          <span style={{ fontSize:18,minWidth:28,textAlign:"center" }}>{i<3?medals[i]:`${i+1}°`}</span><span style={{ fontSize:20 }}>{p.emoji||"👘"}</span>
          <div style={{ flex:1 }}><div style={S.itemText}>{p.name}</div><div style={{ fontSize:10,color:"#7c8a6d" }}>{p.owner==="lui"?"🙋‍♂️":"🙋‍♀️"} · 😴{p.comodita} · 🔄{p.adattabilita} · 💕{p.cute} · {p.date}</div></div>
          <span style={{ ...S.scoreBadge, fontSize:16, background:p.avg>=7?"rgba(76,175,80,.25)":p.avg>=5?"rgba(255,193,7,.25)":"rgba(233,69,96,.25)", color:p.avg>=7?"#81c784":p.avg>=5?"#ffd54f":"#e94560" }}>{p.avg}</span>
          <button style={S.xBtn} onClick={()=>rm(p.id)}>✕</button>
        </div>))}
    </div>
  );
}

/* ═══ ACHIEVEMENTS ═══ */
function Achievements({ data }) {
  const T = useContext(ThemeCtx);
  const achs = getAchievements(data);
  const done = achs.filter(a => a.done).length;
  const pct = Math.round((done / achs.length) * 100);
  return (
    <div style={S.sec}>
      <h2 style={{ ...S.secTitle, color: T.accent1 }}>🏆 Traguardi</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ flex: 1, height: 10, borderRadius: 5, background: T.card, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${T.accent2}, ${T.accent1})`, borderRadius: 5, transition: "width 0.5s" }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: T.accent1 }}>{done}/{achs.length}</span>
      </div>
      {achs.map((a, i) => (
        <div key={a.id} style={{ ...S.item, animation: `fade-in 0.3s ease ${i * 0.04}s both`, opacity: a.done ? 1 : 0.4, borderLeft: `3px solid ${a.done ? T.accent1 : "transparent"}` }}>
          <span style={{ fontSize: 24 }}>{a.done ? a.icon : "🔒"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.itemText, color: a.done ? T.text : T.muted }}>{a.title}</div>
            <div style={{ fontSize: 11, color: T.muted }}>{a.desc}</div>
          </div>
          {a.done && <span style={{ fontSize: 16, color: T.accent2 }}>✅</span>}
        </div>
      ))}
    </div>
  );
}

/* ═══ STATS ═══ */
function Stats({ data, usersDoc }) {
  const T = useContext(ThemeCtx);
  const tw = data.watched.length; const rv = Object.values(data.reviews||{}); const re = Object.entries(data.reviews||{});
  const avgL = rv.filter(r=>r.lui!==undefined).length>0?(rv.reduce((s,r)=>s+(r.lui||0),0)/rv.filter(r=>r.lui!==undefined).length).toFixed(1):"-";
  const avgE = rv.filter(r=>r.lei!==undefined).length>0?(rv.reduce((s,r)=>s+(r.lei||0),0)/rv.filter(r=>r.lei!==undefined).length).toFixed(1):"-";
  const avgT = rv.length>0?(rv.reduce((s,r)=>s+(r.avg||0),0)/rv.length).toFixed(1):"-";
  let bm="-",bs=0; re.forEach(([m,r])=>{if((r.avg||0)>bs){bs=r.avg;bm=m;}});
  let wm="-",ws=11; re.forEach(([m,r])=>{if(r.avg!==undefined&&r.avg<ws){ws=r.avg;wm=m;}});
  const cc={}; data.movies.forEach(m=>{const c=(data.categories||{})[m]||"altro";cc[c]=(cc[c]||0)+1;}); const tc=Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]; const tci=tc?CATEGORIES.find(c=>c.id===tc[0]):null;
  const rc={}; Object.values(data.reactions||{}).forEach(r=>Object.values(r).forEach(e=>{rc[e]=(rc[e]||0)+1;})); const tr=Object.entries(rc).sort((a,b)=>b[1]-a[1])[0];
  const avgSpark=re.length>=2?re.map(([,r])=>r.avg||0):null;
  const luiSpark=re.filter(([,r])=>r.lui!==undefined).length>=2?re.filter(([,r])=>r.lui!==undefined).map(([,r])=>r.lui):null;
  const leiSpark=re.filter(([,r])=>r.lei!==undefined).length>=2?re.filter(([,r])=>r.lei!==undefined).map(([,r])=>r.lei):null;
  const monthCount={}; data.watched.forEach(w=>{if(!w.date)return;const p=w.date.split("/");if(p.length>=2){const k=`${["","Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"][+p[1]]||p[1]} ${p[2]||""}`;monthCount[k]=(monthCount[k]||0)+1;}}); const topMonth=Object.entries(monthCount).sort((a,b)=>b[1]-a[1])[0];
  const unanimiCount=rv.filter(r=>r.lui!==undefined&&r.lei!==undefined&&Math.abs(r.lui-r.lei)<=1).length;
  const genreAg={}; re.forEach(([m,r])=>{if(r.lui===undefined||r.lei===undefined)return;const cat=(data.categories||{})[m]||"altro";if(!genreAg[cat])genreAg[cat]=[];genreAg[cat].push(Math.abs(r.lui-r.lei));}); const gAvgs=Object.entries(genreAg).map(([g,d])=>({g,avg:d.reduce((s,x)=>s+x,0)/d.length}));
  let bestG="-",worstG="-"; if(gAvgs.length>0){gAvgs.sort((a,b)=>a.avg-b.avg);const bg=CATEGORIES.find(c=>c.id===gAvgs[0].g);bestG=bg?`${bg.icon} ${bg.label}`:"-";if(gAvgs.length>1){const wg=CATEGORIES.find(c=>c.id===gAvgs[gAvgs.length-1].g);worstG=wg?`${wg.icon} ${wg.label}`:"-";}}

  const stats=[
    {l:"Film in lista",v:data.movies.length,i:"📋"},{l:"Film visti insieme",v:tw,i:"✅"},{l:"Serate pianificate",v:data.plans.length,i:"🕯️"},
    {l:"Wishlist",v:`${(data.wishlist||[]).filter(w=>w.done).length}/${(data.wishlist||[]).length}`,i:"💫"},{l:"Recensioni",v:rv.length,i:"📝"},
    {l:"Media voto Lui",v:avgL,i:"🙋‍♂️",spark:luiSpark,sparkColor:"#4fc3f7"},
    {l:"Media voto Lei",v:avgE,i:"🙋‍♀️",spark:leiSpark,sparkColor:"#ec4899"},
    {l:"Media di coppia",v:avgT,i:"💜",spark:avgSpark,sparkColor:T.accent1},
    {l:"Miglior film",v:bm!=="-"?`${bm} (${bs})`:"-",i:"👑"},{l:"Peggior film",v:wm!=="-"&&ws<11?`${wm} (${ws})`:"-",i:"💩"},
    {l:"Recensioni unanimi",v:unanimiCount>0?`${unanimiCount} 🤝`:"-",i:"🤝"},
    {l:"Genere preferito",v:tci?`${tci.icon} ${tci.label} (${tc[1]})`:"-",i:"🎭"},
    {l:"Più d'accordo su",v:bestG,i:"💚"},
    ...(worstG!=="-"?[{l:"Meno d'accordo su",v:worstG,i:"🔥"}]:[]),
    {l:"Mese più attivo",v:topMonth?`${topMonth[0]} (${topMonth[1]} film)`:"-",i:"📅"},
    {l:"Reazione top",v:tr?`${tr[0]} (${tr[1]}x)`:"-",i:"😍"},
  ];
  return (
    <div style={S.sec}><h2 style={{ ...S.secTitle, color: T.accent1 }}>📊 Statistiche di Coppia</h2>
      {stats.map((s,i)=>(<div key={i} style={{ ...S.statRow, background: T.card, animation:`fade-in 0.3s ease ${i*0.04}s both` }}>
        <span style={{ fontSize:20 }}>{s.i}</span>
        <div style={{ flex:1 }}><div style={{ fontSize:12,color:T.muted }}>{s.l}</div>
          <div style={{ display:"flex",alignItems:"center" }}><div style={{ fontSize:16,fontWeight:800,color:T.text }}>{s.v}</div>{s.spark&&<Sparkline values={s.spark} color={s.sparkColor} />}</div>
        </div>
      </div>))}
      <button style={{ ...S.bigBtn, marginTop: 8 }} onClick={() => exportPDF(data, usersDoc)}>📄 Esporta "Il Nostro Anno"</button>
    </div>
  );
}

/* ═══ STYLES ═══ */
/* ═══ CALENDAR ═══ */
function Calendar({ data }) {
  const T = useContext(ThemeCtx);
  const [month, setMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  const DAYS = ["Lu","Ma","Me","Gi","Ve","Sa","Do"];
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const firstDay = (new Date(month.y, month.m, 1).getDay() + 6) % 7;
  const prev = () => { tap(); setMonth(m => m.m === 0 ? { y: m.y - 1, m: 11 } : { y: m.y, m: m.m - 1 }); };
  const next = () => { tap(); setMonth(m => m.m === 11 ? { y: m.y + 1, m: 0 } : { y: m.y, m: m.m + 1 }); };

  // Build events map: day -> { watched: [...], plans: [...] }
  const events = {};
  (data.watched || []).forEach(w => {
    if (!w.date) return;
    const p = w.date.split("/");
    if (p.length >= 3 && +p[1] === month.m + 1 && +p[2] === month.y) {
      const d = +p[0]; if (!events[d]) events[d] = { watched: [], plans: [] }; events[d].watched.push(w.title);
    }
  });
  (data.plans || []).forEach(pl => {
    if (!pl.date) return;
    const p = pl.date.split("-");
    if (p.length >= 3 && +p[1] === month.m + 1 && +p[0] === month.y) {
      const d = +p[2]; if (!events[d]) events[d] = { watched: [], plans: [] }; events[d].plans.push(pl.activity || pl.movie || "Serata");
    }
  });

  const today = new Date();
  const isToday = (d) => d === today.getDate() && month.m === today.getMonth() && month.y === today.getFullYear();

  return (
    <div style={S.sec}>
      <h2 style={{ ...S.secTitle, color: T.accent1 }}>📅 Calendario</h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={prev} style={{ ...S.emojiBtn, fontSize: 18, padding: "6px 12px" }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{MONTHS[month.m]} {month.y}</span>
        <button onClick={next} style={{ ...S.emojiBtn, fontSize: 18, padding: "6px 12px" }}>→</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
        {DAYS.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 700, color: T.muted, padding: "4px 0" }}>{d}</div>)}
        {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}
        {[...Array(daysInMonth)].map((_, i) => {
          const d = i + 1; const ev = events[d]; const hasW = ev?.watched?.length > 0; const hasP = ev?.plans?.length > 0;
          return (
            <div key={d} style={{
              padding: "6px 2px", borderRadius: 8, fontSize: 12, fontWeight: isToday(d) ? 800 : 400,
              color: isToday(d) ? T.bg1 : hasW || hasP ? T.text : T.muted,
              background: isToday(d) ? T.accent1 : hasW ? `${T.accent2}22` : hasP ? `${T.accent1}15` : "transparent",
              border: hasP && !isToday(d) ? `1px solid ${T.accent1}33` : "1px solid transparent",
              position: "relative",
            }}>
              {d}
              {(hasW || hasP) && !isToday(d) && (
                <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 1 }}>
                  {hasW && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.accent2 }} />}
                  {hasP && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.accent1 }} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent2 }} /><span style={{ fontSize: 11, color: T.muted }}>Film visto</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent1 }} /><span style={{ fontSize: 11, color: T.muted }}>Serata</span></div>
      </div>
      {/* Events for selected month */}
      {Object.entries(events).sort((a,b) => +a[0] - +b[0]).map(([d, ev]) => (
        <div key={d} style={{ ...S.item, animation: "fade-in 0.3s ease" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.accent1, minWidth: 24 }}>{d}</span>
          <div style={{ flex: 1 }}>
            {ev.watched.map((t, i) => <div key={`w${i}`} style={{ fontSize: 12, color: T.accent2 }}>🎬 {t}</div>)}
            {ev.plans.map((t, i) => <div key={`p${i}`} style={{ fontSize: 12, color: T.accent1 }}>🕯️ {t}</div>)}
          </div>
        </div>
      ))}
    </div>
  );
}

const S = {
  loadWrap:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a1f16",fontFamily:"'Nunito',sans-serif"},
  authPage:{fontFamily:"'Nunito',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:24},
  googleBtn:{display:"flex",alignItems:"center",padding:"12px 28px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.06)",color:"#eae2d6",fontSize:15,fontWeight:700,cursor:"pointer"},
  roleBtn:{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"20px 28px",borderRadius:16,border:"1px solid rgba(0,184,148,0.2)",background:"rgba(255,255,255,0.04)",color:"#eae2d6",fontSize:15,fontWeight:700,cursor:"pointer"},
  linkBtn:{border:"none",background:"transparent",color:"#7c8a6d",fontSize:12,cursor:"pointer",textDecoration:"underline"},
  userBar:{display:"flex",alignItems:"center",gap:10,width:"100%",maxWidth:360,marginBottom:12,padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:14,border:"1px solid rgba(255,255,255,0.04)"},
  avatar:{width:36,height:36,borderRadius:"50%",border:"2px solid rgba(0,184,148,0.3)"},
  page:{fontFamily:"'Nunito',sans-serif",maxWidth:440,margin:"0 auto",padding:16,minHeight:"100vh"},
  hub:{fontFamily:"'Nunito',sans-serif",maxWidth:440,margin:"0 auto",padding:"24px 20px 20px",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center"},
  toast:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"rgba(0,184,148,0.92)",color:"#fff",padding:"10px 20px",borderRadius:12,fontSize:13,fontWeight:700,zIndex:9999,animation:"pop-in 0.3s ease",maxWidth:"90vw",textAlign:"center",backdropFilter:"blur(8px)"},
  annivBanner:{width:"100%",maxWidth:360,padding:"14px 16px",borderRadius:16,marginBottom:8},
  annivCd:{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginTop:4},
  annivBox:{display:"flex",flexDirection:"column",alignItems:"center",gap:2},
  annivNum:{fontSize:28,fontWeight:900,lineHeight:1},
  annivLbl:{fontSize:10,textAlign:"center"},
  annivDiv:{width:1,height:36,background:"rgba(255,255,255,0.08)"},
  nextPlanBanner:{width:"100%",maxWidth:360,padding:"10px 14px",background:"rgba(0,184,148,0.06)",border:"1px solid rgba(0,184,148,0.15)",borderRadius:14,marginBottom:8,cursor:"pointer"},
  eyeWrap:{position:"relative",width:140,height:140,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 1s ease",marginBottom:8,marginTop:4},
  eye:{width:56,height:56,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2},
  pupil:{width:18,height:28,borderRadius:"50%"},
  hubTitle:{margin:"0 0 4px",fontSize:30,fontWeight:900,background:"linear-gradient(135deg,#00b894,#f0a500)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-0.5},
  hubSub:{margin:"0 0 8px",fontSize:13},
  suggBtn:{width:"100%",maxWidth:360,padding:"12px 0",border:"2px dashed",borderRadius:14,fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:12},
  suggCard:{width:"100%",maxWidth:360,padding:16,background:"rgba(240,165,0,0.08)",border:"1px solid rgba(240,165,0,0.2)",borderRadius:14,marginBottom:16,fontSize:14},
  grid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,width:"100%",maxWidth:360},
  card:{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"18px 12px",borderRadius:16,fontSize:14,fontWeight:700,cursor:"pointer",transition:"all 0.2s ease"},
  cardIcon:{fontSize:28},cardLbl:{fontSize:13},
  footer:{marginTop:32,fontSize:10,textAlign:"center",fontStyle:"italic"},
  backBtn:{border:"none",background:"rgba(240,165,0,0.12)",color:"#f0a500",padding:"8px 16px",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:16},
  sec:{display:"flex",flexDirection:"column",gap:12},
  secTitle:{fontSize:20,fontWeight:800,margin:"0 0 4px",color:"#f0a500"},
  row:{display:"flex",gap:8},
  input:{flex:1,padding:"11px 14px",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,background:"rgba(255,255,255,0.05)",color:"#eae2d6",fontSize:14,outline:"none"},
  addBtn:{width:44,border:"none",borderRadius:10,background:"linear-gradient(135deg,#00b894,#00d4a4)",color:"#fff",fontSize:20,fontWeight:700,cursor:"pointer"},
  bigBtn:{padding:"13px 0",border:"none",borderRadius:12,background:"linear-gradient(135deg,#00b894,#f0a500)",color:"#0a1f16",fontSize:15,fontWeight:800,cursor:"pointer"},
  empty:{textAlign:"center",color:"#4a6a3e",fontSize:13,padding:28},
  item:{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:"rgba(255,255,255,0.04)",borderRadius:12,marginBottom:4},
  itemText:{flex:1,fontSize:14,fontWeight:600,color:"#eae2d6"},
  xBtn:{width:26,height:26,border:"none",borderRadius:7,background:"rgba(233,69,96,0.15)",color:"#e94560",fontSize:12,cursor:"pointer"},
  count:{textAlign:"center",fontSize:11,color:"#4a6a3e"},
  pointer:{textAlign:"center",fontSize:26,color:"#00b894",marginBottom:-6,zIndex:2,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.5))"},
  pickedCard:{marginTop:14,padding:18,background:"rgba(0,184,148,0.08)",border:"1px solid rgba(0,184,148,0.2)",borderRadius:14,textAlign:"center"},
  pickedLbl:{fontSize:12,color:"#00b894",marginBottom:4,fontWeight:600},
  pickedTxt:{fontSize:20,fontWeight:800,color:"#fff"},
  voteCard:{padding:14,background:"rgba(255,255,255,0.04)",borderRadius:12,display:"flex",flexDirection:"column",gap:8},
  badge:{fontSize:10,fontWeight:700,background:"rgba(240,165,0,0.15)",color:"#f0a500",padding:"2px 8px",borderRadius:16},
  emojiBtn:{border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,background:"transparent",fontSize:14,padding:"4px 6px",cursor:"pointer",transition:"background 0.15s"},
  chip:{padding:"6px 12px",border:"1px solid rgba(0,184,148,0.2)",borderRadius:20,background:"rgba(0,184,148,0.06)",color:"#00b894",fontSize:12,fontWeight:600,cursor:"pointer"},
  catChip:{padding:"5px 10px",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,color:"#eae2d6",fontSize:11,fontWeight:600,cursor:"pointer",background:"transparent"},
  formGroup:{display:"flex",flexDirection:"column",gap:10},
  planCard:{padding:14,background:"rgba(255,255,255,0.04)",borderRadius:12,display:"flex",flexDirection:"column",gap:6,fontSize:13},
  reviewCard:{padding:14,background:"rgba(255,255,255,0.04)",borderRadius:12,display:"flex",flexDirection:"column",gap:6},
  scoreBadge:{fontSize:14,fontWeight:800,background:"rgba(240,165,0,0.15)",color:"#f0a500",padding:"3px 10px",borderRadius:8,minWidth:28,textAlign:"center"},
  gustiTabs:{display:"flex",gap:4,background:"rgba(255,255,255,0.03)",borderRadius:12,padding:4},
  gustiTab:{flex:1,padding:"10px 0",border:"none",borderRadius:10,background:"transparent",color:"#7c8a6d",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .2s"},
  gustiTabActive:{background:"rgba(240,165,0,0.15)",color:"#f0a500"},
  statRow:{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",borderRadius:12},
};
