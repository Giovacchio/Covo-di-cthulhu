import { useState, useEffect, useCallback } from "react";
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
];

const EMPTY = {
  movies: [],
  votes: {},
  watched: [],
  plans: [],
  reviews: {},
  anniversary: null,
};

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 50%, 38%)`;
}

/* ════════════════ ROOT ════════════════ */
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState(null); // "lui" | "lei"
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState("hub");
  const [usersDoc, setUsersDoc] = useState(null);

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  // Load users doc to determine roles
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

  // Real-time data listener
  useEffect(() => {
    if (!user || !role) return;
    return onSnapshot(DOC_REF(), (snap) => {
      if (snap.exists()) setData({ ...EMPTY, ...snap.data() });
      setLoaded(true);
    });
  }, [user, role]);

  const save = useCallback(
    (d) => {
      setData(d);
      setDoc(DOC_REF(), d, { merge: true }).catch(console.error);
    },
    []
  );

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  };

  const pickRole = async (r) => {
    const update = { ...usersDoc, [r]: user.uid, [`${r}Name`]: user.displayName, [`${r}Photo`]: user.photoURL };
    await setDoc(USERS_REF(), update, { merge: true });
    setRole(r);
    // Init shared data if first user
    const snap = await getDoc(DOC_REF());
    if (!snap.exists()) await setDoc(DOC_REF(), EMPTY);
  };

  const logout = async () => {
    await signOut(auth);
    setRole(null);
    setLoaded(false);
    setScreen("hub");
  };

  /* ── Auth Screen ── */
  if (authLoading)
    return (
      <div style={S.loadWrap}>
        <div style={{ fontSize: 60 }}>🐙</div>
        <p style={{ color: "#6a6a8a" }}>Risvegliando il Covo...</p>
      </div>
    );

  if (!user)
    return (
      <div style={S.authPage}>
        <div style={{ fontSize: 64 }}>🐙</div>
        <h1 style={S.hubTitle}>Covo di Cthulhu</h1>
        <p style={{ color: "#6a6a8a", margin: "8px 0 28px", fontSize: 14 }}>
          Accedi per entrare nel Covo
        </p>
        <button style={S.googleBtn} onClick={login}>
          <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.1 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 15.6 18.8 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.4 0-9.9-3.5-11.3-8.3l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
          </svg>
          Accedi con Google
        </button>
      </div>
    );

  /* ── Role Selection ── */
  if (!role)
    return (
      <div style={S.authPage}>
        <img
          src={user.photoURL}
          alt=""
          style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #9b59b6" }}
        />
        <p style={{ color: "#e0e0f0", margin: "12px 0 4px", fontWeight: 700 }}>
          Ciao {user.displayName}!
        </p>
        <p style={{ color: "#6a6a8a", fontSize: 13, margin: "0 0 20px" }}>Chi sei nel Covo?</p>
        <div style={{ display: "flex", gap: 16 }}>
          <button
            style={{
              ...S.roleBtn,
              opacity: usersDoc?.lui && usersDoc.lui !== user.uid ? 0.3 : 1,
            }}
            disabled={usersDoc?.lui && usersDoc.lui !== user.uid}
            onClick={() => pickRole("lui")}
          >
            <span style={{ fontSize: 32 }}>🙋‍♂️</span>
            <span>Lui</span>
            {usersDoc?.luiName && usersDoc.lui !== user.uid && (
              <span style={{ fontSize: 10, color: "#6a6a8a" }}>({usersDoc.luiName})</span>
            )}
          </button>
          <button
            style={{
              ...S.roleBtn,
              opacity: usersDoc?.lei && usersDoc.lei !== user.uid ? 0.3 : 1,
            }}
            disabled={usersDoc?.lei && usersDoc.lei !== user.uid}
            onClick={() => pickRole("lei")}
          >
            <span style={{ fontSize: 32 }}>🙋‍♀️</span>
            <span>Lei</span>
            {usersDoc?.leiName && usersDoc.lei !== user.uid && (
              <span style={{ fontSize: 10, color: "#6a6a8a" }}>({usersDoc.leiName})</span>
            )}
          </button>
        </div>
        <button style={{ ...S.linkBtn, marginTop: 20 }} onClick={logout}>
          Cambia account
        </button>
      </div>
    );

  if (!loaded)
    return (
      <div style={S.loadWrap}>
        <div style={{ fontSize: 60 }}>🐙</div>
        <p style={{ color: "#6a6a8a" }}>Caricamento dati...</p>
      </div>
    );

  /* ── Main App ── */
  if (screen === "hub")
    return <Hub onGo={setScreen} data={data} save={save} role={role} user={user} usersDoc={usersDoc} logout={logout} />;

  return (
    <div style={S.page}>
      <button style={S.backBtn} onClick={() => setScreen("hub")}>← Covo</button>
      {screen === "movies" && <MovieList data={data} save={save} />}
      {screen === "wheel" && <Wheel movies={data.movies} />}
      {screen === "votes" && <Votes data={data} save={save} role={role} />}
      {screen === "watched" && <Watched data={data} save={save} />}
      {screen === "planner" && <Planner data={data} save={save} />}
      {screen === "reviews" && <Reviews data={data} save={save} role={role} />}
    </div>
  );
}

/* ════════════════ HUB ════════════════ */
function Hub({ onGo, data, save, role, user, usersDoc, logout }) {
  const { movies, watched, plans, anniversary } = data;
  const [glow, setGlow] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGlow(true), 300);
    return () => clearTimeout(t);
  }, []);

  const setAnniversary = (dateStr) => {
    save({ ...data, anniversary: dateStr });
    setEditingDate(false);
  };

  let annivInfo = null;
  if (anniversary) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [ay, am, ad] = anniversary.split("-").map(Number);
    const findNextMensiversario = () => {
      let c = new Date(today.getFullYear(), today.getMonth(), ad);
      if (c <= today) c = new Date(today.getFullYear(), today.getMonth() + 1, ad);
      if (c.getDate() !== ad) c = new Date(today.getFullYear(), today.getMonth() + 2, ad);
      return c;
    };
    const findNextAnniversary = () => {
      let c = new Date(today.getFullYear(), am - 1, ad);
      if (c <= today) c = new Date(today.getFullYear() + 1, am - 1, ad);
      return c;
    };
    const nextMens = findNextMensiversario();
    const nextAnniv = findNextAnniversary();
    const diffDays = (d) => Math.ceil((d - today) / 86400000);
    const totalMonths = (today.getFullYear() - ay) * 12 + (today.getMonth() - (am - 1));
    annivInfo = {
      dMens: diffDays(nextMens),
      dAnniv: diffDays(nextAnniv),
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
    };
  }

  const otherRole = role === "lui" ? "lei" : "lui";
  const otherName = usersDoc?.[`${otherRole}Name`];

  return (
    <div style={S.hub}>
      {/* User bar */}
      <div style={S.userBar}>
        <img src={user.photoURL} alt="" style={S.avatar} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0f0" }}>
            {user.displayName} <span style={{ color: "#9b59b6", fontSize: 11 }}>({role})</span>
          </div>
          {otherName && (
            <div style={{ fontSize: 11, color: "#6a6a8a" }}>con {otherName} 💜</div>
          )}
        </div>
        <button style={S.linkBtn} onClick={logout}>Esci</button>
      </div>

      {/* Anniversary Banner */}
      <div style={S.annivBanner}>
        {!anniversary || editingDate ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#c4a0ff" }}>💜 Quando è il vostro anniversario?</span>
            <input
              type="date"
              style={{ ...S.input, textAlign: "center", maxWidth: 200 }}
              defaultValue={anniversary || ""}
              onChange={(e) => e.target.value && setAnniversary(e.target.value)}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 11, color: "#6a6a8a", cursor: "pointer" }} onClick={() => setEditingDate(true)}>
              💜 Insieme da{" "}
              {annivInfo.years > 0 ? `${annivInfo.years} ann${annivInfo.years > 1 ? "i" : "o"} e ` : ""}
              {annivInfo.months} mes{annivInfo.months !== 1 ? "i" : "e"} · ✏️
            </div>
            <div style={S.annivCountdowns}>
              <div style={S.annivBox}>
                <div style={S.annivNum}>{annivInfo.dMens === 0 ? "🎉" : annivInfo.dMens}</div>
                <div style={S.annivLabel}>
                  {annivInfo.dMens === 0 ? "Mesiversario oggi!" : `giorn${annivInfo.dMens !== 1 ? "i" : "o"} al mesiversario`}
                </div>
              </div>
              <div style={S.annivDivider} />
              <div style={S.annivBox}>
                <div style={{ ...S.annivNum, color: "#f5a623" }}>
                  {annivInfo.dAnniv === 0 ? "🎉" : annivInfo.dAnniv}
                </div>
                <div style={S.annivLabel}>
                  {annivInfo.dAnniv === 0 ? "Anniversario oggi!" : `giorn${annivInfo.dAnniv !== 1 ? "i" : "o"} all'anniversario`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Eye */}
      <div style={{ ...S.eyeWrap, opacity: glow ? 1 : 0, transform: glow ? "scale(1)" : "scale(0.7)" }}>
        <div style={S.tentacleBg}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ ...S.tentLine, transform: `rotate(${i * 45}deg)`, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <div style={S.eye}><div style={S.pupil} /></div>
      </div>
      <h1 style={S.hubTitle}>Covo di Cthulhu</h1>
      <p style={S.hubSub}>{movies.length} film · {watched.length} visti · {plans.length} serate</p>

      <div style={S.grid}>
        {SECTIONS.map((s) => (
          <button key={s.id} style={S.card} onClick={() => onGo(s.id)}>
            <span style={S.cardIcon}>{s.icon}</span>
            <span style={S.cardLabel}>{s.label}</span>
          </button>
        ))}
      </div>
      <p style={S.footer}>Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn 🐙</p>
    </div>
  );
}

