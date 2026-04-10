import { useState, useEffect, useCallback, useRef } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";

const DOC_REF = () => doc(db, "covo", "shared");
const USERS_REF = () => doc(db, "covo", "users");

const SECTIONS = [
  { id: "movies", icon: "📋", label: "Lista Film" },
  { id: "wheel", icon: "🎰", label: "Estrazione" },
  { id: "watched", icon: "✅", label: "Già Visti" },
  { id: "planner", icon: "🕯️", label: "Date Night" },
  { id: "reviews", icon: "📝", label: "Recensioni" },
  { id: "wishlist", icon: "💫", label: "Wishlist" },
  { id: "gusti", icon: "💚", label: "I Nostri Gusti" },
  { id: "pigiami", icon: "🛌", label: "Classifica Pigiami" },
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

const REACTIONS = ["🔥", "💩", "😍", "😴", "🤯", "😂", "👎", "👑"];

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

const EMPTY = { movies: [], votes: {}, watched: [], plans: [], reviews: {}, anniversary: null, categories: {}, reactions: {}, wishlist: [], gusti: [], pigiami: [] };

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return `hsl(${Math.abs(h) % 360}, 50%, 38%)`; }
function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
function getGreeting() { const h = new Date().getHours(); if (h < 6) return "Buonanotte"; if (h < 13) return "Buongiorno"; if (h < 18) return "Buon pomeriggio"; return "Buonasera"; }

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

function Confetti({ active }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!active) return;
    const colors = ["#f0a500", "#00b894", "#ff6b6b", "#c9a0ff", "#64dfdf", "#ec4899"];
    const ps = [...Array(40)].map((_, i) => ({
      id: i, x: 50 + (Math.random() - 0.5) * 20, y: 50,
      dx: (Math.random() - 0.5) * 200, dy: -80 - Math.random() * 120,
      rot: Math.random() * 720, size: 4 + Math.random() * 6,
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
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.shape === "rect" ? p.size * 1.5 : p.size,
          borderRadius: p.shape === "circle" ? "50%" : 2, background: p.color,
          "--dx": `${p.dx}px`, "--rot": `${p.rot}deg`,
          animation: `confetti-fall 2s cubic-bezier(.25,.46,.45,.94) forwards`,
        }} />
      ))}
    </div>
  );
}

function TentacleSep() {
  return (
    <svg viewBox="0 0 360 16" style={{ width: "100%", maxWidth: 360, height: 16, opacity: 0.2, margin: "4px 0" }}>
      <path d="M0,8 Q30,2 60,8 T120,8 T180,8 T240,8 T300,8 T360,8" fill="none" stroke="#00b894" strokeWidth="1.5" />
      <path d="M0,10 Q30,14 60,10 T120,10 T180,10 T240,10 T300,10 T360,10" fill="none" stroke="#f0a500" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function Sparkline({ values, color = "#f0a500", width = 60, height = 20 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return <svg width={width} height={height} style={{ marginLeft: 8, flexShrink: 0 }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

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
  const prevRef = useRef(null);

  const navigate = (s) => { setAnimDir("slide-in"); setScreen(s); window.history.pushState({ screen: s }, ""); };
  const goBack = () => { setAnimDir("slide-out"); setScreen("hub"); };

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
          const oth = role === "lui" ? "lei" : "lui";
          Object.keys(nd.votes).forEach(m => { if ((nd.votes[m]?.[oth]||0) > (p.votes?.[m]?.[oth]||0)) showT(`${o} ha votato "${m}" ⭐`); });
        }
        prevRef.current = nd;
        setData(nd);
      }
      setLoaded(true);
    });
  }, [user, role, loaded]);

  const showT = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };
  const save = useCallback((d) => { setData(d); prevRef.current = d; setDoc(DOC_REF(), d, { merge: true }).catch(console.error); }, []);
  const login = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };
  const pickRole = async (r) => { await setDoc(USERS_REF(), { ...usersDoc, [r]: user.uid, [`${r}Name`]: user.displayName, [`${r}Photo`]: user.photoURL }, { merge: true }); setRole(r); const s = await getDoc(DOC_REF()); if (!s.exists()) await setDoc(DOC_REF(), EMPTY); };
  const logout = async () => { await signOut(auth); setRole(null); setLoaded(false); setScreen("hub"); };

  if (authLoading) return <div style={S.loadWrap}><div style={{ fontSize: 60, animation: "pop-in 0.6s ease" }}>🐙</div><p style={{ color: "#7c8a6d" }}>Risvegliando il Covo...</p></div>;

  if (!user) return (
    <div style={{ ...S.authPage, animation: "fade-in 0.5s ease" }}>
      <div style={{ fontSize: 64, animation: "pop-in 0.6s ease" }}>🐙</div>
      <h1 style={S.hubTitle}>Covo di Cthulhu</h1>
      <p style={{ color: "#7c8a6d", margin: "8px 0 28px", fontSize: 14 }}>Accedi per entrare nel Covo</p>
      <button style={S.googleBtn} onClick={login}>
        <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10 }}><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.1 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 15.6 18.8 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.4 0-9.9-3.5-11.3-8.3l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>
        Accedi con Google
      </button>
    </div>
  );

  if (!role) return (
    <div style={{ ...S.authPage, animation: "fade-in 0.5s ease" }}>
      <img src={user.photoURL} alt="" style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #00b894" }} />
      <p style={{ color: "#eae2d6", margin: "12px 0 4px", fontWeight: 700 }}>Ciao {user.displayName}!</p>
      <p style={{ color: "#7c8a6d", fontSize: 13, margin: "0 0 20px" }}>Chi sei nel Covo?</p>
      <div style={{ display: "flex", gap: 16 }}>
        <button style={{ ...S.roleBtn, opacity: usersDoc?.lui && usersDoc.lui !== user.uid ? 0.3 : 1, animation: "pop-in 0.4s ease 0.1s both" }} disabled={usersDoc?.lui && usersDoc.lui !== user.uid} onClick={() => pickRole("lui")}><span style={{ fontSize: 32 }}>🙋‍♂️</span><span>Lui</span>{usersDoc?.luiName && usersDoc.lui !== user.uid && <span style={{ fontSize: 10, color: "#7c8a6d" }}>({usersDoc.luiName})</span>}</button>
        <button style={{ ...S.roleBtn, opacity: usersDoc?.lei && usersDoc.lei !== user.uid ? 0.3 : 1, animation: "pop-in 0.4s ease 0.2s both" }} disabled={usersDoc?.lei && usersDoc.lei !== user.uid} onClick={() => pickRole("lei")}><span style={{ fontSize: 32 }}>🙋‍♀️</span><span>Lei</span>{usersDoc?.leiName && usersDoc.lei !== user.uid && <span style={{ fontSize: 10, color: "#7c8a6d" }}>({usersDoc.leiName})</span>}</button>
      </div>
      <button style={{ ...S.linkBtn, marginTop: 20 }} onClick={logout}>Cambia account</button>
    </div>
  );

  if (!loaded) return <div style={S.loadWrap}><div style={{ fontSize: 60, animation: "pop-in 0.6s ease" }}>🐙</div><p style={{ color: "#7c8a6d" }}>Caricamento dati...</p></div>;

  if (screen === "hub") return <><Toast msg={toast} /><Hub onGo={navigate} data={data} save={save} role={role} user={user} usersDoc={usersDoc} logout={logout} /></>;

  return (
    <><Toast msg={toast} /><div style={S.page} key={screen}><div style={{ animation: `${animDir} 0.3s ease` }}>
      <button style={S.backBtn} onClick={() => { goBack(); window.history.back(); }}>← Covo</button>
      {screen === "movies" && <MovieList data={data} save={save} />}
      {screen === "wheel" && <Wheel movies={data.movies} />}
      {screen === "watched" && <Watched data={data} save={save} />}
      {screen === "planner" && <Planner data={data} save={save} />}
      {screen === "reviews" && <Reviews data={data} save={save} role={role} />}
      {screen === "wishlist" && <Wishlist data={data} save={save} role={role} />}
      {screen === "gusti" && <Gusti data={data} save={save} role={role} />}
      {screen === "pigiami" && <Pigiami data={data} save={save} role={role} />}
      {screen === "stats" && <Stats data={data} />}
    </div></div></>
  );
}

