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
const audioCtx = typeof AudioContext !== "undefined" ? new AudioContext() : typeof webkitAudioContext !== "undefined" ? new webkitAudioContext() : null;
function playSound(type) {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
    if (type === "click") { o.frequency.value = 800; g.gain.value = 0.05; o.start(); o.stop(audioCtx.currentTime + 0.05); }
    else if (type === "success") { o.frequency.value = 523; g.gain.value = 0.08; o.start(); o.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1); o.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2); o.stop(audioCtx.currentTime + 0.3); }
    else if (type === "spin") { o.type = "sawtooth"; o.frequency.value = 200; g.gain.value = 0.04; o.start(); o.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.5); g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5); o.stop(audioCtx.currentTime + 0.5); }
    else if (type === "reveal") { o.frequency.value = 440; g.gain.value = 0.1; o.start(); o.frequency.setValueAtTime(554, audioCtx.currentTime + 0.1); o.frequency.setValueAtTime(659, audioCtx.currentTime + 0.2); o.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3); o.stop(audioCtx.currentTime + 0.45); }
    else if (type === "add") { o.frequency.value = 600; g.gain.value = 0.06; o.start(); o.frequency.setValueAtTime(900, audioCtx.currentTime + 0.08); o.stop(audioCtx.currentTime + 0.12); }
  } catch (e) {}
}
function haptic(ms = 10) { try { navigator?.vibrate?.(ms); } catch (e) {} }
function tap() { haptic(); playSound("click"); }

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
  const prevRef = useRef(null);

  const T = THEMES[theme];
  const toggleTheme = () => { const n = theme === "dark" ? "light" : "dark"; setTheme(n); localStorage.setItem("covo-theme", n); };

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

  if (screen === "hub") return <ThemeCtx.Provider value={T}><Toast msg={toast} /><Hub onGo={navigate} {...screenProps} user={user} logout={logout} toggleTheme={toggleTheme} theme={theme} /></ThemeCtx.Provider>;

  return (
    <ThemeCtx.Provider value={T}><Toast msg={toast} /><div style={{ ...S.page, background: bgGrad, color: T.text }} key={screen}><div style={{ animation: `${animDir} 0.3s ease` }}>
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
      {screen === "stats" && <Stats {...screenProps} />}
      {screen === "profilo" && <Profile role={role} usersDoc={usersDoc} />}
    </div></div></ThemeCtx.Provider>
  );
}

