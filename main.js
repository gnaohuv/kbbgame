import React, { useState, useEffect, useRef, useCallback } from "react";

/*
  VUA · DÂN · NÔ LỆ — đối kháng 1v1
  Vòng tròn: 👑 Vua > 🧑‍🌾 Dân > ⛓️ Nô lệ > 👑 Vua
  Luồng: Chọn ngôn ngữ -> Đăng nhập -> Sảnh (Sảnh / BXH / Lịch sử) -> Trận đấu.
  Tài khoản, BXH và lịch sử lưu bằng bộ nhớ chia sẻ của artifact (demo, không phải auth thật).
*/

const ROLES = [
  { id: "vua", emoji: "👑", vn: "Vua", en: "King" },
  { id: "dan", emoji: "🧑‍🌾", vn: "Dân", en: "Commoner" },
  { id: "nole", emoji: "⛓️", vn: "Nô lệ", en: "Slave" },
];
const ROLE = Object.fromEntries(ROLES.map((r) => [r.id, r]));
const rname = (id, lang) => ROLE[id][lang];
const BEATS = { vua: "dan", dan: "nole", nole: "vua" };
const WHY = {
  "vua>dan": { vn: "Vua cai trị Dân", en: "King rules the Commoner" },
  "dan>nole": { vn: "Dân áp chế Nô lệ", en: "Commoner subdues the Slave" },
  "nole>vua": { vn: "Nô lệ lật đổ Vua", en: "Slave overthrows the King" },
};
const judge = (a, b) => (a === b ? "draw" : BEATS[a] === b ? "win" : "lose");

const T = {
  vn: {
    subtitle: "Đối kháng 1v1 — luật vòng tròn",
    chooseLang: "Chọn ngôn ngữ", cont: "Tiếp tục",
    loginTitle: "Đăng nhập", username: "Tên tài khoản", password: "Mật khẩu",
    enter: "Đăng nhập", newAcct: "Tài khoản chưa tồn tại sẽ được tạo tự động.",
    errFields: "Nhập tên tài khoản và mật khẩu.", errWrongPw: "Sai mật khẩu.",
    errRoom: "Không tìm thấy phòng.", errCode: "Mã phòng chưa hợp lệ.",
    tabLobby: "Sảnh", tabRank: "Bảng xếp hạng", tabHist: "Lịch sử đấu",
    ranked: "Đấu xếp hạng", to3: "Chạm 3", to5: "Chạm 5",
    pickHint: "Chọn hình thức đấu", vsBot: "Đấu với máy",
    createRoom: "Tạo phòng", joinRoom: "Vào phòng bằng mã",
    codePh: "Nhập mã phòng", joinBtn: "Vào phòng", back: "Quay lại", logout: "Đăng xuất",
    you: "Bạn", opp: "Đối thủ", cpu: "Máy", roomCode: "Mã phòng",
    waiting: "Đang chờ đối thủ vào phòng…", joined: "Đối thủ đã vào — bắt đầu!",
    pickYours: "Chọn quân của bạn", waitMove: "Chờ đối thủ ra quân…",
    round: "Ván", maxR: "tối đa", firstTo: "Thắng trước",
    wonR: "Thắng ván!", lostR: "Thua ván!", drawR: "Hòa — ra cùng quân",
    youWin: "🏆 Bạn chiến thắng!", youLose: "💀 Bạn thua cuộc", score: "Tỉ số",
    again: "Chơi lại", toLobby: "Về sảnh", quit: "Thoát trận",
    lbRank: "Hạng", lbPlayer: "Người chơi", lbWin: "Thắng", lbLose: "Thua",
    lbEmpty: "Chưa có dữ liệu xếp hạng.", meTag: "(bạn)",
    histEmpty: "Chưa có trận nào.", histWin: "Thắng", histLose: "Thua", vs: "gặp",
  },
  en: {
    subtitle: "1v1 duel — circular rule",
    chooseLang: "Choose language", cont: "Continue",
    loginTitle: "Log in", username: "Username", password: "Password",
    enter: "Log in", newAcct: "A new account is created automatically.",
    errFields: "Enter a username and password.", errWrongPw: "Wrong password.",
    errRoom: "Room not found.", errCode: "Invalid room code.",
    tabLobby: "Lobby", tabRank: "Leaderboard", tabHist: "Match history",
    ranked: "Ranked", to3: "First to 3", to5: "First to 5",
    pickHint: "Pick how to play", vsBot: "vs Computer",
    createRoom: "Create room", joinRoom: "Join with code",
    codePh: "Enter room code", joinBtn: "Join", back: "Back", logout: "Log out",
    you: "You", opp: "Opponent", cpu: "Computer", roomCode: "Room code",
    waiting: "Waiting for an opponent…", joined: "Opponent joined — go!",
    pickYours: "Pick your piece", waitMove: "Waiting for opponent's move…",
    round: "Round", maxR: "max", firstTo: "First to",
    wonR: "Round won!", lostR: "Round lost!", drawR: "Draw — same piece",
    youWin: "🏆 You win!", youLose: "💀 You lose", score: "Score",
    again: "Play again", toLobby: "Back to lobby", quit: "Quit match",
    lbRank: "Rank", lbPlayer: "Player", lbWin: "Wins", lbLose: "Losses",
    lbEmpty: "No ranking data yet.", meTag: "(you)",
    histEmpty: "No matches yet.", histWin: "Won", histLose: "Lost", vs: "vs",
  },
};