function Toast({ msg }) { if (!msg) return null; return <div style={S.toast}>{msg}</div>; }

function Hub({ onGo, data, save, role, user, usersDoc, logout }) {
  const { movies, watched, plans, anniversary } = data;
  const [glow, setGlow] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [sugg, setSugg] = useState(null);
  const [slotAnim, setSlotAnim] = useState(false);
  const [pressedCard, setPressedCard] = useState(null);
  useEffect(() => { const t = setTimeout(() => setGlow(true), 300); return () => clearTimeout(t); }, []);
  const setAnniv = (d) => { save({ ...data, anniversary: d }); setEditingDate(false); };

  const randomSugg = () => {
    setSlotAnim(true); setSugg(null);
    setTimeout(() => {
      setSugg({ act: rnd(RAND_ACT), food: rnd(RAND_FOOD), drink: rnd(RAND_DRINK), movie: movies.length > 0 ? rnd(movies) : null });
      setSlotAnim(false);
    }, 800);
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

  const cardSubs = {
    movies: `${movies.length} film`, wheel: movies.length < 2 ? "min. 2 film" : "Pronto!",
    watched: `${watched.length} visti`, planner: `${plans.length} serate`,
    reviews: `${Object.keys(data.reviews||{}).length} recensioni`,
    wishlist: `${(data.wishlist||[]).filter(w=>w.done).length}/${(data.wishlist||[]).length}`,
    gusti: `${(data.gusti||[]).length} gusti`, pigiami: `${(data.pigiami||[]).length} pigiami`, stats: "Panoramica",
  };

  const annivDM = useCountUp(ai && ai.dM !== 0 ? ai.dM : 0, 1000);
  const annivDA = useCountUp(ai && ai.dA !== 0 ? ai.dA : 0, 1200);

  return (
    <div style={S.hub}>
      <style>{`
        @keyframes orbit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes counter-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes orbit-glow { 0%,100% { box-shadow: 0 0 30px rgba(240,165,0,0.3); } 50% { box-shadow: 0 0 50px rgba(240,165,0,0.35), 0 0 80px rgba(0,184,148,0.15); } }
        @keyframes aurora { 0% { transform: translate(-50%,-50%) scale(1); opacity:0.3; } 33% { transform: translate(-45%,-55%) scale(1.1); opacity:0.45; } 66% { transform: translate(-55%,-48%) scale(0.95); opacity:0.35; } 100% { transform: translate(-50%,-50%) scale(1); opacity:0.3; } }
        @keyframes slot-spin { 0% { transform: translateY(0); opacity:1; } 30% { transform: translateY(-20px); opacity:0; } 70% { transform: translateY(20px); opacity:0; } 100% { transform: translateY(0); opacity:1; } }
        @keyframes card-glow { 0% { box-shadow: 0 0 0 rgba(240,165,0,0); } 50% { box-shadow: 0 0 20px rgba(240,165,0,0.2), inset 0 0 15px rgba(240,165,0,0.05); } 100% { box-shadow: 0 0 0 rgba(240,165,0,0); } }
      `}</style>

      <div style={{ ...S.userBar, animation: "fade-in 0.4s ease" }}>
        <img src={user.photoURL} alt="" style={S.avatar} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#eae2d6" }}>{getGreeting()}, {user.displayName?.split(" ")[0]} <span style={{ color: "#00b894", fontSize: 11 }}>({role})</span></div>
          {oN && <div style={{ fontSize: 11, color: "#7c8a6d" }}>con {oN} 💜</div>}
        </div>
        <button style={S.linkBtn} onClick={logout}>Esci</button>
      </div>

      <div style={{ ...S.annivBanner, animation: "fade-in 0.5s ease 0.1s both" }}>
        {!anniversary || editingDate ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, color: "#f0a500" }}>💜 Quando è il vostro anniversario?</span><input type="date" style={{ ...S.input, textAlign: "center", maxWidth: 200 }} defaultValue={anniversary || ""} onChange={(e) => e.target.value && setAnniv(e.target.value)} /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 11, color: "#7c8a6d", cursor: "pointer" }} onClick={() => setEditingDate(true)}>💜 Insieme da {ai.y > 0 ? `${ai.y} ann${ai.y > 1 ? "i" : "o"} e ` : ""}{ai.m} mes{ai.m !== 1 ? "i" : "e"} · ✏️</div>
            <div style={S.annivCd}>
              <div style={S.annivBox}><div style={S.annivNum}>{ai.dM === 0 ? "🎉" : annivDM}</div><div style={S.annivLbl}>{ai.dM === 0 ? "Mesiversario!" : `giorn${ai.dM !== 1 ? "i" : "o"} al mesiversario`}</div></div>
              <div style={S.annivDiv} />
              <div style={S.annivBox}><div style={{ ...S.annivNum, color: "#00b894" }}>{ai.dA === 0 ? "🎉" : annivDA}</div><div style={S.annivLbl}>{ai.dA === 0 ? "Anniversario!" : `giorn${ai.dA !== 1 ? "i" : "o"} all'anniversario`}</div></div>
            </div>
          </div>
        )}
      </div>

      <TentacleSep />

      <div style={{ ...S.eyeWrap, opacity: glow ? 1 : 0, transform: glow ? "scale(1)" : "scale(0.7)" }}>
        <div style={{ position: "absolute", width: 180, height: 180, left: "50%", top: "50%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(0,184,148,0.3) 0%, rgba(240,165,0,0.15) 40%, transparent 70%)", animation: "aurora 8s ease-in-out infinite", filter: "blur(20px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 130, height: 130, animation: "orbit-spin 12s linear infinite" }}>
          {[...Array(8)].map((_, i) => <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: 3, height: 58, background: "linear-gradient(to bottom,#00b894,transparent)", transformOrigin: "top center", borderRadius: 3, opacity: 0.55, transform: `rotate(${i*45}deg)` }} />)}
        </div>
        <div style={{ position: "absolute", width: 90, height: 90, animation: "counter-spin 18s linear infinite", opacity: 0.3 }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: 2, height: 40, background: "linear-gradient(to bottom,rgba(240,165,0,0.5),transparent)", transformOrigin: "top center", borderRadius: 2, transform: `rotate(${i*60}deg)` }} />)}
        </div>
        <div style={{ ...S.eye, animation: "orbit-glow 5s ease-in-out infinite" }}><div style={S.pupil} /></div>
      </div>

      <h1 style={S.hubTitle}>Covo di Cthulhu</h1>
      <p style={S.hubSub}>{movies.length} film · {watched.length} visti · {plans.length} serate</p>

      <TentacleSep />

      <button style={{ ...S.suggBtn, animation: "fade-in 0.4s ease 0.2s both" }} onClick={randomSugg}>
        {slotAnim ? "🎰 Girando..." : "🎲 Stasera cosa facciamo?"}
      </button>
      {slotAnim && (
        <div style={{ ...S.suggCard, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: 28 }}>
            {["🎭", "🍕", "🍷"].map((e, i) => (
              <span key={i} style={{ animation: `slot-spin 0.4s ease ${i * 0.15}s infinite` }}>{e}</span>
            ))}
          </div>
        </div>
      )}
      {sugg && !slotAnim && (
        <div style={{ ...S.suggCard, animation: "pop-in 0.4s ease" }}>
          <div style={{ fontWeight: 800, color: "#f0a500", fontSize: 14, marginBottom: 6 }}>Proposta della serata:</div>
          {[{ icon: "🎭", text: sugg.act, delay: 0 }, { icon: "🍕", text: sugg.food, delay: 0.1 }, { icon: "🍷", text: sugg.drink, delay: 0.2 }, ...(sugg.movie ? [{ icon: "🎬", text: sugg.movie, delay: 0.3 }] : [])].map((item, i) => (
            <div key={i} style={{ animation: `fade-in 0.3s ease ${item.delay}s both` }}>{item.icon} {item.text}</div>
          ))}
          <button style={{ ...S.suggBtn, marginTop: 8, fontSize: 12, padding: "8px 0" }} onClick={randomSugg}>🔄 Altra proposta</button>
        </div>
      )}

      <div style={S.grid}>
        {SECTIONS.map((s, i) => (
          <button key={s.id} style={{ ...S.card, animation: `pop-in 0.35s ease ${0.1 + i * 0.05}s both`, ...(pressedCard === s.id ? { animation: "card-glow 0.6s ease", borderColor: "rgba(240,165,0,0.35)" } : {}) }}
            onClick={() => { setPressedCard(s.id); setTimeout(() => { setPressedCard(null); onGo(s.id); }, 300); }}>
            <span style={S.cardIcon}>{s.icon}</span>
            <span style={S.cardLbl}>{s.label}</span>
            <span style={{ fontSize: 10, color: "#7c8a6d", marginTop: -2 }}>{cardSubs[s.id]}</span>
          </button>
        ))}
      </div>
      <p style={S.footer}>Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn 🐙</p>
    </div>
  );
}