/* ═══ HUB ═══ */
function Hub({ onGo, data, save, role, user, usersDoc, logout, toggleTheme, theme, myEmoji }) {
  const T = useContext(ThemeCtx);
  const { movies, watched, plans, anniversary } = data;
  const [glow, setGlow] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [sugg, setSugg] = useState(null);
  const [slotAnim, setSlotAnim] = useState(false);
  const [pressedCard, setPressedCard] = useState(null);
  useEffect(() => { const t = setTimeout(() => setGlow(true), 300); return () => clearTimeout(t); }, []);
  const setAnniv = (d) => { save({ ...data, anniversary: d }); setEditingDate(false); };

  const randomSugg = () => {
    tap(); playSound("spin"); setSlotAnim(true); setSugg(null);
    setTimeout(() => { playSound("reveal"); haptic(30); setSugg({ act: rnd(RAND_ACT), food: rnd(RAND_FOOD), drink: rnd(RAND_DRINK), movie: movies.length > 0 ? rnd(movies) : null }); setSlotAnim(false); }, 800);
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
        <button onClick={toggleTheme} style={{ ...S.emojiBtn, fontSize: 18 }}>{theme === "dark" ? "☀️" : "🌙"}</button>
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

      <div style={{ ...S.eyeWrap, opacity: glow ? 1 : 0, transform: glow ? "scale(1)" : "scale(0.7)" }}>
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
    tap(); playSound("success");
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

/* ═══ MOVIE LIST ═══ */
function MovieList({ data, save }) {
  const [inp, setInp] = useState(""); const [cat, setCat] = useState("altro"); const [search, setSearch] = useState("");
  const add = () => { const t = inp.trim(); if (!t || data.movies.includes(t)) return; playSound("add"); haptic(); save({ ...data, movies: [...data.movies, t], categories: { ...(data.categories||{}), [t]: cat } }); setInp(""); };
  const rm = (m) => { tap(); const c = { ...(data.categories||{}) }; delete c[m]; save({ ...data, movies: data.movies.filter(x => x !== m), categories: c }); };
  const filtered = data.movies.filter(m => m.toLowerCase().includes(search.toLowerCase()));
  const gc = (m) => CATEGORIES.find(c => c.id === ((data.categories||{})[m] || "altro")) || CATEGORIES[9];
  const grouped = {}; filtered.forEach(m => { const c = gc(m); if (!grouped[c.id]) grouped[c.id] = { cat: c, items: [] }; grouped[c.id].items.push(m); });
  return (
    <div style={S.sec}><h2 style={S.secTitle}>📋 Lista Film</h2>
      {data.movies.length > 3 && <input style={S.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Cerca film..." />}
      <div style={S.row}><input style={S.input} value={inp} onChange={(e) => setInp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Aggiungi un film..." /><button style={S.addBtn} onClick={add}>+</button></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{CATEGORIES.map(c => <button key={c.id} onClick={() => { tap(); setCat(c.id); }} style={{ ...S.catChip, background: cat === c.id ? c.color + "33" : "transparent", borderColor: cat === c.id ? c.color : "rgba(255,255,255,0.06)" }}>{c.icon} {c.label}</button>)}</div>
      {filtered.length === 0 && <p style={S.empty}>{search ? "Nessun risultato!" : "La lista è vuota!"}</p>}
      {Object.values(grouped).map(({ cat: mc, items }) => (
        <div key={mc.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px 0 6px" }}>
            <span style={{ fontSize: 16 }}>{mc.icon}</span><span style={{ fontSize: 13, fontWeight: 700, color: mc.color }}>{mc.label}</span>
            <span style={{ fontSize: 10, color: "#7c8a6d" }}>({items.length})</span><div style={{ flex: 1, height: 1, background: mc.color + "33" }} />
          </div>
          {items.map((m, i) => <div key={m} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both`, borderLeft: `3px solid ${mc.color}` }}><span style={S.itemText}>{m}</span><button style={S.xBtn} onClick={() => rm(m)}>✕</button></div>)}
        </div>
      ))}
      <p style={S.count}>{data.movies.length} film in lista</p>
    </div>
  );
}

/* ═══ WHEEL ═══ */
function Wheel({ movies }) {
  const [rot, setRot] = useState(0); const [spinning, setSpinning] = useState(false); const [picked, setPicked] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const spin = () => {
    if (movies.length < 2 || spinning) return; tap(); playSound("spin"); setSpinning(true); setPicked(null);
    const nr = rot + 1440 + Math.random() * 1440; setRot(nr);
    setTimeout(() => { const seg = 360/movies.length; const norm = nr%360; const idx = Math.floor(((360-norm+seg/2)%360)/seg)%movies.length; setPicked(movies[idx]); setSpinning(false); setConfettiKey(k=>k+1); playSound("reveal"); haptic(50); }, 3600);
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
  const [filter, setFilter] = useState("all");
  const mw = (m) => { tap(); playSound("success"); save({ ...data, movies: data.movies.filter(x => x !== m), watched: [...data.watched, { title: m, date: new Date().toLocaleDateString("it-IT") }] }); };
  const uw = (t) => { tap(); save({ ...data, watched: data.watched.filter(w => w.title !== t), movies: [...data.movies, t] }); };
  const months = {}; data.watched.forEach(w => { if (!w.date) return; const parts = w.date.split("/"); if (parts.length >= 2) { const key = `${parts[1]}/${parts[2]||parts[1]}`; months[key] = `${["","Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"][+parts[1]]||parts[1]} ${parts[2]||""}`; } });
  const monthKeys = Object.keys(months);
  const filtered = filter === "all" ? data.watched : data.watched.filter(w => { if (!w.date) return false; const p = w.date.split("/"); return `${p[1]}/${p[2]||p[1]}` === filter; });
  return (
    <div style={S.sec}><h2 style={S.secTitle}>✅ Già Visti</h2>
      {data.movies.length > 0 && <><p style={{ fontSize: 12, color: "#7c8a6d", margin: 0 }}>Segna come visto:</p><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{data.movies.map(m => <button key={m} style={S.chip} onClick={() => mw(m)}>{m} ✓</button>)}</div></>}
      {monthKeys.length > 1 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}><button onClick={() => setFilter("all")} style={{ ...S.catChip, background: filter==="all"?"rgba(0,184,148,0.2)":"transparent", borderColor: filter==="all"?"#00b894":"rgba(255,255,255,0.06)" }}>Tutti ({data.watched.length})</button>{monthKeys.map(k => <button key={k} onClick={() => setFilter(k)} style={{ ...S.catChip, background: filter===k?"rgba(0,184,148,0.2)":"transparent", borderColor: filter===k?"#00b894":"rgba(255,255,255,0.06)" }}>{months[k]}</button>)}</div>}
      {filtered.length === 0 && <p style={S.empty}>Nessun film visto{filter !== "all" ? " in questo periodo" : " ancora"}!</p>}
      {filtered.map((w, i) => { const rev = (data.reviews||{})[w.title]; return (
        <div key={i} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both`, flexDirection: "column", alignItems: "stretch", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span>🎬</span><span style={S.itemText}>{w.title}</span><span style={{ fontSize: 11, color: "#7c8a6d" }}>{w.date}</span><button style={S.xBtn} onClick={() => uw(w.title)}>↩</button></div>
          {rev && <div style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: 26, fontSize: 11, color: "#7c8a6d" }}>{rev.avg !== undefined && <span style={{ ...S.scoreBadge, fontSize: 11, padding: "1px 6px" }}>{rev.avg}/10</span>}{rev.lui !== undefined && <span>🙋‍♂️ {rev.lui}</span>}{rev.lei !== undefined && <span>🙋‍♀️ {rev.lei}</span>}</div>}
        </div>); })}
    </div>
  );
}

/* ═══ PLANNER ═══ */
function Planner({ data, save }) {
  const [f, sF] = useState({ date:"", time:"", movie:"", activity:"", place:"", food:"", drink:"", note:"" });
  const add = () => { if (!f.date) return; tap(); playSound("add"); save({ ...data, plans: [...data.plans, { ...f, id: Date.now() }] }); sF({ date:"", time:"", movie:"", activity:"", place:"", food:"", drink:"", note:"" }); };
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
  const add = () => { if (!sel) return; tap(); playSound("add"); const ex = data.reviews[sel]||{}; save({ ...data, reviews: { ...data.reviews, [sel]: { ...ex, [role]: score, [`${role}Comment`]: comment, avg: +((score + (ex[role==="lui"?"lei":"lui"]||score))/2).toFixed(1), date: new Date().toLocaleDateString("it-IT") } } }); setSel(""); setComment(""); };
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
  const add = () => { const t = inp.trim(); if (!t) return; tap(); playSound("add"); save({ ...data, wishlist: [...(data.wishlist||[]), { id: Date.now(), title: t, type, note, addedBy: role, date: new Date().toLocaleDateString("it-IT"), done: false, priority: false }] }); setInp(""); setNote(""); };
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
  const add = () => { const t = inp.trim(); if (!t) return; tap(); playSound("add"); save({ ...data, gusti: [...gusti, { id: Date.now(), text: t, cat, owner: role, likes: [], date: new Date().toLocaleDateString("it-IT") }] }); setInp(""); };
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
  const add = () => { const t=name.trim(); if(!t) return; tap(); playSound("add"); const avg=+((comodita+adattabilita+cute)/3).toFixed(1); save({ ...data, pigiami: [...pigiami, { id: Date.now(), name: t, owner, emoji, comodita, adattabilita, cute, avg, date: new Date().toLocaleDateString("it-IT") }] }); setName(""); setComodita(5); setAdattabilita(5); setCute(5); };
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