// ---------- shared storage helpers ----------
async function sget(key) {
  try {
    const r = await window.storage.get(key, true);
    return r ? r.value : null;
  } catch {
    return null;
  }
}
async function sset(key, value) {
  try {
    await window.storage.set(key, value, true);
  } catch {}
}
async function slist(prefix) {
  try {
    const r = await window.storage.list(prefix, true);
    return r && r.keys ? r.keys : [];
  } catch {
    return [];
  }
}
async function hashPw(s) {
  try {
    const data = new TextEncoder().encode(s + "::vdn-salt-v1");
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "fb" + (h >>> 0).toString(16);
  }
}
function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}
const mvKey = (code, g, r, role) => `dvn:${code}:g${g}:r${r}:${role}`;

export default function App() {
  const [lang, setLang] = useState(null); // null | 'vn' | 'en'
  const [screen, setScreen] = useState("login"); // login | lobby | game
  const [user, setUser] = useState(null);

  // match session
  const [mode, setMode] = useState(null); // bot | online
  const [role, setRole] = useState("host");
  const [code, setCode] = useState("");
  const [target, setTarget] = useState(3);
  const [game, setGame] = useState(1);
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({ me: 0, opp: 0 });
  const [myMove, setMyMove] = useState(null);
  const [oppMove, setOppMove] = useState(null);
  const [oppName, setOppName] = useState("");
  const [oppHere, setOppHere] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | waiting | choosing | reveal | gameover

  const ref = useRef({});
  ref.current = { mode, role, code, target, game, round, scores, myMove, phase, user, oppName, lang };
  const resolvedFor = useRef("");
  const recorded = useRef(-1);
  const busy = useRef(false);

  const tr = T[lang || "vn"];

  // ---------- record W/L + history ----------
  const recordResult = useCallback(async (result, mine, theirs) => {
    const u = ref.current.user;
    if (!u) return;
    const key = `acct:${u.toLowerCase()}`;
    const raw = await sget(key);
    const acc = raw ? JSON.parse(raw) : { pw: "", name: u, wins: 0, losses: 0 };
    if (result === "win") acc.wins = (acc.wins || 0) + 1;
    else acc.losses = (acc.losses || 0) + 1;
    await sset(key, JSON.stringify(acc));
    const hk = `hist:${u.toLowerCase()}`;
    const hraw = await sget(hk);
    const arr = hraw ? JSON.parse(hraw) : [];
    arr.unshift({
      vs: ref.current.oppName || (ref.current.mode === "bot" ? "CPU" : "?"),
      bot: ref.current.mode === "bot",
      target: ref.current.target,
      result,
      me: mine,
      opp: theirs,
      t: Date.now(),
    });
    await sset(hk, JSON.stringify(arr.slice(0, 30)));
  }, []);

  // ---------- resolve a round ----------
  const resolve = useCallback((mine, theirs, g, r) => {
    const tag = `${g}-${r}`;
    if (resolvedFor.current === tag) return;
    resolvedFor.current = tag;
    setOppMove(theirs);
    setPhase("reveal");
    const res = judge(mine, theirs);
    const next = { ...ref.current.scores };
    if (res === "win") next.me += 1;
    else if (res === "lose") next.opp += 1;
    setScores(next);
    const tgt = ref.current.target;
    const over = next.me >= tgt || next.opp >= tgt;
    if (over && recorded.current !== ref.current.game) {
      recorded.current = ref.current.game;
      recordResult(next.me >= tgt ? "win" : "lose", next.me, next.opp);
    }
    setTimeout(
      () => {
        if (over) setPhase("gameover");
        else {
          setRound((x) => x + 1);
          setMyMove(null);
          setOppMove(null);
          setPhase("choosing");
        }
      },
      over ? 1600 : 1900
    );
  }, [recordResult]);

  // ---------- online sync loop ----------
  useEffect(() => {
    if (screen !== "game" || mode !== "online") return;
    let alive = true;
    const tick = async () => {
      if (!alive || busy.current) return;
      busy.current = true;
      try {
        const c = ref.current.code;
        const them = ref.current.role === "host" ? "guest" : "host";
        const there = await sget(`dvn:${c}:p:${them}`);
        if (there) {
          setOppHere(true);
          setOppName(there);
          if (ref.current.phase === "waiting") setPhase("choosing");
        }
        const gc = await sget(`dvn:${c}:game`);
        if (gc && Number(gc) > ref.current.game) {
          setGame(Number(gc));
          setRound(1);
          setScores({ me: 0, opp: 0 });
          setMyMove(null);
          setOppMove(null);
          resolvedFor.current = "";
          recorded.current = -1;
          setPhase("choosing");
          busy.current = false;
          return;
        }
        if (ref.current.myMove && ref.current.phase === "choosing") {
          const g = ref.current.game;
          const r = ref.current.round;
          const opp = await sget(mvKey(c, g, r, them));
          if (opp) resolve(ref.current.myMove, opp, g, r);
        }
      } finally {
        busy.current = false;
      }
    };
    const iv = setInterval(tick, 1400);
    tick();
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [screen, mode, resolve]);

  // ---------- auth ----------
  async function doLogin(name, pw) {
    const u = name.trim();
    if (!u || !pw) return tr.errFields;
    const key = `acct:${u.toLowerCase()}`;
    const ph = await hashPw(pw);
    const raw = await sget(key);
    if (!raw) {
      await sset(key, JSON.stringify({ pw: ph, name: u, wins: 0, losses: 0 }));
      setUser(u);
      setScreen("lobby");
      return null;
    }
    const acc = JSON.parse(raw);
    if (acc.pw !== ph) return tr.errWrongPw;
    setUser(acc.name || u);
    setScreen("lobby");
    return null;
  }
  function logout() {
    setUser(null);
    setScreen("login");
  }

  // ---------- start matches ----------
  function freshMatch() {
    setGame(1);
    setRound(1);
    setScores({ me: 0, opp: 0 });
    setMyMove(null);
    setOppMove(null);
    resolvedFor.current = "";
    recorded.current = -1;
  }
  function startBot(tg) {
    setMode("bot");
    setRole("host");
    setTarget(tg);
    setOppName(tr.cpu);
    setOppHere(true);
    freshMatch();
    setPhase("choosing");
    setScreen("game");
  }
  async function createRoom(tg) {
    const c = genCode();
    setMode("online");
    setRole("host");
    setTarget(tg);
    setCode(c);
    setOppName("");
    setOppHere(false);
    freshMatch();
    setPhase("waiting");
    setScreen("game");
    await sset(`dvn:${c}:meta`, JSON.stringify({ host: user, target: tg }));
    await sset(`dvn:${c}:p:host`, user);
    await sset(`dvn:${c}:game`, "1");
  }
  async function joinRoom(codeIn) {
    const c = codeIn.trim().toUpperCase();
    if (c.length < 3) return tr.errCode;
    const metaRaw = await sget(`dvn:${c}:meta`);
    if (!metaRaw) return tr.errRoom;
    const meta = JSON.parse(metaRaw);
    const gc = await sget(`dvn:${c}:game`);
    setMode("online");
    setRole("guest");
    setTarget(meta.target || 3);
    setCode(c);
    setOppName(meta.host || "?");
    setOppHere(true);
    setGame(gc ? Number(gc) : 1);
    setRound(1);
    setScores({ me: 0, opp: 0 });
    setMyMove(null);
    setOppMove(null);
    resolvedFor.current = "";
    recorded.current = -1;
    setPhase("choosing");
    setScreen("game");
    await sset(`dvn:${c}:p:guest`, user);
    return null;
  }

  async function pick(id) {
    if (ref.current.phase !== "choosing" || myMove) return;
    setMyMove(id);
    if (mode === "bot") {
      const bot = ROLES[Math.floor(Math.random() * 3)].id;
      setTimeout(() => resolve(id, bot, game, round), 850);
    } else {
      await sset(mvKey(code, game, round, role), id);
      const them = role === "host" ? "guest" : "host";
      const opp = await sget(mvKey(code, game, round, them));
      if (opp) resolve(id, opp, game, round);
    }
  }
  async function rematch() {
    const ng = game + 1;
    setGame(ng);
    setRound(1);
    setScores({ me: 0, opp: 0 });
    setMyMove(null);
    setOppMove(null);
    resolvedFor.current = "";
    recorded.current = -1;
    setPhase("choosing");
    if (mode === "online") await sset(`dvn:${code}:game`, String(ng));
  }
  function toLobby() {
    setScreen("lobby");
    setMode(null);
    setPhase("idle");
    setCode("");
  }

  // ---------- render ----------
  if (!lang) return <LangScreen onPick={(l) => { setLang(l); setScreen("login"); }} />;

  return (
    <Shell lang={lang} setLang={setLang} tr={tr} user={screen !== "login" ? user : null} onLogout={logout}>
      {screen === "login" && <Login tr={tr} onLogin={doLogin} />}
      {screen === "lobby" && (
        <Lobby tr={tr} lang={lang} user={user} onBot={startBot} onCreate={createRoom} onJoin={joinRoom} />
      )}
      {screen === "game" && (
        <Game
          tr={tr} lang={lang} mode={mode} code={code} target={target} round={round}
          scores={scores} myMove={myMove} oppMove={oppMove} oppName={oppName}
          oppHere={oppHere} phase={phase} onPick={pick} onRematch={rematch} onQuit={toLobby}
        />
      )}
    </Shell>
  );
}

// ============ layout ============
function Shell({ lang, setLang, tr, user, onLogout, children }) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 font-sans text-stone-100"
      style={{ background: "radial-gradient(120% 120% at 50% -10%, #2b1d52 0%, #1a1133 45%, #0c0820 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setLang(lang === "vn" ? "en" : "vn")}
            className="text-xs rounded-full border border-white/10 px-3 py-1 text-stone-300 hover:border-amber-400/60"
          >
            🌐 {lang === "vn" ? "VN" : "EN"}
          </button>
          {user ? (
            <button onClick={onLogout} className="text-xs text-stone-400 hover:text-amber-300">
              {user} · {tr.logout}
            </button>
          ) : (
            <span />
          )}
        </div>
        <div className="text-center mb-5 select-none">
          <div className="text-2xl mb-1" style={{ letterSpacing: "0.25em" }}>👑 ⚔️ ⛓️</div>
          <h1 className="font-serif text-3xl font-bold text-amber-300">Vua · Dân · Nô Lệ</h1>
          <p className="text-stone-400 text-sm mt-1">{tr.subtitle}</p>
        </div>
        {children}
        <div className="mt-5 text-center text-xs text-stone-500">
          👑 {rname("vua", lang)} &gt; 🧑‍🌾 {rname("dan", lang)} &gt; ⛓️ {rname("nole", lang)} &gt; 👑 {rname("vua", lang)}
        </div>
      </div>
    </div>
  );
}
function Panel({ children }) {
  return (
    <div
      className="rounded-2xl border border-amber-400/20 p-5 shadow-xl"
      style={{ background: "rgba(20,14,40,0.6)", backdropFilter: "blur(4px)" }}
    >
      {children}
    </div>
  );
}
function BigButton({ children, onClick, tone = "gold" }) {
  const styles = {
    gold: "bg-amber-400 text-stone-900 hover:bg-amber-300",
    ghost: "bg-transparent border border-amber-400/40 text-amber-200 hover:bg-amber-400/10",
  };
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl py-3.5 font-semibold transition-colors active:scale-95 ${styles[tone]}`}
    >
      {children}
    </button>
  );
}
function Field(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400/60"
    />
  );
}

// ============ language ============
function LangScreen({ onPick }) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 font-sans text-stone-100"
      style={{ background: "radial-gradient(120% 120% at 50% -10%, #2b1d52 0%, #1a1133 45%, #0c0820 100%)" }}
    >
      <div className="w-full max-w-md text-center">
        <div className="text-3xl mb-2" style={{ letterSpacing: "0.25em" }}>👑 ⚔️ ⛓️</div>
        <h1 className="font-serif text-3xl font-bold text-amber-300 mb-6">Vua · Dân · Nô Lệ</h1>
        <Panel>
          <p className="text-stone-300 mb-4">Chọn ngôn ngữ · Choose language</p>
          <div className="space-y-3">
            <BigButton onClick={() => onPick("vn")}>🇻🇳 Tiếng Việt</BigButton>
            <BigButton tone="ghost" onClick={() => onPick("en")}>🇬🇧 English</BigButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ============ login ============
function Login({ tr, onLogin }) {
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    const e = await onLogin(name, pw);
    setBusy(false);
    if (e) setErr(e);
  }
  return (
    <Panel>
      <h2 className="font-serif text-xl text-amber-200 mb-3">{tr.loginTitle}</h2>
      <div className="space-y-3">
        <Field value={name} maxLength={16} placeholder={tr.username}
          onChange={(e) => { setErr(""); setName(e.target.value); }} />
        <Field type="password" value={pw} maxLength={32} placeholder={tr.password}
          onChange={(e) => { setErr(""); setPw(e.target.value); }}
          onKeyDown={(e) => e.key === "Enter" && submit()} />
        {err && <p className="text-rose-400 text-sm">{err}</p>}
        <BigButton onClick={submit}>{busy ? "…" : tr.enter}</BigButton>
        <p className="text-stone-500 text-xs text-center">{tr.newAcct}</p>
      </div>
    </Panel>
  );
}

// ============ lobby ============
function Lobby({ tr, lang, user, onBot, onCreate, onJoin }) {
  const [tab, setTab] = useState("lobby");
  const tabs = [
    ["lobby", tr.tabLobby],
    ["rank", tr.tabRank],
    ["hist", tr.tabHist],
  ];
  return (
    <div>
      <div className="flex gap-1 mb-3 rounded-xl bg-black/25 p-1 border border-white/10">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === k ? "bg-amber-400 text-stone-900" : "text-stone-300 hover:text-amber-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "lobby" && <LobbyHome tr={tr} onBot={onBot} onCreate={onCreate} onJoin={onJoin} />}
      {tab === "rank" && <Leaderboard tr={tr} user={user} />}
      {tab === "hist" && <History tr={tr} lang={lang} user={user} />}
    </div>
  );
}

function LobbyHome({ tr, onBot, onCreate, onJoin }) {
  const [target, setTarget] = useState(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  if (!target) {
    return (
      <Panel>
        <p className="text-stone-300 text-sm mb-3">{tr.ranked}</p>
        <div className="space-y-3">
          <ModeCard emoji="⚔️" title={`${tr.ranked} · ${tr.to3}`} desc="Best of 5" onClick={() => setTarget(3)} />
          <ModeCard emoji="🏰" title={`${tr.ranked} · ${tr.to5}`} desc="Best of 9" onClick={() => setTarget(5)} />
        </div>
      </Panel>
    );
  }
  return (
    <Panel>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-lg text-amber-200">
          {tr.ranked} · {target === 3 ? tr.to3 : tr.to5}
        </h3>
        <button onClick={() => { setTarget(null); setErr(""); }} className="text-stone-400 text-sm hover:text-amber-300">
          ← {tr.back}
        </button>
      </div>
      <p className="text-stone-400 text-sm mb-3">{tr.pickHint}</p>
      <div className="space-y-3">
        <BigButton onClick={() => onBot(target)}>🤖 {tr.vsBot}</BigButton>
        <BigButton tone="ghost" onClick={() => onCreate(target)}>🛡️ {tr.createRoom}</BigButton>
        <div className="pt-1">
          <Field value={code} maxLength={4} placeholder={tr.codePh}
            style={{ textAlign: "center", letterSpacing: "0.3em", textTransform: "uppercase" }}
            onChange={(e) => { setErr(""); setCode(e.target.value.toUpperCase()); }} />
          {err && <p className="text-rose-400 text-sm mt-2">{err}</p>}
          <button
            onClick={async () => { const e = await onJoin(code); if (e) setErr(e); }}
            className="w-full mt-2 rounded-xl py-3 font-semibold border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 transition-colors"
          >
            🔑 {tr.joinBtn}
          </button>
        </div>
      </div>
    </Panel>
  );
}
function ModeCard({ emoji, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-white/10 bg-black/20 p-4 flex items-center gap-3 hover:border-amber-400/50 hover:bg-amber-400/5 transition-all active:scale-95"
    >
      <span className="text-3xl">{emoji}</span>
      <span>
        <span className="block font-semibold text-stone-100">{title}</span>
        <span className="block text-xs text-stone-400">{desc}</span>
      </span>
    </button>
  );
}

function Leaderboard({ tr, user }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let on = true;
    (async () => {
      const keys = await slist("acct:");
      const out = [];
      for (const k of keys) {
        const raw = await sget(k);
        if (raw) {
          const a = JSON.parse(raw);
          out.push({ name: a.name || k.slice(5), wins: a.wins || 0, losses: a.losses || 0 });
        }
      }
      out.sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
      if (on) setRows(out.slice(0, 50));
    })();
    return () => { on = false; };
  }, []);

  if (rows === null) return <Panel><p className="text-stone-400 text-sm text-center">…</p></Panel>;
  if (rows.length === 0) return <Panel><p className="text-stone-400 text-sm text-center">{tr.lbEmpty}</p></Panel>;
  return (
    <Panel>
      <div className="flex text-xs text-stone-400 uppercase tracking-wide px-1 pb-2 border-b border-white/10">
        <span className="w-8">{tr.lbRank}</span>
        <span className="flex-1">{tr.lbPlayer}</span>
        <span className="w-12 text-right">{tr.lbWin}</span>
        <span className="w-12 text-right">{tr.lbLose}</span>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((r, i) => {
          const me = user && r.name.toLowerCase() === user.toLowerCase();
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
          return (
            <div key={r.name} className={`flex items-center py-2.5 px-1 text-sm ${me ? "text-amber-200" : "text-stone-200"}`}>
              <span className="w-8 font-semibold">{medal}</span>
              <span className="flex-1 truncate">
                {r.name} {me && <span className="text-amber-400 text-xs">{tr.meTag}</span>}
              </span>
              <span className="w-12 text-right font-semibold text-emerald-300">{r.wins}</span>
              <span className="w-12 text-right text-rose-300">{r.losses}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function History({ tr, lang, user }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let on = true;
    (async () => {
      const raw = await sget(`hist:${user.toLowerCase()}`);
      if (on) setItems(raw ? JSON.parse(raw) : []);
    })();
    return () => { on = false; };
  }, [user]);

  if (items === null) return <Panel><p className="text-stone-400 text-sm text-center">…</p></Panel>;
  if (items.length === 0) return <Panel><p className="text-stone-400 text-sm text-center">{tr.histEmpty}</p></Panel>;
  return (
    <Panel>
      <div className="space-y-2">
        {items.map((m, i) => {
          const win = m.result === "win";
          const when = new Date(m.t).toLocaleDateString(lang === "vn" ? "vi-VN" : "en-US", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
          });
          const oppLabel = m.bot ? tr.cpu : m.vs;
          return (
            <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`text-lg ${win ? "text-emerald-300" : "text-rose-300"}`}>{win ? "▲" : "▼"}</span>
                <div>
                  <div className="text-sm text-stone-100">
                    <span className={`font-semibold ${win ? "text-emerald-300" : "text-rose-300"}`}>
                      {win ? tr.histWin : tr.histLose}
                    </span>{" "}
                    <span className="text-stone-400">{tr.vs} {oppLabel}</span>
                  </div>
                  <div className="text-xs text-stone-500">{m.target === 3 ? tr.to3 : tr.to5} · {when}</div>
                </div>
              </div>
              <div className="font-mono text-sm text-stone-300">{m.me}–{m.opp}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ============ game ============
function Game(props) {
  const { tr, lang, mode, code, target, round, scores, myMove, oppMove, oppName, oppHere, phase, onPick, onRematch, onQuit } = props;
  const showOpp = phase === "reveal" || phase === "gameover";
  const result = showOpp && myMove && oppMove ? judge(myMove, oppMove) : null;
  const won = scores.me >= target;
  const maxRounds = target * 2 - 1;
  const oppLabel = mode === "bot" ? tr.cpu : oppName || tr.opp;

  return (
    <Panel>
      <div className="flex items-center justify-between mb-4">
        <ScoreBox label={tr.you} value={scores.me} accent="text-amber-300" />
        <div className="text-center">
          <div className="text-xs text-stone-400">{tr.round} {round} / {tr.maxR} {maxRounds}</div>
          <div className="text-stone-500 text-xs">{tr.firstTo} {target}</div>
        </div>
        <ScoreBox label={oppLabel} value={scores.opp} accent="text-rose-300" />
      </div>

      {mode === "online" && (
        <div className="text-center mb-4 text-sm">
          <span className="text-stone-400">{tr.roomCode}: </span>
          <span className="font-mono text-xl text-amber-200" style={{ letterSpacing: "0.3em" }}>{code}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Slot title={tr.you} lang={lang} move={myMove} reveal={!!myMove}
          highlight={result === "win"} dim={result === "lose"} />
        <Slot title={oppLabel} lang={lang} move={oppMove} reveal={showOpp}
          waiting={mode !== "bot" && phase === "choosing" && !!myMove}
          highlight={result === "lose"} dim={result === "win"} />
      </div>

      <div className="h-7 text-center mb-3 text-sm">
        {phase === "waiting" && <span className="text-stone-400">{oppHere ? tr.joined : tr.waiting}</span>}
        {phase === "choosing" && !myMove && <span className="text-amber-200">{tr.pickYours}</span>}
        {phase === "choosing" && myMove && mode !== "bot" && <span className="text-stone-400">{tr.waitMove}</span>}
        {phase === "reveal" && <ResultText tr={tr} lang={lang} result={result} myMove={myMove} oppMove={oppMove} />}
      </div>

      {phase === "gameover" ? (
        <div className="text-center space-y-3">
          <div className="text-2xl font-serif font-bold">{won ? tr.youWin : tr.youLose}</div>
          <div className="text-stone-400 text-sm">{tr.score} {scores.me} – {scores.opp}</div>
          <BigButton onClick={onRematch}>{tr.again}</BigButton>
          <BigButton tone="ghost" onClick={onQuit}>{tr.toLobby}</BigButton>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => {
              const disabled = phase !== "choosing" || !!myMove;
              const chosen = myMove === r.id;
              return (
                <button
                  key={r.id}
                  disabled={disabled}
                  onClick={() => onPick(r.id)}
                  className={`rounded-xl py-3 px-1 flex flex-col items-center gap-1 transition-all active:scale-95 border ${
                    chosen
                      ? "border-amber-400 bg-amber-400/20"
                      : "border-white/10 bg-black/20 hover:border-amber-400/50 hover:bg-amber-400/5"
                  } ${disabled && !chosen ? "opacity-40" : ""}`}
                >
                  <span className="text-3xl">{r.emoji}</span>
                  <span className="text-sm font-semibold text-stone-100">{r[lang]}</span>
                </button>
              );
            })}
          </div>
          <button onClick={onQuit} className="w-full mt-4 text-stone-500 text-sm hover:text-stone-300">
            {tr.quit}
          </button>
        </>
      )}
    </Panel>
  );
}
function ScoreBox({ label, value, accent }) {
  return (
    <div className="text-center w-20">
      <div className="text-stone-400 text-xs uppercase tracking-wide truncate">{label}</div>
      <div className={`text-3xl font-bold font-serif ${accent}`}>{value}</div>
    </div>
  );
}
function Slot({ title, lang, move, reveal, waiting, highlight, dim }) {
  return (
    <div
      style={{ aspectRatio: "1 / 1" }}
      className={`rounded-2xl flex flex-col items-center justify-center border transition-all ${
        highlight ? "border-emerald-400 bg-emerald-400/10"
          : dim ? "border-rose-500/40 bg-rose-500/5 opacity-70"
          : "border-white/10 bg-black/25"
      }`}
    >
      <div className="text-xs text-stone-400 mb-1 truncate px-2 max-w-full">{title}</div>
      <div className="text-5xl">{reveal && move ? ROLE[move].emoji : waiting ? "⏳" : move ? "✔️" : "❔"}</div>
      <div className="text-sm text-stone-300 mt-1 h-5">{reveal && move ? rname(move, lang) : ""}</div>
    </div>
  );
}
function ResultText({ tr, lang, result, myMove, oppMove }) {
  if (result === "draw") return <span className="text-stone-300 font-semibold">{tr.drawR}</span>;
  const pair = result === "win" ? `${myMove}>${oppMove}` : `${oppMove}>${myMove}`;
  const why = WHY[pair] ? WHY[pair][lang] : "";
  return (
    <span className={`font-semibold ${result === "win" ? "text-emerald-300" : "text-rose-300"}`}>
      {result === "win" ? tr.wonR : tr.lostR}{" "}
      <span className="text-stone-400 font-normal text-sm">({why})</span>
    </span>
  );
}