function MovieList({ data, save }) {
  const [inp, setInp] = useState(""); const [cat, setCat] = useState("altro"); const [search, setSearch] = useState("");
  const add = () => { const t = inp.trim(); if (!t || data.movies.includes(t)) return; save({ ...data, movies: [...data.movies, t], votes: { ...data.votes, [t]: { lui: 0, lei: 0 } }, categories: { ...(data.categories||{}), [t]: cat } }); setInp(""); };
  const rm = (m) => { const v = { ...data.votes }; delete v[m]; const c = { ...(data.categories||{}) }; delete c[m]; const r = { ...(data.reactions||{}) }; delete r[m]; save({ ...data, movies: data.movies.filter(x => x !== m), votes: v, categories: c, reactions: r }); };
  const filtered = data.movies.filter(m => m.toLowerCase().includes(search.toLowerCase()));
  const gc = (m) => CATEGORIES.find(c => c.id === ((data.categories||{})[m] || "altro")) || CATEGORIES[9];
  const grouped = {}; filtered.forEach(m => { const c = gc(m); if (!grouped[c.id]) grouped[c.id] = { cat: c, items: [] }; grouped[c.id].items.push(m); });
  return (
    <div style={S.sec}><h2 style={S.secTitle}>📋 Lista Film</h2>
      {data.movies.length > 3 && <input style={{ ...S.input, marginBottom: 4 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Cerca film..." />}
      <div style={S.row}><input style={S.input} value={inp} onChange={(e) => setInp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Aggiungi un film..." /><button style={S.addBtn} onClick={add}>+</button></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{CATEGORIES.map(c => <button key={c.id} onClick={() => setCat(c.id)} style={{ ...S.catChip, background: cat === c.id ? c.color + "33" : "transparent", borderColor: cat === c.id ? c.color : "rgba(255,255,255,0.06)", fontSize: cat === c.id ? 12 : 11 }}>{c.icon} {c.label}</button>)}</div>
      {filtered.length === 0 && <p style={S.empty}>{search ? "Nessun risultato!" : "La lista è vuota!"}</p>}
      {Object.values(grouped).map(({ cat: mc, items }) => (
        <div key={mc.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px 0 6px" }}>
            <span style={{ fontSize: 16 }}>{mc.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: mc.color }}>{mc.label}</span>
            <span style={{ fontSize: 10, color: "#7c8a6d" }}>({items.length})</span>
            <div style={{ flex: 1, height: 1, background: mc.color + "33" }} />
          </div>
          {items.map((m, i) => <div key={m} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both`, borderLeft: `3px solid ${mc.color}` }}><span style={S.itemText}>{m}</span><button style={S.xBtn} onClick={() => rm(m)}>✕</button></div>)}
        </div>
      ))}
      <p style={S.count}>{data.movies.length} film in lista</p>
    </div>
  );
}

function Wheel({ movies }) {
  const [rot, setRot] = useState(0); const [spinning, setSpinning] = useState(false); const [picked, setPicked] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const spin = () => {
    if (movies.length < 2 || spinning) return; setSpinning(true); setPicked(null);
    const nr = rot + 1440 + Math.random() * 1440; setRot(nr);
    setTimeout(() => { const seg = 360/movies.length; const norm = nr%360; const idx = Math.floor(((360-norm+seg/2)%360)/seg)%movies.length; setPicked(movies[idx]); setSpinning(false); setConfettiKey(k=>k+1); }, 3600);
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

function Watched({ data, save }) {
  const mw = (m) => { save({ ...data, movies: data.movies.filter(x => x !== m), watched: [...data.watched, { title: m, date: new Date().toLocaleDateString("it-IT") }] }); };
  const uw = (t) => { save({ ...data, watched: data.watched.filter(w => w.title !== t), movies: [...data.movies, t] }); };
  return (
    <div style={S.sec}><h2 style={S.secTitle}>✅ Già Visti</h2>
      {data.movies.length > 0 && <><p style={{ fontSize: 12, color: "#7c8a6d", margin: 0 }}>Segna come visto:</p><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{data.movies.map(m => <button key={m} style={S.chip} onClick={() => mw(m)}>{m} ✓</button>)}</div></>}
      {data.watched.length === 0 && <p style={S.empty}>Nessun film visto ancora!</p>}
      {data.watched.map((w, i) => <div key={i} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both` }}><span>🎬</span><span style={S.itemText}>{w.title}</span><span style={{ fontSize: 11, color: "#7c8a6d" }}>{w.date}</span><button style={S.xBtn} onClick={() => uw(w.title)}>↩</button></div>)}
    </div>
  );
}

function Planner({ data, save }) {
  const [f, sF] = useState({ date:"", time:"", movie:"", activity:"", place:"", food:"", drink:"", note:"" });
  const add = () => { if (!f.date) return; save({ ...data, plans: [...data.plans, { ...f, id: Date.now() }] }); sF({ date:"", time:"", movie:"", activity:"", place:"", food:"", drink:"", note:"" }); };
  const rm = (id) => save({ ...data, plans: data.plans.filter(p => p.id !== id) });
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
      {data.plans.length === 0 && <p style={S.empty}>Nessuna serata pianificata!</p>}
      {[...data.plans].reverse().map((p, i) => <div key={p.id} style={{ ...S.planCard, animation: `fade-in 0.3s ease ${i*0.05}s both` }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 700, color: "#f0a500" }}>📅 {p.date}{p.time?` · 🕐 ${p.time}`:""}</span><button style={S.xBtn} onClick={() => rm(p.id)}>✕</button></div>{p.movie&&<div>🎬 {p.movie}</div>}{p.activity&&<div>🎭 {p.activity}</div>}{p.place&&<div>📍 {p.place}</div>}{p.food&&<div>🍕 {p.food}</div>}{p.drink&&<div>🍷 {p.drink}</div>}{p.note&&<div style={{ fontSize: 12, color: "#7c8a6d", fontStyle: "italic" }}>"{p.note}"</div>}</div>)}
    </div>
  );
}

function Reviews({ data, save, role }) {
  const [sel, setSel] = useState(""); const [score, setScore] = useState(7); const [comment, setComment] = useState("");
  const all = [...new Set([...data.movies, ...data.watched.map(w => w.title)])];
  const add = () => { if (!sel) return; const ex = data.reviews[sel]||{}; save({ ...data, reviews: { ...data.reviews, [sel]: { ...ex, [role]: score, [`${role}Comment`]: comment, avg: +((score + (ex[role==="lui"?"lei":"lui"]||score))/2).toFixed(1), date: new Date().toLocaleDateString("it-IT") } } }); setSel(""); setComment(""); };
  const rev = Object.entries(data.reviews||{}).sort((a,b) => (b[1].avg||0)-(a[1].avg||0));
  return (
    <div style={S.sec}><h2 style={S.secTitle}>📝 Recensioni</h2>
      <p style={{ fontSize: 12, color: "#7c8a6d", margin: 0 }}>Recensisci come <strong style={{ color: "#f0a500" }}>{role}</strong></p>
      <div style={S.formGroup}>
        <select style={S.input} value={sel} onChange={e => setSel(e.target.value)}><option value="">— Scegli film —</option>{all.map(m => <option key={m}>{m}</option>)}</select>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><label style={{ fontSize: 13, width: 60 }}>{role==="lui"?"🙋‍♂️":"🙋‍♀️"} Voto</label><input type="range" min="1" max="10" value={score} onChange={e => setScore(+e.target.value)} style={{ flex: 1 }} /><span style={S.scoreBadge}>{score}</span></div>
        <input style={S.input} placeholder="Un commento..." value={comment} onChange={e => setComment(e.target.value)} />
        <button style={S.bigBtn} onClick={add}>📝 Salva Recensione</button>
      </div>
      {rev.length === 0 && <p style={S.empty}>Nessuna recensione!</p>}
      {rev.map(([t, r], i) => (
        <div key={t} style={{ ...S.reviewCard, animation: `fade-in 0.3s ease ${i*0.05}s both` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{t}</span>
            <span style={{ ...S.scoreBadge, fontSize: 16, background: r.avg>=7?"rgba(76,175,80,.25)":r.avg>=5?"rgba(255,193,7,.25)":"rgba(233,69,96,.25)", color: r.avg>=7?"#81c784":r.avg>=5?"#ffd54f":"#e94560" }}>{r.avg}/10</span>
          </div>
          <div style={{ fontSize: 12, display: "flex", gap: 12 }}>{r.lui!==undefined&&<span>🙋‍♂️ {r.lui}/10</span>}{r.lei!==undefined&&<span>🙋‍♀️ {r.lei}/10</span>}<span style={{ color: "#7c8a6d" }}>{r.date}</span></div>
          {r.lui !== undefined && r.lei !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 10, color: "#4fc3f7" }}>🙋‍♂️</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, overflow: "hidden", background: "rgba(255,255,255,0.04)", display: "flex" }}>
                <div style={{ width: `${(r.lui/10)*100}%`, background: "linear-gradient(90deg, #4fc3f7, #4fc3f788)", borderRadius: 3 }} />
              </div>
              <div style={{ flex: 1, height: 6, borderRadius: 3, overflow: "hidden", background: "rgba(255,255,255,0.04)", display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: `${(r.lei/10)*100}%`, background: "linear-gradient(270deg, #ec4899, #ec489988)", borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 10, color: "#ec4899" }}>🙋‍♀️</span>
            </div>
          )}
          {r.luiComment&&<div style={{ fontSize: 12, color: "#aaa" }}>🙋‍♂️ "{r.luiComment}"</div>}
          {r.leiComment&&<div style={{ fontSize: 12, color: "#aaa" }}>🙋‍♀️ "{r.leiComment}"</div>}
        </div>
      ))}
    </div>
  );
}

