import { useState, useEffect, useCallback, useRef } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";

const DOC_REF = () => doc(db, "covo", "shared");
const USERS_REF = () => doc(db, "covo", "users");

const SECTIONS = [
  { id: "movies", icon: "📋", label: "Lista Film" },
  { id: "wheel", icon: "🎰", label: "Estrazione" },
  { id: "votes", icon: "⭐", label: "Votazione" },
  { id: "watched", icon: "✅", label: "Già Visti" },
  { id: "planner", icon: "🕯️", label: "Date Night" },
  { id: "reviews", icon: "📝", label: "Recensioni" },
  { id: "wishlist", icon: "💫", label: "Wishlist" },
  { id: "stats", icon: "📊", label: "Statistiche" },
];

const CATEGORIES = [
  { id: "azione", icon: "💥", label: "Azione", color: "#e94560" },
  { id: "commedia", icon: "😂", label: "Commedia", color: "#f5a623" },
  { id: "horror", icon: "👻", label: "Horror", color: "#8b5cf6" },
  { id: "romantico", icon: "💕", label: "Romantico", color: "#ec4899" },
  { id: "scifi", icon: "🚀", label: "Sci-Fi", color: "#06b6d4" },
  { id: "thriller", icon: "🔪", label: "Thriller", color: "#ef4444" },
  { id: "dramma", icon: "🎭", label: "Dramma", color: "#3b82f6" },
  { id: "animazione", icon: "🎨", label: "Animazione", color: "#10b981" },
  { id: "documentario", icon: "🎓", label: "Documentario", color: "#6366f1" },
  { id: "altro", icon: "🎬", label: "Altro", color: "#6a6a8a" },
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

const EMPTY = { movies: [], votes: {}, watched: [], plans: [], reviews: {}, anniversary: null, categories: {}, reactions: {}, wishlist: [] };

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return `hsl(${Math.abs(h) % 360}, 50%, 38%)`; }
function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

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

  if (authLoading) return <div style={S.loadWrap}><div style={{ fontSize: 60, animation: "pop-in 0.6s ease" }}>🐙</div><p style={{ color: "#6a6a8a" }}>Risvegliando il Covo...</p></div>;

  if (!user) return (
    <div style={{ ...S.authPage, animation: "fade-in 0.5s ease" }}>
      <div style={{ fontSize: 64, animation: "pop-in 0.6s ease" }}>🐙</div>
      <h1 style={S.hubTitle}>Covo di Cthulhu</h1>
      <p style={{ color: "#6a6a8a", margin: "8px 0 28px", fontSize: 14 }}>Accedi per entrare nel Covo</p>
      <button style={S.googleBtn} onClick={login}>
        <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10 }}><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.1 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 15.6 18.8 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.4 0-9.9-3.5-11.3-8.3l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>
        Accedi con Google
      </button>
    </div>
  );

  if (!role) return (
    <div style={{ ...S.authPage, animation: "fade-in 0.5s ease" }}>
      <img src={user.photoURL} alt="" style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #9b59b6" }} />
      <p style={{ color: "#e0e0f0", margin: "12px 0 4px", fontWeight: 700 }}>Ciao {user.displayName}!</p>
      <p style={{ color: "#6a6a8a", fontSize: 13, margin: "0 0 20px" }}>Chi sei nel Covo?</p>
      <div style={{ display: "flex", gap: 16 }}>
        <button style={{ ...S.roleBtn, opacity: usersDoc?.lui && usersDoc.lui !== user.uid ? 0.3 : 1, animation: "pop-in 0.4s ease 0.1s both" }} disabled={usersDoc?.lui && usersDoc.lui !== user.uid} onClick={() => pickRole("lui")}><span style={{ fontSize: 32 }}>🙋‍♂️</span><span>Lui</span>{usersDoc?.luiName && usersDoc.lui !== user.uid && <span style={{ fontSize: 10, color: "#6a6a8a" }}>({usersDoc.luiName})</span>}</button>
        <button style={{ ...S.roleBtn, opacity: usersDoc?.lei && usersDoc.lei !== user.uid ? 0.3 : 1, animation: "pop-in 0.4s ease 0.2s both" }} disabled={usersDoc?.lei && usersDoc.lei !== user.uid} onClick={() => pickRole("lei")}><span style={{ fontSize: 32 }}>🙋‍♀️</span><span>Lei</span>{usersDoc?.leiName && usersDoc.lei !== user.uid && <span style={{ fontSize: 10, color: "#6a6a8a" }}>({usersDoc.leiName})</span>}</button>
      </div>
      <button style={{ ...S.linkBtn, marginTop: 20 }} onClick={logout}>Cambia account</button>
    </div>
  );

  if (!loaded) return <div style={S.loadWrap}><div style={{ fontSize: 60, animation: "pop-in 0.6s ease" }}>🐙</div><p style={{ color: "#6a6a8a" }}>Caricamento dati...</p></div>;

  if (screen === "hub") return <><Toast msg={toast} /><Hub onGo={navigate} data={data} save={save} role={role} user={user} usersDoc={usersDoc} logout={logout} /></>;

  return (
    <><Toast msg={toast} /><div style={S.page} key={screen}><div style={{ animation: `${animDir} 0.3s ease` }}>
      <button style={S.backBtn} onClick={() => { goBack(); window.history.back(); }}>← Covo</button>
      {screen === "movies" && <MovieList data={data} save={save} />}
      {screen === "wheel" && <Wheel movies={data.movies} />}
      {screen === "votes" && <Votes data={data} save={save} role={role} />}
      {screen === "watched" && <Watched data={data} save={save} />}
      {screen === "planner" && <Planner data={data} save={save} />}
      {screen === "reviews" && <Reviews data={data} save={save} role={role} />}
      {screen === "wishlist" && <Wishlist data={data} save={save} role={role} />}
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
  useEffect(() => { const t = setTimeout(() => setGlow(true), 300); return () => clearTimeout(t); }, []);
  const setAnniv = (d) => { save({ ...data, anniversary: d }); setEditingDate(false); };
  const randomSugg = () => { setSugg({ act: rnd(RAND_ACT), food: rnd(RAND_FOOD), drink: rnd(RAND_DRINK), movie: movies.length > 0 ? rnd(movies) : null }); };

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

  return (
    <div style={S.hub}>
      <div style={{ ...S.userBar, animation: "fade-in 0.4s ease" }}>
        <img src={user.photoURL} alt="" style={S.avatar} />
        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0f0" }}>{user.displayName} <span style={{ color: "#9b59b6", fontSize: 11 }}>({role})</span></div>{oN && <div style={{ fontSize: 11, color: "#6a6a8a" }}>con {oN} 💜</div>}</div>
        <button style={S.linkBtn} onClick={logout}>Esci</button>
      </div>

      <div style={{ ...S.annivBanner, animation: "fade-in 0.5s ease 0.1s both" }}>
        {!anniversary || editingDate ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, color: "#c4a0ff" }}>💜 Quando è il vostro anniversario?</span><input type="date" style={{ ...S.input, textAlign: "center", maxWidth: 200 }} defaultValue={anniversary || ""} onChange={(e) => e.target.value && setAnniv(e.target.value)} /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 11, color: "#6a6a8a", cursor: "pointer" }} onClick={() => setEditingDate(true)}>💜 Insieme da {ai.y > 0 ? `${ai.y} ann${ai.y > 1 ? "i" : "o"} e ` : ""}{ai.m} mes{ai.m !== 1 ? "i" : "e"} · ✏️</div>
            <div style={S.annivCd}><div style={S.annivBox}><div style={S.annivNum}>{ai.dM === 0 ? "🎉" : ai.dM}</div><div style={S.annivLbl}>{ai.dM === 0 ? "Mesiversario!" : `giorn${ai.dM !== 1 ? "i" : "o"} al mesiversario`}</div></div><div style={S.annivDiv} /><div style={S.annivBox}><div style={{ ...S.annivNum, color: "#f5a623" }}>{ai.dA === 0 ? "🎉" : ai.dA}</div><div style={S.annivLbl}>{ai.dA === 0 ? "Anniversario!" : `giorn${ai.dA !== 1 ? "i" : "o"} all'anniversario`}</div></div></div>
          </div>
        )}
      </div>

      <div style={{ ...S.eyeWrap, opacity: glow ? 1 : 0, transform: glow ? "scale(1)" : "scale(0.7)" }}>
        <div style={S.tentBg}>{[...Array(8)].map((_, i) => <div key={i} style={{ ...S.tentLine, transform: `rotate(${i * 45}deg)` }} />)}</div>
        <div style={S.eye}><div style={S.pupil} /></div>
      </div>
      <h1 style={S.hubTitle}>Covo di Cthulhu</h1>
      <p style={S.hubSub}>{movies.length} film · {watched.length} visti · {plans.length} serate</p>

      <button style={{ ...S.suggBtn, animation: "fade-in 0.4s ease 0.2s both" }} onClick={randomSugg}>🎲 Stasera cosa facciamo?</button>
      {sugg && <div style={{ ...S.suggCard, animation: "pop-in 0.4s ease" }}><div style={{ fontWeight: 800, color: "#f5a623", fontSize: 14, marginBottom: 6 }}>Proposta della serata:</div><div>🎭 {sugg.act}</div><div>🍕 {sugg.food}</div><div>🍷 {sugg.drink}</div>{sugg.movie && <div>🎬 {sugg.movie}</div>}<button style={{ ...S.suggBtn, marginTop: 8, fontSize: 12, padding: "8px 0" }} onClick={randomSugg}>🔄 Altra proposta</button></div>}

      <div style={S.grid}>{SECTIONS.map((s, i) => <button key={s.id} style={{ ...S.card, animation: `pop-in 0.35s ease ${0.1 + i * 0.05}s both` }} onClick={() => onGo(s.id)}><span style={S.cardIcon}>{s.icon}</span><span style={S.cardLbl}>{s.label}</span></button>)}</div>
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
  return (
    <div style={S.sec}><h2 style={S.secTitle}>📋 Lista Film</h2>
      {data.movies.length > 3 && <input style={{ ...S.input, marginBottom: 4 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Cerca film..." />}
      <div style={S.row}><input style={S.input} value={inp} onChange={(e) => setInp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Aggiungi un film..." /><button style={S.addBtn} onClick={add}>+</button></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{CATEGORIES.map(c => <button key={c.id} onClick={() => setCat(c.id)} style={{ ...S.catChip, background: cat === c.id ? c.color + "33" : "transparent", borderColor: cat === c.id ? c.color : "rgba(255,255,255,0.06)" }}>{c.icon} {c.label}</button>)}</div>
      {filtered.length === 0 && <p style={S.empty}>{search ? "Nessun risultato!" : "La lista è vuota!"}</p>}
      {filtered.map((m, i) => { const mc = gc(m); return <div key={m} style={{ ...S.item, animation: `fade-in 0.3s ease ${i * 0.04}s both`, borderLeft: `3px solid ${mc.color}` }}><span style={{ fontSize: 16 }}>{mc.icon}</span><span style={S.itemText}>{m}</span><span style={{ fontSize: 10, color: mc.color, fontWeight: 600 }}>{mc.label}</span><button style={S.xBtn} onClick={() => rm(m)}>✕</button></div>; })}
      <p style={S.count}>{data.movies.length} film in lista</p>
    </div>
  );
}

function Wheel({ movies }) {
  const [rot, setRot] = useState(0); const [spinning, setSpinning] = useState(false); const [picked, setPicked] = useState(null);
  const spin = () => { if (movies.length < 2 || spinning) return; setSpinning(true); setPicked(null); const nr = rot + 1440 + Math.random() * 1440; setRot(nr); setTimeout(() => { const seg = 360 / movies.length; const norm = nr % 360; const idx = Math.floor(((360 - norm + seg / 2) % 360) / seg) % movies.length; setPicked(movies[idx]); setSpinning(false); }, 3600); };
  const sz = 280, cx = sz/2, cy = sz/2, r = sz/2 - 6, seg = movies.length ? 360/movies.length : 360;
  const pol = (a, rd) => { const d = ((a-90)*Math.PI)/180; return [cx+rd*Math.cos(d), cy+rd*Math.sin(d)]; };
  return (
    <div style={{ ...S.sec, alignItems: "center" }}><h2 style={S.secTitle}>🎰 Estrazione</h2>
      {movies.length < 2 ? <p style={S.empty}>Servono almeno 2 film!</p> : <>
        <div style={{ position: "relative" }}><div style={S.pointer}>▼</div>
          <svg width={sz} height={sz} style={{ transition: spinning ? "transform 3.5s cubic-bezier(.17,.67,.12,.99)" : "none", transform: `rotate(${rot}deg)` }}>
            {movies.map((m, i) => { const a1=i*seg, a2=a1+seg; const [x1,y1]=pol(a1,r); const [x2,y2]=pol(a2,r); const lg=seg>180?1:0; const mid=a1+seg/2; const [tx,ty]=pol(mid,r*0.6); return <g key={i}><path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2} Z`} fill={hash(m)} stroke="#0d1117" strokeWidth="2" /><text x={tx} y={ty} fill="#fff" fontSize={movies.length>8?8:10} fontWeight="700" textAnchor="middle" dominantBaseline="central" transform={`rotate(${mid},${tx},${ty})`}>{m.length>13?m.slice(0,11)+"…":m}</text></g>; })}
          </svg></div>
        <button style={{ ...S.bigBtn, opacity: spinning ? 0.5 : 1 }} onClick={spin} disabled={spinning}>{spinning ? "Girando..." : "🐙 Estrai dal Covo!"}</button>
        {picked && <div style={{ ...S.pickedCard, animation: "pop-in 0.5s ease" }}><div style={S.pickedLbl}>Stasera guardiamo:</div><div style={S.pickedTxt}>{picked}</div></div>}
      </>}
    </div>
  );
}

function Votes({ data, save, role }) {
  const vote = (m) => { save({ ...data, votes: { ...data.votes, [m]: { ...data.votes[m], [role]: (data.votes[m]?.[role]||0)+1 } } }); };
  const reset = (m) => save({ ...data, votes: { ...data.votes, [m]: { lui: 0, lei: 0 } } });
  const react = (m, emoji) => { const c = data.reactions||{}; save({ ...data, reactions: { ...c, [m]: { ...(c[m]||{}), [role]: emoji } } }); };
  const sorted = [...data.movies].sort((a,b) => { const sa=(data.votes[a]?.lui||0)+(data.votes[a]?.lei||0); const sb=(data.votes[b]?.lui||0)+(data.votes[b]?.lei||0); return sb-sa; });
  return (
    <div style={S.sec}><h2 style={S.secTitle}>⭐ Votazione</h2>
      <p style={{ fontSize: 12, color: "#6a6a8a", margin: 0 }}>Stai votando come <strong style={{ color: "#c4a0ff" }}>{role}</strong></p>
      {sorted.length === 0 && <p style={S.empty}>Aggiungi film prima!</p>}
      {sorted.map((m, i) => { const v = data.votes[m]||{lui:0,lei:0}; const t = v.lui+v.lei; const re = (data.reactions||{})[m]||{}; return (
        <div key={m} style={{ ...S.voteCard, animation: `fade-in 0.3s ease ${i*0.05}s both` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 700, fontSize: 14 }}>{m}</span><span style={S.badge}>{t} voti</span></div>
          <div style={{ display: "flex", gap: 6 }}><button style={S.vBtn} onClick={() => vote(m)}>{role==="lui"?"🙋‍♂️":"🙋‍♀️"} Vota!</button><div style={{ ...S.vBtn, background: "transparent", textAlign: "center", cursor: "default" }}>🙋‍♂️ {v.lui} · 🙋‍♀️ {v.lei}</div><button style={S.rstBtn} onClick={() => reset(m)}>↺</button></div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{REACTIONS.map(e => <button key={e} onClick={() => react(m,e)} style={{ ...S.emojiBtn, background: re[role]===e ? "rgba(155,89,182,0.3)" : "transparent" }}>{e}</button>)}</div>
          {(re.lui||re.lei) && <div style={{ fontSize: 11, color: "#8888aa" }}>{re.lui && <span>🙋‍♂️ {re.lui} </span>}{re.lei && <span>🙋‍♀️ {re.lei}</span>}</div>}
          {t > 0 && <div style={S.bar}><div style={{ ...S.barL, width: `${(v.lui/t)*100}%` }} /><div style={{ ...S.barR, width: `${(v.lei/t)*100}%` }} /></div>}
        </div>); })}
    </div>
  );
}

function Watched({ data, save }) {
  const mw = (m) => { save({ ...data, movies: data.movies.filter(x => x !== m), watched: [...data.watched, { title: m, date: new Date().toLocaleDateString("it-IT") }] }); };
  const uw = (t) => { save({ ...data, watched: data.watched.filter(w => w.title !== t), movies: [...data.movies, t] }); };
  return (
    <div style={S.sec}><h2 style={S.secTitle}>✅ Già Visti</h2>
      {data.movies.length > 0 && <><p style={{ fontSize: 12, color: "#6a6a8a", margin: 0 }}>Segna come visto:</p><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{data.movies.map(m => <button key={m} style={S.chip} onClick={() => mw(m)}>{m} ✓</button>)}</div></>}
      {data.watched.length === 0 && <p style={S.empty}>Nessun film visto ancora!</p>}
      {data.watched.map((w, i) => <div key={i} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both` }}><span>🎬</span><span style={S.itemText}>{w.title}</span><span style={{ fontSize: 11, color: "#6a6a8a" }}>{w.date}</span><button style={S.xBtn} onClick={() => uw(w.title)}>↩</button></div>)}
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
      {[...data.plans].reverse().map((p, i) => <div key={p.id} style={{ ...S.planCard, animation: `fade-in 0.3s ease ${i*0.05}s both` }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 700, color: "#c4a0ff" }}>📅 {p.date}{p.time?` · 🕐 ${p.time}`:""}</span><button style={S.xBtn} onClick={() => rm(p.id)}>✕</button></div>{p.movie&&<div>🎬 {p.movie}</div>}{p.activity&&<div>🎭 {p.activity}</div>}{p.place&&<div>📍 {p.place}</div>}{p.food&&<div>🍕 {p.food}</div>}{p.drink&&<div>🍷 {p.drink}</div>}{p.note&&<div style={{ fontSize: 12, color: "#8888aa", fontStyle: "italic" }}>"{p.note}"</div>}</div>)}
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
      <p style={{ fontSize: 12, color: "#6a6a8a", margin: 0 }}>Recensisci come <strong style={{ color: "#c4a0ff" }}>{role}</strong></p>
      <div style={S.formGroup}>
        <select style={S.input} value={sel} onChange={e => setSel(e.target.value)}><option value="">— Scegli film —</option>{all.map(m => <option key={m}>{m}</option>)}</select>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><label style={{ fontSize: 13, width: 60 }}>{role==="lui"?"🙋‍♂️":"🙋‍♀️"} Voto</label><input type="range" min="1" max="10" value={score} onChange={e => setScore(+e.target.value)} style={{ flex: 1 }} /><span style={S.scoreBadge}>{score}</span></div>
        <input style={S.input} placeholder="Un commento..." value={comment} onChange={e => setComment(e.target.value)} />
        <button style={S.bigBtn} onClick={add}>📝 Salva Recensione</button>
      </div>
      {rev.length === 0 && <p style={S.empty}>Nessuna recensione!</p>}
      {rev.map(([t, r], i) => <div key={t} style={{ ...S.reviewCard, animation: `fade-in 0.3s ease ${i*0.05}s both` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 700, fontSize: 14 }}>{t}</span><span style={{ ...S.scoreBadge, fontSize: 16, background: r.avg>=7?"rgba(76,175,80,.25)":r.avg>=5?"rgba(255,193,7,.25)":"rgba(233,69,96,.25)", color: r.avg>=7?"#81c784":r.avg>=5?"#ffd54f":"#e94560" }}>{r.avg}/10</span></div><div style={{ fontSize: 12, display: "flex", gap: 12 }}>{r.lui!==undefined&&<span>🙋‍♂️ {r.lui}/10</span>}{r.lei!==undefined&&<span>🙋‍♀️ {r.lei}/10</span>}<span style={{ color: "#6a6a8a" }}>{r.date}</span></div>{r.luiComment&&<div style={{ fontSize: 12, color: "#aaa" }}>🙋‍♂️ "{r.luiComment}"</div>}{r.leiComment&&<div style={{ fontSize: 12, color: "#aaa" }}>🙋‍♀️ "{r.leiComment}"</div>}</div>)}
    </div>
  );
}

function Wishlist({ data, save, role }) {
  const [inp, setInp] = useState(""); const [type, setType] = useState("serie"); const [note, setNote] = useState("");
  const add = () => { const t = inp.trim(); if (!t) return; save({ ...data, wishlist: [...(data.wishlist||[]), { id: Date.now(), title: t, type, note, addedBy: role, date: new Date().toLocaleDateString("it-IT"), done: false }] }); setInp(""); setNote(""); };
  const toggle = (id) => save({ ...data, wishlist: data.wishlist.map(w => w.id===id ? { ...w, done: !w.done } : w) });
  const rm = (id) => save({ ...data, wishlist: data.wishlist.filter(w => w.id !== id) });
  const grouped = {}; (data.wishlist||[]).forEach(w => { if (!grouped[w.type]) grouped[w.type] = []; grouped[w.type].push(w); });
  return (
    <div style={S.sec}><h2 style={S.secTitle}>💫 Wishlist Condivisa</h2>
      <div style={S.formGroup}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{WISH_TYPES.map(wt => <button key={wt.id} onClick={() => setType(wt.id)} style={{ ...S.catChip, background: type===wt.id?"rgba(155,89,182,0.25)":"transparent", borderColor: type===wt.id?"#9b59b6":"rgba(255,255,255,0.06)" }}>{wt.icon} {wt.label}</button>)}</div>
        <input style={S.input} value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key==="Enter"&&add()} placeholder="Cosa volete fare/vedere/provare?" />
        <input style={S.input} value={note} onChange={e => setNote(e.target.value)} placeholder="📝 Note (opzionale)" />
        <button style={S.bigBtn} onClick={add}>+ Aggiungi alla Wishlist</button>
      </div>
      {Object.keys(grouped).length === 0 && <p style={S.empty}>La wishlist è vuota!</p>}
      {WISH_TYPES.map(wt => { const items = grouped[wt.id]; if (!items) return null; return <div key={wt.id}><h3 style={{ fontSize: 14, color: "#8888aa", margin: "8px 0 6px" }}>{wt.icon} {wt.label}</h3>{items.map((w, i) => <div key={w.id} style={{ ...S.item, animation: `fade-in 0.3s ease ${i*0.04}s both`, opacity: w.done?0.5:1 }}><button style={{ ...S.emojiBtn, fontSize: 18 }} onClick={() => toggle(w.id)}>{w.done?"✅":"⬜"}</button><div style={{ flex: 1 }}><div style={{ ...S.itemText, textDecoration: w.done?"line-through":"none" }}>{w.title}</div>{w.note&&<div style={{ fontSize: 11, color: "#6a6a8a" }}>{w.note}</div>}<div style={{ fontSize: 10, color: "#4a4a6a" }}>aggiunto da {w.addedBy==="lui"?"🙋‍♂️":"🙋‍♀️"} · {w.date}</div></div><button style={S.xBtn} onClick={() => rm(w.id)}>✕</button></div>)}</div>; })}
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
  const stats=[{l:"Film in lista",v:data.movies.length,i:"📋"},{l:"Film visti insieme",v:tw,i:"✅"},{l:"Serate pianificate",v:data.plans.length,i:"🕯️"},{l:"Wishlist",v:`${(data.wishlist||[]).filter(w=>w.done).length}/${(data.wishlist||[]).length}`,i:"💫"},{l:"Recensioni",v:rv.length,i:"📝"},{l:"Media voto Lui",v:avgL,i:"🙋‍♂️"},{l:"Media voto Lei",v:avgE,i:"🙋‍♀️"},{l:"Media di coppia",v:avgT,i:"💜"},{l:"Più votato",v:mv,i:"🏆"},{l:"Miglior film",v:bm!=="-"?`${bm} (${bs})`:"-",i:"👑"},{l:"Peggior film",v:wm!=="-"&&ws<11?`${wm} (${ws})`:"-",i:"💩"},{l:"Genere preferito",v:tci?`${tci.icon} ${tci.label} (${tc[1]})`:"-",i:"🎭"},{l:"Reazione top",v:tr?`${tr[0]} (${tr[1]}x)`:"-",i:"😍"}];
  return (
    <div style={S.sec}><h2 style={S.secTitle}>📊 Statistiche di Coppia</h2>
      {stats.map((s, i) => <div key={i} style={{ ...S.statRow, animation: `fade-in 0.3s ease ${i*0.04}s both` }}><span style={{ fontSize: 20 }}>{s.i}</span><div style={{ flex: 1 }}><div style={{ fontSize: 12, color: "#6a6a8a" }}>{s.l}</div><div style={{ fontSize: 16, fontWeight: 800, color: "#e0e0f0" }}>{s.v}</div></div></div>)}
    </div>
  );
}

const S = {
  loadWrap:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0d1117",fontFamily:"'Nunito',sans-serif"},
  authPage:{fontFamily:"'Nunito',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"linear-gradient(170deg,#0d1117 0%,#161b22 40%,#1a1040 100%)",padding:24},
  googleBtn:{display:"flex",alignItems:"center",padding:"12px 28px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.06)",color:"#e0e0f0",fontSize:15,fontWeight:700,cursor:"pointer"},
  roleBtn:{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"20px 28px",borderRadius:16,border:"1px solid rgba(155,89,182,0.2)",background:"rgba(255,255,255,0.04)",color:"#e0e0f0",fontSize:15,fontWeight:700,cursor:"pointer"},
  linkBtn:{border:"none",background:"transparent",color:"#6a6a8a",fontSize:12,cursor:"pointer",textDecoration:"underline"},
  userBar:{display:"flex",alignItems:"center",gap:10,width:"100%",maxWidth:360,marginBottom:12,padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderRadius:12},
  avatar:{width:32,height:32,borderRadius:"50%"},
  page:{fontFamily:"'Nunito',sans-serif",maxWidth:440,margin:"0 auto",padding:16,minHeight:"100vh",background:"linear-gradient(170deg,#0d1117 0%,#161b22 40%,#1a1040 100%)",color:"#e0e0f0"},
  hub:{fontFamily:"'Nunito',sans-serif",maxWidth:440,margin:"0 auto",padding:"24px 20px 20px",minHeight:"100vh",background:"linear-gradient(170deg,#0d1117 0%,#161b22 40%,#1a1040 100%)",color:"#e0e0f0",display:"flex",flexDirection:"column",alignItems:"center"},
  toast:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"rgba(155,89,182,0.9)",color:"#fff",padding:"10px 20px",borderRadius:12,fontSize:13,fontWeight:700,zIndex:9999,animation:"pop-in 0.3s ease",maxWidth:"90vw",textAlign:"center"},
  annivBanner:{width:"100%",maxWidth:360,padding:"14px 16px",background:"rgba(155,89,182,0.08)",border:"1px solid rgba(155,89,182,0.18)",borderRadius:16,marginBottom:16},
  annivCd:{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginTop:4},
  annivBox:{display:"flex",flexDirection:"column",alignItems:"center",gap:2},
  annivNum:{fontSize:28,fontWeight:900,color:"#c4a0ff",lineHeight:1},
  annivLbl:{fontSize:10,color:"#8888aa",textAlign:"center"},
  annivDiv:{width:1,height:36,background:"rgba(255,255,255,0.08)"},
  eyeWrap:{position:"relative",width:120,height:120,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 1s ease",marginBottom:12},
  tentBg:{position:"absolute",width:"100%",height:"100%"},
  tentLine:{position:"absolute",top:"50%",left:"50%",width:2,height:55,background:"linear-gradient(to bottom,#7b42c9,transparent)",transformOrigin:"top center",borderRadius:2,opacity:0.5},
  eye:{width:56,height:56,borderRadius:"50%",background:"radial-gradient(circle,#4eff8a 0%,#1a8a4a 60%,#0d1117 100%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 30px rgba(78,255,138,0.3)",zIndex:2},
  pupil:{width:18,height:28,borderRadius:"50%",background:"#0d1117"},
  hubTitle:{margin:"0 0 4px",fontSize:30,fontWeight:900,background:"linear-gradient(135deg,#9b59b6,#4eff8a)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-0.5},
  hubSub:{margin:"0 0 16px",fontSize:13,color:"#6a6a8a"},
  suggBtn:{width:"100%",maxWidth:360,padding:"12px 0",border:"2px dashed rgba(245,166,35,0.3)",borderRadius:14,background:"rgba(245,166,35,0.06)",color:"#f5a623",fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:12},
  suggCard:{width:"100%",maxWidth:360,padding:16,background:"rgba(245,166,35,0.08)",border:"1px solid rgba(245,166,35,0.2)",borderRadius:14,marginBottom:16,fontSize:14},
  grid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,width:"100%",maxWidth:360},
  card:{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"22px 12px",border:"1px solid rgba(155,89,182,0.15)",borderRadius:16,background:"rgba(255,255,255,0.03)",color:"#e0e0f0",fontSize:14,fontWeight:700,cursor:"pointer",transition:"transform 0.15s"},
  cardIcon:{fontSize:30},cardLbl:{fontSize:13},
  footer:{marginTop:32,fontSize:10,color:"#3a3a5a",textAlign:"center",fontStyle:"italic"},
  backBtn:{border:"none",background:"rgba(155,89,182,0.15)",color:"#c4a0ff",padding:"8px 16px",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:16},
  sec:{display:"flex",flexDirection:"column",gap:12},
  secTitle:{fontSize:20,fontWeight:800,margin:"0 0 4px",color:"#c4a0ff"},
  row:{display:"flex",gap:8},
  input:{flex:1,padding:"11px 14px",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,background:"rgba(255,255,255,0.05)",color:"#e0e0f0",fontSize:14,outline:"none"},
  addBtn:{width:44,border:"none",borderRadius:10,background:"linear-gradient(135deg,#9b59b6,#6c3483)",color:"#fff",fontSize:20,fontWeight:700,cursor:"pointer"},
  bigBtn:{padding:"13px 0",border:"none",borderRadius:12,background:"linear-gradient(135deg,#9b59b6,#4eff8a)",color:"#0d1117",fontSize:15,fontWeight:800,cursor:"pointer"},
  empty:{textAlign:"center",color:"#4a4a6a",fontSize:13,padding:28},
  item:{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:"rgba(255,255,255,0.04)",borderRadius:12,marginBottom:4},
  itemText:{flex:1,fontSize:14,fontWeight:600,color:"#e0e0f0"},
  xBtn:{width:26,height:26,border:"none",borderRadius:7,background:"rgba(233,69,96,0.15)",color:"#e94560",fontSize:12,cursor:"pointer"},
  count:{textAlign:"center",fontSize:11,color:"#4a4a6a"},
  pointer:{textAlign:"center",fontSize:26,color:"#4eff8a",marginBottom:-6,zIndex:2,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.5))"},
  pickedCard:{marginTop:14,padding:18,background:"rgba(78,255,138,0.08)",border:"1px solid rgba(78,255,138,0.2)",borderRadius:14,textAlign:"center"},
  pickedLbl:{fontSize:12,color:"#4eff8a",marginBottom:4,fontWeight:600},
  pickedTxt:{fontSize:20,fontWeight:800,color:"#fff"},
  voteCard:{padding:14,background:"rgba(255,255,255,0.04)",borderRadius:12,display:"flex",flexDirection:"column",gap:8},
  badge:{fontSize:10,fontWeight:700,background:"rgba(155,89,182,0.2)",color:"#c4a0ff",padding:"2px 8px",borderRadius:16},
  vBtn:{flex:1,padding:"9px 0",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,background:"rgba(255,255,255,0.03)",color:"#e0e0f0",fontSize:12,fontWeight:700,cursor:"pointer"},
  rstBtn:{width:36,border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,background:"transparent",color:"#6a6a8a",fontSize:15,cursor:"pointer"},
  emojiBtn:{border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,background:"transparent",fontSize:14,padding:"4px 6px",cursor:"pointer",transition:"background 0.15s"},
  bar:{display:"flex",height:5,borderRadius:3,overflow:"hidden",background:"rgba(255,255,255,0.04)"},
  barL:{background:"#4fc3f7",transition:"width .3s"},barR:{background:"#e94560",transition:"width .3s"},
  chip:{padding:"6px 12px",border:"1px solid rgba(78,255,138,0.2)",borderRadius:20,background:"rgba(78,255,138,0.06)",color:"#4eff8a",fontSize:12,fontWeight:600,cursor:"pointer"},
  catChip:{padding:"5px 10px",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,color:"#e0e0f0",fontSize:11,fontWeight:600,cursor:"pointer",background:"transparent"},
  formGroup:{display:"flex",flexDirection:"column",gap:10},
  planCard:{padding:14,background:"rgba(255,255,255,0.04)",borderRadius:12,display:"flex",flexDirection:"column",gap:6,fontSize:13},
  reviewCard:{padding:14,background:"rgba(255,255,255,0.04)",borderRadius:12,display:"flex",flexDirection:"column",gap:6},
  scoreBadge:{fontSize:14,fontWeight:800,background:"rgba(155,89,182,0.2)",color:"#c4a0ff",padding:"3px 10px",borderRadius:8,minWidth:28,textAlign:"center"},
  statRow:{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",background:"rgba(255,255,255,0.04)",borderRadius:12},
};