/* ════════════════ MOVIE LIST ════════════════ */
function MovieList({ data, save }) {
  const [inp, setInp] = useState("");
  const add = () => {
    const t = inp.trim();
    if (!t || data.movies.includes(t)) return;
    save({ ...data, movies: [...data.movies, t], votes: { ...data.votes, [t]: { lui: 0, lei: 0 } } });
    setInp("");
  };
  const rm = (m) => {
    const v = { ...data.votes };
    delete v[m];
    save({ ...data, movies: data.movies.filter((x) => x !== m), votes: v });
  };
  return (
    <div style={S.sec}>
      <h2 style={S.secTitle}>📋 Lista Film</h2>
      <div style={S.row}>
        <input style={S.input} value={inp} onChange={(e) => setInp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Aggiungi un film..." />
        <button style={S.addBtn} onClick={add}>+</button>
      </div>
      {data.movies.length === 0 && <p style={S.empty}>La lista è vuota!</p>}
      {data.movies.map((m, i) => (
        <div key={m} style={S.item}>
          <span style={{ fontSize: 18 }}>{"🎬🍿🎥📽️🎞️"[i % 5]}</span>
          <span style={{ ...S.itemText, color: hash(m) }}>{m}</span>
          <button style={S.xBtn} onClick={() => rm(m)}>✕</button>
        </div>
      ))}
      <p style={S.count}>{data.movies.length} film in lista</p>
    </div>
  );
}

/* ════════════════ WHEEL ════════════════ */
function Wheel({ movies }) {
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [picked, setPicked] = useState(null);

  const spin = () => {
    if (movies.length < 2 || spinning) return;
    setSpinning(true);
    setPicked(null);
    const nr = rot + 1440 + Math.random() * 1440;
    setRot(nr);
    setTimeout(() => {
      const seg = 360 / movies.length;
      const norm = nr % 360;
      const idx = Math.floor(((360 - norm + seg / 2) % 360) / seg) % movies.length;
      setPicked(movies[idx]);
      setSpinning(false);
    }, 3600);
  };

  const sz = 280, cx = sz / 2, cy = sz / 2, r = sz / 2 - 6;
  const seg = movies.length ? 360 / movies.length : 360;
  const polar = (a, rad) => {
    const d = ((a - 90) * Math.PI) / 180;
    return [cx + rad * Math.cos(d), cy + rad * Math.sin(d)];
  };

  return (
    <div style={{ ...S.sec, alignItems: "center" }}>
      <h2 style={S.secTitle}>🎰 Estrazione</h2>
      {movies.length < 2 ? (
        <p style={S.empty}>Servono almeno 2 film!</p>
      ) : (
        <>
          <div style={{ position: "relative" }}>
            <div style={S.pointer}>▼</div>
            <svg width={sz} height={sz} style={{ transition: spinning ? "transform 3.5s cubic-bezier(.17,.67,.12,.99)" : "none", transform: `rotate(${rot}deg)` }}>
              {movies.map((m, i) => {
                const a1 = i * seg, a2 = a1 + seg;
                const [x1, y1] = polar(a1, r);
                const [x2, y2] = polar(a2, r);
                const lg = seg > 180 ? 1 : 0;
                const mid = a1 + seg / 2;
                const [tx, ty] = polar(mid, r * 0.6);
                return (
                  <g key={i}>
                    <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2} Z`} fill={hash(m)} stroke="#0d1117" strokeWidth="2" />
                    <text x={tx} y={ty} fill="#fff" fontSize={movies.length > 8 ? 8 : 10} fontWeight="700" textAnchor="middle" dominantBaseline="central" transform={`rotate(${mid},${tx},${ty})`}>
                      {m.length > 13 ? m.slice(0, 11) + "…" : m}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <button style={{ ...S.bigBtn, opacity: spinning ? 0.5 : 1 }} onClick={spin} disabled={spinning}>
            {spinning ? "Girando..." : "🐙 Estrai dal Covo!"}
          </button>
          {picked && (
            <div style={S.pickedCard}>
              <div style={S.pickedLbl}>Stasera guardiamo:</div>
              <div style={S.pickedTxt}>{picked}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ════════════════ VOTES ════════════════ */
function Votes({ data, save, role }) {
  const vote = (m) => {
    const v = { ...data.votes, [m]: { ...data.votes[m], [role]: (data.votes[m]?.[role] || 0) + 1 } };
    save({ ...data, votes: v });
  };
  const reset = (m) => save({ ...data, votes: { ...data.votes, [m]: { lui: 0, lei: 0 } } });
  const sorted = [...data.movies].sort((a, b) => {
    const sa = (data.votes[a]?.lui || 0) + (data.votes[a]?.lei || 0);
    const sb = (data.votes[b]?.lui || 0) + (data.votes[b]?.lei || 0);
    return sb - sa;
  });

  return (
    <div style={S.sec}>
      <h2 style={S.secTitle}>⭐ Votazione</h2>
      <p style={{ fontSize: 12, color: "#6a6a8a", margin: 0 }}>Stai votando come <strong style={{ color: "#c4a0ff" }}>{role}</strong></p>
      {sorted.length === 0 && <p style={S.empty}>Aggiungi film prima!</p>}
      {sorted.map((m) => {
        const v = data.votes[m] || { lui: 0, lei: 0 };
        const t = v.lui + v.lei;
        return (
          <div key={m} style={S.voteCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{m}</span>
              <span style={S.badge}>{t} voti</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={S.vBtn} onClick={() => vote(m)}>
                {role === "lui" ? "🙋‍♂️" : "🙋‍♀️"} Vota!
              </button>
              <div style={{ ...S.vBtn, background: "transparent", textAlign: "center", cursor: "default" }}>
                🙋‍♂️ {v.lui} · 🙋‍♀️ {v.lei}
              </div>
              <button style={S.rstBtn} onClick={() => reset(m)}>↺</button>
            </div>
            {t > 0 && (
              <div style={S.bar}>
                <div style={{ ...S.barL, width: `${(v.lui / t) * 100}%` }} />
                <div style={{ ...S.barR, width: `${(v.lei / t) * 100}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════ WATCHED ════════════════ */
function Watched({ data, save }) {
  const markWatched = (m) => {
    save({
      ...data,
      movies: data.movies.filter((x) => x !== m),
      watched: [...data.watched, { title: m, date: new Date().toLocaleDateString("it-IT") }],
    });
  };
  const unwatch = (title) => {
    save({
      ...data,
      watched: data.watched.filter((w) => w.title !== title),
      movies: [...data.movies, title],
    });
  };

  return (
    <div style={S.sec}>
      <h2 style={S.secTitle}>✅ Già Visti</h2>
      {data.movies.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: "#6a6a8a", margin: 0 }}>Segna come visto:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.movies.map((m) => (
              <button key={m} style={S.chip} onClick={() => markWatched(m)}>{m} ✓</button>
            ))}
          </div>
        </>
      )}
      {data.watched.length === 0 && <p style={S.empty}>Nessun film visto ancora!</p>}
      {data.watched.map((w, i) => (
        <div key={i} style={S.item}>
          <span>🎬</span>
          <span style={S.itemText}>{w.title}</span>
          <span style={{ fontSize: 11, color: "#6a6a8a" }}>{w.date}</span>
          <button style={S.xBtn} onClick={() => unwatch(w.title)}>↩</button>
        </div>
      ))}
    </div>
  );
}

/* ════════════════ PLANNER ════════════════ */
function Planner({ data, save }) {
  const [form, setForm] = useState({ date: "", time: "", movie: "", activity: "", place: "", food: "", drink: "", note: "" });
  const add = () => {
    if (!form.date) return;
    save({ ...data, plans: [...data.plans, { ...form, id: Date.now() }] });
    setForm({ date: "", time: "", movie: "", activity: "", place: "", food: "", drink: "", note: "" });
  };
  const rm = (id) => save({ ...data, plans: data.plans.filter((p) => p.id !== id) });

  return (
    <div style={S.sec}>
      <h2 style={S.secTitle}>🕯️ Date Night Planner</h2>
      <div style={S.formGroup}>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" style={S.input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input type="time" style={{ ...S.input, maxWidth: 120 }} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </div>
        <select style={S.input} value={form.movie} onChange={(e) => setForm({ ...form, movie: e.target.value })}>
          <option value="">🎬 Film (opzionale)</option>
          {data.movies.map((m) => <option key={m}>{m}</option>)}
        </select>
        <input style={S.input} placeholder="🎭 Attività (cinema, passeggiata, gioco...)" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} />
        <input style={S.input} placeholder="📍 Dove (casa, ristorante, parco...)" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
        <input style={S.input} placeholder="🍕 Cibo" value={form.food} onChange={(e) => setForm({ ...form, food: e.target.value })} />
        <input style={S.input} placeholder="🍷 Bevande" value={form.drink} onChange={(e) => setForm({ ...form, drink: e.target.value })} />
        <input style={S.input} placeholder="📝 Note..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button style={S.bigBtn} onClick={add}>+ Pianifica Serata</button>
      </div>
      {data.plans.length === 0 && <p style={S.empty}>Nessuna serata pianificata!</p>}
      {[...data.plans].reverse().map((p) => (
        <div key={p.id} style={S.planCard}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, color: "#c4a0ff" }}>📅 {p.date}{p.time ? ` · 🕐 ${p.time}` : ""}</span>
            <button style={S.xBtn} onClick={() => rm(p.id)}>✕</button>
          </div>
          {p.movie && <div>🎬 {p.movie}</div>}
          {p.activity && <div>🎭 {p.activity}</div>}
          {p.place && <div>📍 {p.place}</div>}
          {p.food && <div>🍕 {p.food}</div>}
          {p.drink && <div>🍷 {p.drink}</div>}
          {p.note && <div style={{ fontSize: 12, color: "#8888aa", fontStyle: "italic" }}>"{p.note}"</div>}
        </div>
      ))}
    </div>
  );
}

/* ════════════════ REVIEWS ════════════════ */
function Reviews({ data, save, role }) {
  const [sel, setSel] = useState("");
  const [score, setScore] = useState(7);
  const [comment, setComment] = useState("");

  const allTitles = [...new Set([...data.movies, ...data.watched.map((w) => w.title)])];

  const addReview = () => {
    if (!sel) return;
    const existing = data.reviews[sel] || {};
    save({
      ...data,
      reviews: {
        ...data.reviews,
        [sel]: {
          ...existing,
          [role]: score,
          [`${role}Comment`]: comment,
          avg: +((score + (existing[role === "lui" ? "lei" : "lui"] || score)) / 2).toFixed(1),
          date: new Date().toLocaleDateString("it-IT"),
        },
      },
    });
    setSel("");
    setComment("");
  };

  const reviewed = Object.entries(data.reviews || {}).sort((a, b) => (b[1].avg || 0) - (a[1].avg || 0));

  return (
    <div style={S.sec}>
      <h2 style={S.secTitle}>📝 Recensioni</h2>
      <p style={{ fontSize: 12, color: "#6a6a8a", margin: 0 }}>Recensisci come <strong style={{ color: "#c4a0ff" }}>{role}</strong></p>
      <div style={S.formGroup}>
        <select style={S.input} value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">— Scegli film —</option>
          {allTitles.map((m) => <option key={m}>{m}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13, width: 60 }}>{role === "lui" ? "🙋‍♂️" : "🙋‍♀️"} Voto</label>
          <input type="range" min="1" max="10" value={score} onChange={(e) => setScore(+e.target.value)} style={{ flex: 1 }} />
          <span style={S.scoreBadge}>{score}</span>
        </div>
        <input style={S.input} placeholder="Un commento..." value={comment} onChange={(e) => setComment(e.target.value)} />
        <button style={S.bigBtn} onClick={addReview}>📝 Salva Recensione</button>
      </div>
      {reviewed.length === 0 && <p style={S.empty}>Nessuna recensione!</p>}
      {reviewed.map(([title, r]) => (
        <div key={title} style={S.reviewCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
            <span style={{ ...S.scoreBadge, fontSize: 16, background: r.avg >= 7 ? "rgba(76,175,80,.25)" : r.avg >= 5 ? "rgba(255,193,7,.25)" : "rgba(233,69,96,.25)", color: r.avg >= 7 ? "#81c784" : r.avg >= 5 ? "#ffd54f" : "#e94560" }}>
              {r.avg}/10
            </span>
          </div>
          <div style={{ fontSize: 12, display: "flex", gap: 12 }}>
            {r.lui !== undefined && <span>🙋‍♂️ {r.lui}/10</span>}
            {r.lei !== undefined && <span>🙋‍♀️ {r.lei}/10</span>}
            <span style={{ color: "#6a6a8a" }}>{r.date}</span>
          </div>
          {r.luiComment && <div style={{ fontSize: 12, color: "#aaa" }}>🙋‍♂️ "{r.luiComment}"</div>}
          {r.leiComment && <div style={{ fontSize: 12, color: "#aaa" }}>🙋‍♀️ "{r.leiComment}"</div>}
        </div>
      ))}
    </div>
  );
}

/* ════════════════ STYLES ════════════════ */
const S = {
  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d1117", fontFamily: "'Nunito', sans-serif" },
  authPage: { fontFamily: "'Nunito', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "linear-gradient(170deg, #0d1117 0%, #161b22 40%, #1a1040 100%)", padding: 24 },
  googleBtn: { display: "flex", alignItems: "center", padding: "12px 28px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#e0e0f0", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  roleBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "20px 28px", borderRadius: 16, border: "1px solid rgba(155,89,182,0.2)", background: "rgba(255,255,255,0.04)", color: "#e0e0f0", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  linkBtn: { border: "none", background: "transparent", color: "#6a6a8a", fontSize: 12, cursor: "pointer", textDecoration: "underline" },
  userBar: { display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 360, marginBottom: 12, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 12 },
  avatar: { width: 32, height: 32, borderRadius: "50%" },
  page: { fontFamily: "'Nunito', sans-serif", maxWidth: 440, margin: "0 auto", padding: 16, minHeight: "100vh", background: "linear-gradient(170deg, #0d1117 0%, #161b22 40%, #1a1040 100%)", color: "#e0e0f0" },
  hub: { fontFamily: "'Nunito', sans-serif", maxWidth: 440, margin: "0 auto", padding: "24px 20px 20px", minHeight: "100vh", background: "linear-gradient(170deg, #0d1117 0%, #161b22 40%, #1a1040 100%)", color: "#e0e0f0", display: "flex", flexDirection: "column", alignItems: "center" },
  annivBanner: { width: "100%", maxWidth: 360, padding: "14px 16px", background: "rgba(155,89,182,0.08)", border: "1px solid rgba(155,89,182,0.18)", borderRadius: 16, marginBottom: 16 },
  annivCountdowns: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 4 },
  annivBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  annivNum: { fontSize: 28, fontWeight: 900, color: "#c4a0ff", lineHeight: 1 },
  annivLabel: { fontSize: 10, color: "#8888aa", textAlign: "center" },
  annivDivider: { width: 1, height: 36, background: "rgba(255,255,255,0.08)" },
  eyeWrap: { position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 1s ease", marginBottom: 12 },
  tentacleBg: { position: "absolute", width: "100%", height: "100%" },
  tentLine: { position: "absolute", top: "50%", left: "50%", width: 2, height: 55, background: "linear-gradient(to bottom, #7b42c9, transparent)", transformOrigin: "top center", borderRadius: 2, opacity: 0.5 },
  eye: { width: 56, height: 56, borderRadius: "50%", background: "radial-gradient(circle, #4eff8a 0%, #1a8a4a 60%, #0d1117 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(78,255,138,0.3)", zIndex: 2 },
  pupil: { width: 18, height: 28, borderRadius: "50%", background: "#0d1117" },
  hubTitle: { margin: "0 0 4px", fontSize: 30, fontWeight: 900, background: "linear-gradient(135deg, #9b59b6, #4eff8a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -0.5 },
  hubSub: { margin: "0 0 28px", fontSize: 13, color: "#6a6a8a" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 360 },
  card: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "22px 12px", border: "1px solid rgba(155,89,182,0.15)", borderRadius: 16, background: "rgba(255,255,255,0.03)", color: "#e0e0f0", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  cardIcon: { fontSize: 30 },
  cardLabel: { fontSize: 13 },
  footer: { marginTop: 32, fontSize: 10, color: "#3a3a5a", textAlign: "center", fontStyle: "italic" },
  backBtn: { border: "none", background: "rgba(155,89,182,0.15)", color: "#c4a0ff", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16 },
  sec: { display: "flex", flexDirection: "column", gap: 12 },
  secTitle: { fontSize: 20, fontWeight: 800, margin: "0 0 4px", color: "#c4a0ff" },
  row: { display: "flex", gap: 8 },
  input: { flex: 1, padding: "11px 14px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "#e0e0f0", fontSize: 14, outline: "none" },
  addBtn: { width: 44, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #9b59b6, #6c3483)", color: "#fff", fontSize: 20, fontWeight: 700, cursor: "pointer" },
  bigBtn: { padding: "13px 0", border: "none", borderRadius: 12, background: "linear-gradient(135deg, #9b59b6, #4eff8a)", color: "#0d1117", fontSize: 15, fontWeight: 800, cursor: "pointer" },
  empty: { textAlign: "center", color: "#4a4a6a", fontSize: 13, padding: 28 },
  item: { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 12 },
  itemText: { flex: 1, fontSize: 14, fontWeight: 600, color: "#e0e0f0" },
  xBtn: { width: 26, height: 26, border: "none", borderRadius: 7, background: "rgba(233,69,96,0.15)", color: "#e94560", fontSize: 12, cursor: "pointer" },
  count: { textAlign: "center", fontSize: 11, color: "#4a4a6a" },
  pointer: { textAlign: "center", fontSize: 26, color: "#4eff8a", marginBottom: -6, zIndex: 2, filter: "drop-shadow(0 2px 4px rgba(0,0,0,.5))" },
  pickedCard: { marginTop: 14, padding: 18, background: "rgba(78,255,138,0.08)", border: "1px solid rgba(78,255,138,0.2)", borderRadius: 14, textAlign: "center" },
  pickedLbl: { fontSize: 12, color: "#4eff8a", marginBottom: 4, fontWeight: 600 },
  pickedTxt: { fontSize: 20, fontWeight: 800, color: "#fff" },
  voteCard: { padding: 14, background: "rgba(255,255,255,0.04)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8 },
  badge: { fontSize: 10, fontWeight: 700, background: "rgba(155,89,182,0.2)", color: "#c4a0ff", padding: "2px 8px", borderRadius: 16 },
  vBtn: { flex: 1, padding: "9px 0", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, background: "rgba(255,255,255,0.03)", color: "#e0e0f0", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  rstBtn: { width: 36, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, background: "transparent", color: "#6a6a8a", fontSize: 15, cursor: "pointer" },
  bar: { display: "flex", height: 5, borderRadius: 3, overflow: "hidden", background: "rgba(255,255,255,0.04)" },
  barL: { background: "#4fc3f7", transition: "width .3s" },
  barR: { background: "#e94560", transition: "width .3s" },
  chip: { padding: "6px 12px", border: "1px solid rgba(78,255,138,0.2)", borderRadius: 20, background: "rgba(78,255,138,0.06)", color: "#4eff8a", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  formGroup: { display: "flex", flexDirection: "column", gap: 10 },
  planCard: { padding: 14, background: "rgba(255,255,255,0.04)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 },
  reviewCard: { padding: 14, background: "rgba(255,255,255,0.04)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 6 },
  scoreBadge: { fontSize: 14, fontWeight: 800, background: "rgba(155,89,182,0.2)", color: "#c4a0ff", padding: "3px 10px", borderRadius: 8, minWidth: 28, textAlign: "center" },
};