function Wishlist({ data, save, role }) {
  const [inp, setInp] = useState(""); const [type, setType] = useState("serie"); const [note, setNote] = useState("");
  const add = () => { const t = inp.trim(); if (!t) return; save({ ...data, wishlist: [...(data.wishlist||[]), { id: Date.now(), title: t, type, note, addedBy: role, date: new Date().toLocaleDateString("it-IT"), done: false }] }); setInp(""); setNote(""); };
  const toggle = (id) => save({ ...data, wishlist: data.wishlist.map(w => w.id===id ? { ...w, done: !w.done } : w) });
  const rm = (id) => save({ ...data, wishlist: data.wishlist.filter(w => w.id !== id) });
  const grouped = {}; (data.wishlist||[]).forEach(w => { if (!grouped[w.type]) grouped[w.type] = []; grouped[w.type].push(w); });
  const total = (data.wishlist||[]).length; const done = (data.wishlist||[]).filter(w=>w.done).length; const pct = total>0?Math.round((done/total)*100):0;
  return (
    <div style={S.sec}><h2 style={S.secTitle}>💫 Wishlist Condivisa</h2>
      {total > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #00b894, #f0a500)", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#f0a500", minWidth: 40, textAlign: "right" }}>{pct}%</span>
        </div>
      )}
      <div style={S.formGroup}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{WISH_TYPES.map(wt => <button key={wt.id} onClick={() => setType(wt.id)} style={{ ...S.catChip, background: type===wt.id?"rgba(0,184,148,0.25)":"transparent", borderColor: type===wt.id?"#00b894":"rgba(255,255,255,0.06)" }}>{wt.icon} {wt.label}</button>)}</div>
        <input style={S.input} value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key==="Enter"&&add()} placeholder="Cosa volete fare/vedere/provare?" />
        <input style={S.input} value={note} onChange={e => setNote(e.target.value)} placeholder="📝 Note (opzionale)" />
        <button style={S.bigBtn} onClick={add}>+ Aggiungi alla Wishlist</button>
      </div>
      {Object.keys(grouped).length === 0 && <p style={S.empty}>La wishlist è vuota!</p>}
      {WISH_TYPES.map(wt => { const items = grouped[wt.id]; if (!items) return null; return <div key={wt.id}><h3 style={{ fontSize: 14, color: "#7c8a6d", margin: "8px 0 6px" }}>{wt.icon} {wt.label}</h3>{items.map((w, i) => <div key={w.id} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both`, opacity: w.done?0.5:1 }}><button style={{ ...S.emojiBtn, fontSize: 18 }} onClick={() => toggle(w.id)}>{w.done?"✅":"⬜"}</button><div style={{ flex: 1 }}><div style={{ ...S.itemText, textDecoration: w.done?"line-through":"none" }}>{w.title}</div>{w.note&&<div style={{ fontSize: 11, color: "#7c8a6d" }}>{w.note}</div>}<div style={{ fontSize: 10, color: "#4a6a3e" }}>aggiunto da {w.addedBy==="lui"?"🙋‍♂️":"🙋‍♀️"} · {w.date}</div></div><button style={S.xBtn} onClick={() => rm(w.id)}>✕</button></div>)}</div>; })}
    </div>
  );
}

const GUSTI_CATS = [
  { id: "cibo", icon: "🍕", label: "Cibo" }, { id: "musica", icon: "🎵", label: "Musica" },
  { id: "hobby", icon: "🎮", label: "Hobby" }, { id: "viaggio", icon: "✈️", label: "Viaggi" },
  { id: "film_genere", icon: "🎬", label: "Film/Serie" }, { id: "altro_g", icon: "💚", label: "Altro" },
];

function Gusti({ data, save, role }) {
  const [inp, setInp] = useState(""); const [cat, setCat] = useState("cibo"); const [tab, setTab] = useState("miei");
  const gusti = data.gusti || []; const otherRole = role === "lui" ? "lei" : "lui";
  const add = () => { const t = inp.trim(); if (!t) return; save({ ...data, gusti: [...gusti, { id: Date.now(), text: t, cat, owner: role, likes: [], date: new Date().toLocaleDateString("it-IT") }] }); setInp(""); };
  const rm = (id) => save({ ...data, gusti: gusti.filter(g => g.id !== id) });
  const toggleLike = (id) => { save({ ...data, gusti: gusti.map(g => { if (g.id !== id) return g; const likes = g.likes || []; return { ...g, likes: likes.includes(role) ? likes.filter(l => l !== role) : [...likes, role] }; })}); };
  const miei = gusti.filter(g => g.owner === role); const altri = gusti.filter(g => g.owner === otherRole);
  const matched = gusti.filter(g => (g.likes||[]).includes("lui") && (g.likes||[]).includes("lei") || ((g.likes||[]).includes(otherRole) && g.owner === role) || ((g.likes||[]).includes(role) && g.owner === otherRole));

  const renderList = (items, canDelete, canLike) => {
    const grouped = {}; items.forEach(g => { if (!grouped[g.cat]) grouped[g.cat] = []; grouped[g.cat].push(g); });
    if (items.length === 0) return <p style={S.empty}>{tab === "miei" ? "Aggiungi le cose che ti piacciono!" : tab === "altri" ? `${otherRole === "lui" ? "Lui" : "Lei"} non ha ancora aggiunto nulla` : "Nessun match ancora!"}</p>;
    return GUSTI_CATS.map(gc => {
      const catItems = grouped[gc.id]; if (!catItems) return null;
      return (<div key={gc.id}><h3 style={{ fontSize: 13, color: "#7c8a6d", margin: "10px 0 6px" }}>{gc.icon} {gc.label}</h3>
        {catItems.map((g, i) => {
          const isLiked = (g.likes||[]).includes(role);
          const isMatched = (g.likes||[]).includes("lui") && (g.likes||[]).includes("lei") || (g.owner !== role && isLiked);
          return (<div key={g.id} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both`, borderLeft: isMatched ? "3px solid #f0a500" : "3px solid rgba(255,255,255,0.06)" }}>
            {canLike && <button onClick={() => toggleLike(g.id)} style={{ ...S.emojiBtn, fontSize: 18, background: isLiked ? "rgba(240,165,0,0.2)" : "transparent" }}>{isLiked ? "💛" : "🤍"}</button>}
            <div style={{ flex: 1 }}><div style={S.itemText}>{g.text}</div><div style={{ fontSize: 10, color: "#7a8a6e" }}>{g.owner === "lui" ? "🙋‍♂️" : "🙋‍♀️"} · {g.date}{isMatched && " · 💛 Match!"}</div></div>
            {canDelete && g.owner === role && <button style={S.xBtn} onClick={() => rm(g.id)}>✕</button>}
          </div>);
        })}</div>);
    });
  };

  return (
    <div style={S.sec}><h2 style={S.secTitle}>💚 I Nostri Gusti</h2>
      <div style={S.gustiTabs}>
        <button onClick={() => setTab("miei")} style={{ ...S.gustiTab, ...(tab === "miei" ? S.gustiTabActive : {}) }}>{role === "lui" ? "🙋‍♂️" : "🙋‍♀️"} I Miei ({miei.length})</button>
        <button onClick={() => setTab("altri")} style={{ ...S.gustiTab, ...(tab === "altri" ? S.gustiTabActive : {}) }}>{otherRole === "lui" ? "🙋‍♂️" : "🙋‍♀️"} Suoi ({altri.length})</button>
        <button onClick={() => setTab("match")} style={{ ...S.gustiTab, ...(tab === "match" ? S.gustiTabActive : {}) }}>💛 Match ({matched.length})</button>
      </div>
      {tab === "miei" && (<div style={S.formGroup}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{GUSTI_CATS.map(c => (<button key={c.id} onClick={() => setCat(c.id)} style={{ ...S.catChip, background: cat===c.id ? "rgba(240,165,0,0.2)" : "transparent", borderColor: cat===c.id ? "#f0a500" : "rgba(255,255,255,0.06)" }}>{c.icon} {c.label}</button>))}</div><div style={S.row}><input style={S.input} value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key==="Enter"&&add()} placeholder="Cosa ti piace? Es: Sushi, Rock, Hiking..." /><button style={S.addBtn} onClick={add}>+</button></div></div>)}
      {tab === "altri" && <p style={{ fontSize: 12, color: "#7c8a6d", margin: 0 }}>Tocca 🤍 per dire che piace anche a te!</p>}
      {tab === "match" && <p style={{ fontSize: 12, color: "#f0a500", margin: 0 }}>Le cose che piacciono a entrambi 💛</p>}
      {tab === "miei" && renderList(miei, true, false)}
      {tab === "altri" && renderList(altri, false, true)}
      {tab === "match" && renderList(matched, false, false)}
    </div>
  );
}

function Pigiami({ data, save, role }) {
  const [name, setName] = useState(""); const [owner, setOwner] = useState(role); const [emoji, setEmoji] = useState("👘");
  const [comodita, setComodita] = useState(5); const [adattabilita, setAdattabilita] = useState(5); const [cute, setCute] = useState(5);
  const pigiami = data.pigiami || []; const sorted = [...pigiami].sort((a, b) => b.avg - a.avg); const podium = sorted.slice(0, 3);
  const add = () => { const t = name.trim(); if (!t) return; const avg = +((comodita + adattabilita + cute) / 3).toFixed(1); save({ ...data, pigiami: [...pigiami, { id: Date.now(), name: t, owner, emoji, comodita, adattabilita, cute, avg, date: new Date().toLocaleDateString("it-IT") }] }); setName(""); setComodita(5); setAdattabilita(5); setCute(5); };
  const rm = (id) => save({ ...data, pigiami: pigiami.filter(p => p.id !== id) });
  const medals = ["🥇", "🥈", "🥉"];
  const podiumOrder = podium.length >= 3 ? [podium[1], podium[0], podium[2]] : podium;
  const podiumHeights = podium.length >= 3 ? [90, 120, 70] : podium.length === 2 ? [90, 120] : [120];
  const podiumLabels = podium.length >= 3 ? ["2°", "1°", "3°"] : podium.length === 2 ? ["2°", "1°"] : ["1°"];
  const podiumColors = podium.length >= 3 ? ["rgba(192,192,192,0.25)", "rgba(240,165,0,0.3)", "rgba(205,127,50,0.2)"] : podium.length === 2 ? ["rgba(192,192,192,0.25)", "rgba(240,165,0,0.3)"] : ["rgba(240,165,0,0.3)"];

  return (
    <div style={S.sec}><h2 style={S.secTitle}>🛌 Classifica Pigiami</h2>
      <div style={S.formGroup}>
        <input style={S.input} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Nome del pigiama..." />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setOwner("lui")} style={{ ...S.catChip, flex: 1, textAlign: "center", background: owner === "lui" ? "rgba(0,184,148,0.2)" : "transparent", borderColor: owner === "lui" ? "#00b894" : "rgba(255,255,255,0.06)" }}>🙋‍♂️ Lui</button>
          <button onClick={() => setOwner("lei")} style={{ ...S.catChip, flex: 1, textAlign: "center", background: owner === "lei" ? "rgba(0,184,148,0.2)" : "transparent", borderColor: owner === "lei" ? "#00b894" : "rgba(255,255,255,0.06)" }}>🙋‍♀️ Lei</button>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{PJ_EMOJIS.map(e => (<button key={e} onClick={() => setEmoji(e)} style={{ ...S.emojiBtn, fontSize: 22, padding: "4px 8px", background: emoji === e ? "rgba(240,165,0,0.2)" : "transparent", borderColor: emoji === e ? "#f0a500" : "rgba(255,255,255,0.06)" }}>{e}</button>))}</div>
        {[{ label: "😴 Comodità", val: comodita, set: setComodita }, { label: "🔄 Adattabilità", val: adattabilita, set: setAdattabilita }, { label: "💕 Cute", val: cute, set: setCute }].map(s => (
          <div key={s.label} style={{ display: "flex", gap: 8, alignItems: "center" }}><label style={{ fontSize: 13, width: 100, color: "#eae2d6" }}>{s.label}</label><input type="range" min="1" max="10" value={s.val} onChange={e => s.set(+e.target.value)} style={{ flex: 1 }} /><span style={S.scoreBadge}>{s.val}</span></div>
        ))}
        <div style={{ textAlign: "center", fontSize: 13, color: "#7c8a6d" }}>Media: <strong style={{ color: "#f0a500", fontSize: 16 }}>{((comodita + adattabilita + cute) / 3).toFixed(1)}</strong></div>
        <button style={S.bigBtn} onClick={add}>+ Aggiungi Pigiama</button>
      </div>
      {podium.length > 0 && (<div style={{ marginTop: 8 }}><h3 style={{ fontSize: 14, color: "#7c8a6d", margin: "0 0 12px", textAlign: "center" }}>🏆 Podio</h3>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10 }}>
          {podiumOrder.map((p, i) => (<div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: `pop-in 0.4s ease ${0.1 + i * 0.1}s both` }}>
            <div style={{ fontSize: 32, marginBottom: 2 }}>{p.emoji || "👘"}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#eae2d6", textAlign: "center", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#f0a500" }}>{p.avg}</div>
            <div style={{ width: 80, height: podiumHeights[i], borderRadius: "12px 12px 0 0", background: podiumColors[i], border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#eae2d6", marginTop: 4 }}>{podiumLabels[i]}</div>
          </div>))}
        </div>
        <div style={{ height: 2, background: "rgba(240,165,0,0.2)", borderRadius: 1 }} />
      </div>)}
      {sorted.length === 0 && <p style={S.empty}>Nessun pigiama in classifica!</p>}
      {sorted.length > 0 && <h3 style={{ fontSize: 14, color: "#7c8a6d", margin: "12px 0 6px" }}>📊 Classifica Completa</h3>}
      {sorted.map((p, i) => (
        <div key={p.id} style={{ ...S.item, animation: `fade-in 0.3s ease ${i * 0.04}s both`, borderLeft: `3px solid ${i < 3 ? "#f0a500" : "rgba(255,255,255,0.06)"}` }}>
          <span style={{ fontSize: 18, minWidth: 28, textAlign: "center" }}>{i < 3 ? medals[i] : `${i + 1}°`}</span>
          <span style={{ fontSize: 20 }}>{p.emoji || "👘"}</span>
          <div style={{ flex: 1 }}><div style={S.itemText}>{p.name}</div><div style={{ fontSize: 10, color: "#7c8a6d" }}>{p.owner === "lui" ? "🙋‍♂️" : "🙋‍♀️"} · 😴{p.comodita} · 🔄{p.adattabilita} · 💕{p.cute} · {p.date}</div></div>
          <span style={{ ...S.scoreBadge, fontSize: 16, background: p.avg >= 7 ? "rgba(76,175,80,.25)" : p.avg >= 5 ? "rgba(255,193,7,.25)" : "rgba(233,69,96,.25)", color: p.avg >= 7 ? "#81c784" : p.avg >= 5 ? "#ffd54f" : "#e94560" }}>{p.avg}</span>
          <button style={S.xBtn} onClick={() => rm(p.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

function Stats({ data }) {
  const tw = data.watched.length; const rv = Object.values(data.reviews||{});
  const avgL = rv.filter(r=>r.lui!==undefined).length>0 ? (rv.reduce((s,r)=>s+(r.lui||0),0)/rv.filter(r=>r.lui!==undefined).length).toFixed(1) : "-";
  const avgE = rv.filter(r=>r.lei!==undefined).length>0 ? (rv.reduce((s,r)=>s+(r.lei||0),0)/rv.filter(r=>r.lei!==undefined).length).toFixed(1) : "-";
  const avgT = rv.length>0 ? (rv.reduce((s,r)=>s+(r.avg||0),0)/rv.length).toFixed(1) : "-";
  let mv="-", mx=0; Object.entries(data.votes||{}).forEach(([m,v])=>{ const t=(v.lui||0)+(v.lei||0); if(t>mx){mx=t;mv=m;} });
  let bm="-", bs=0; Object.entries(data.reviews||{}).forEach(([m,r])=>{ if((r.avg||0)>bs){bs=r.avg;bm=m;} });
  let wm="-", ws=11; Object.entries(data.reviews||{}).forEach(([m,r])=>{ if(r.avg!==undefined&&r.avg<ws){ws=r.avg;wm=m;} });
  const cc={}; data.movies.forEach(m=>{ const c=(data.categories||{})[m]||"altro"; cc[c]=(cc[c]||0)+1; }); const tc=Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]; const tci=tc?CATEGORIES.find(c=>c.id===tc[0]):null;
  const rc={}; Object.values(data.reactions||{}).forEach(r=>Object.values(r).forEach(e=>{rc[e]=(rc[e]||0)+1;})); const tr=Object.entries(rc).sort((a,b)=>b[1]-a[1])[0];
  const revEntries = Object.entries(data.reviews||{});
  const avgSpark = revEntries.length>=2 ? revEntries.map(([,r])=>r.avg||0) : null;
  const luiSpark = revEntries.filter(([,r])=>r.lui!==undefined).length>=2 ? revEntries.filter(([,r])=>r.lui!==undefined).map(([,r])=>r.lui) : null;
  const leiSpark = revEntries.filter(([,r])=>r.lei!==undefined).length>=2 ? revEntries.filter(([,r])=>r.lei!==undefined).map(([,r])=>r.lei) : null;
  const stats=[
    {l:"Film in lista",v:data.movies.length,i:"📋"},{l:"Film visti insieme",v:tw,i:"✅"},{l:"Serate pianificate",v:data.plans.length,i:"🕯️"},
    {l:"Wishlist",v:`${(data.wishlist||[]).filter(w=>w.done).length}/${(data.wishlist||[]).length}`,i:"💫"},{l:"Recensioni",v:rv.length,i:"📝"},
    {l:"Media voto Lui",v:avgL,i:"🙋‍♂️",spark:luiSpark,sparkColor:"#4fc3f7"},
    {l:"Media voto Lei",v:avgE,i:"🙋‍♀️",spark:leiSpark,sparkColor:"#ec4899"},
    {l:"Media di coppia",v:avgT,i:"💜",spark:avgSpark,sparkColor:"#f0a500"},
    {l:"Più votato",v:mv,i:"🏆"},{l:"Miglior film",v:bm!=="-"?`${bm} (${bs})`:"-",i:"👑"},
    {l:"Peggior film",v:wm!=="-"&&ws<11?`${wm} (${ws})`:"-",i:"💩"},
    {l:"Genere preferito",v:tci?`${tci.icon} ${tci.label} (${tc[1]})`:"-",i:"🎭"},
    {l:"Reazione top",v:tr?`${tr[0]} (${tr[1]}x)`:"-",i:"😍"},
  ];
  return (
    <div style={S.sec}><h2 style={S.secTitle}>📊 Statistiche di Coppia</h2>
      {stats.map((s, i) => (<div key={i} style={{ ...S.statRow, animation: `fade-in 0.3s ease ${i*0.04}s both` }}>
        <span style={{ fontSize: 20 }}>{s.i}</span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: "#7c8a6d" }}>{s.l}</div>
          <div style={{ display: "flex", alignItems: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color: "#eae2d6" }}>{s.v}</div>{s.spark && <Sparkline values={s.spark} color={s.sparkColor} />}</div>
        </div>
      </div>))}
    </div>
  );
}

const S = {
  loadWrap:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a1f16",fontFamily:"'Nunito',sans-serif"},
  authPage:{fontFamily:"'Nunito',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"linear-gradient(170deg,#0a1f16 0%,#0f2e1f 40%,#132e1a 100%)",padding:24},
  googleBtn:{display:"flex",alignItems:"center",padding:"12px 28px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.06)",color:"#eae2d6",fontSize:15,fontWeight:700,cursor:"pointer"},
  roleBtn:{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"20px 28px",borderRadius:16,border:"1px solid rgba(0,184,148,0.2)",background:"rgba(255,255,255,0.04)",color:"#eae2d6",fontSize:15,fontWeight:700,cursor:"pointer"},
  linkBtn:{border:"none",background:"transparent",color:"#7c8a6d",fontSize:12,cursor:"pointer",textDecoration:"underline"},
  userBar:{display:"flex",alignItems:"center",gap:10,width:"100%",maxWidth:360,marginBottom:12,padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:14,border:"1px solid rgba(255,255,255,0.04)"},
  avatar:{width:36,height:36,borderRadius:"50%",border:"2px solid rgba(0,184,148,0.3)"},
  page:{fontFamily:"'Nunito',sans-serif",maxWidth:440,margin:"0 auto",padding:16,minHeight:"100vh",background:"linear-gradient(170deg,#0a1f16 0%,#0f2e1f 40%,#132e1a 100%)",color:"#eae2d6"},
  hub:{fontFamily:"'Nunito',sans-serif",maxWidth:440,margin:"0 auto",padding:"24px 20px 20px",minHeight:"100vh",background:"linear-gradient(170deg,#0a1f16 0%,#0f2e1f 40%,#132e1a 100%)",color:"#eae2d6",display:"flex",flexDirection:"column",alignItems:"center"},
  toast:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"rgba(0,184,148,0.92)",color:"#fff",padding:"10px 20px",borderRadius:12,fontSize:13,fontWeight:700,zIndex:9999,animation:"pop-in 0.3s ease",maxWidth:"90vw",textAlign:"center",backdropFilter:"blur(8px)"},
  annivBanner:{width:"100%",maxWidth:360,padding:"14px 16px",background:"rgba(240,165,0,0.06)",border:"1px solid rgba(240,165,0,0.12)",borderRadius:16,marginBottom:8},
  annivCd:{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginTop:4},
  annivBox:{display:"flex",flexDirection:"column",alignItems:"center",gap:2},
  annivNum:{fontSize:28,fontWeight:900,color:"#f0a500",lineHeight:1},
  annivLbl:{fontSize:10,color:"#7c8a6d",textAlign:"center"},
  annivDiv:{width:1,height:36,background:"rgba(255,255,255,0.08)"},
  eyeWrap:{position:"relative",width:140,height:140,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 1s ease",marginBottom:8,marginTop:4},
  eye:{width:56,height:56,borderRadius:"50%",background:"radial-gradient(circle,#00b894 0%,#00b89466 60%,#0a1f16 100%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 30px rgba(0,184,148,0.3)",zIndex:2},
  pupil:{width:18,height:28,borderRadius:"50%",background:"#0a1f16"},
  hubTitle:{margin:"0 0 4px",fontSize:30,fontWeight:900,background:"linear-gradient(135deg,#00b894,#f0a500)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-0.5},
  hubSub:{margin:"0 0 8px",fontSize:13,color:"#7c8a6d"},
  suggBtn:{width:"100%",maxWidth:360,padding:"12px 0",border:"2px dashed rgba(240,165,0,0.3)",borderRadius:14,background:"rgba(240,165,0,0.06)",color:"#f0a500",fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:12},
  suggCard:{width:"100%",maxWidth:360,padding:16,background:"rgba(240,165,0,0.08)",border:"1px solid rgba(240,165,0,0.2)",borderRadius:14,marginBottom:16,fontSize:14},
  grid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,width:"100%",maxWidth:360},
  card:{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"18px 12px",border:"1px solid rgba(240,165,0,0.12)",borderRadius:16,background:"rgba(255,255,255,0.03)",color:"#eae2d6",fontSize:14,fontWeight:700,cursor:"pointer",transition:"all 0.2s ease"},
  cardIcon:{fontSize:28},cardLbl:{fontSize:13},
  footer:{marginTop:32,fontSize:10,color:"#2a4a2e",textAlign:"center",fontStyle:"italic"},
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
  vBtn:{flex:1,padding:"9px 0",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,background:"rgba(255,255,255,0.03)",color:"#eae2d6",fontSize:12,fontWeight:700,cursor:"pointer"},
  rstBtn:{width:36,border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,background:"transparent",color:"#7c8a6d",fontSize:15,cursor:"pointer"},
  emojiBtn:{border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,background:"transparent",fontSize:14,padding:"4px 6px",cursor:"pointer",transition:"background 0.15s"},
  bar:{display:"flex",height:5,borderRadius:3,overflow:"hidden",background:"rgba(255,255,255,0.04)"},
  barL:{background:"#4fc3f7",transition:"width .3s"},barR:{background:"#e94560",transition:"width .3s"},
  chip:{padding:"6px 12px",border:"1px solid rgba(0,184,148,0.2)",borderRadius:20,background:"rgba(0,184,148,0.06)",color:"#00b894",fontSize:12,fontWeight:600,cursor:"pointer"},
  catChip:{padding:"5px 10px",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,color:"#eae2d6",fontSize:11,fontWeight:600,cursor:"pointer",background:"transparent"},
  formGroup:{display:"flex",flexDirection:"column",gap:10},
  planCard:{padding:14,background:"rgba(255,255,255,0.04)",borderRadius:12,display:"flex",flexDirection:"column",gap:6,fontSize:13},
  reviewCard:{padding:14,background:"rgba(255,255,255,0.04)",borderRadius:12,display:"flex",flexDirection:"column",gap:6},
  scoreBadge:{fontSize:14,fontWeight:800,background:"rgba(240,165,0,0.15)",color:"#f0a500",padding:"3px 10px",borderRadius:8,minWidth:28,textAlign:"center"},
  gustiTabs:{display:"flex",gap:4,background:"rgba(255,255,255,0.03)",borderRadius:12,padding:4},
  gustiTab:{flex:1,padding:"10px 0",border:"none",borderRadius:10,background:"transparent",color:"#7c8a6d",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .2s"},
  gustiTabActive:{background:"rgba(240,165,0,0.15)",color:"#f0a500"},
  statRow:{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",background:"rgba(255,255,255,0.04)",borderRadius:12},
};
