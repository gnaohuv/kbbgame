/* Vua · Dân · Nô Lệ — đối kháng 1v1 (thuần HTML/JS, không build, không package.json)
   - Online thật: PeerJS (WebRTC P2P) qua mã phòng.
   - Tài khoản / BXH / Lịch sử: localStorage (lưu cục bộ trên trình duyệt này). */

// ===================== dữ liệu cố định =====================
var ROLES = [
  { id: "vua",  emoji: "👑", vn: "Vua",   en: "King" },
  { id: "dan",  emoji: "🧑‍🌾", vn: "Dân",   en: "Commoner" },
  { id: "nole", emoji: "⛓️", vn: "Nô lệ", en: "Slave" }
];
var ROLE = {}; ROLES.forEach(function (r) { ROLE[r.id] = r; });
var BEATS = { vua: "dan", dan: "nole", nole: "vua" };
var WHY = {
  "vua>dan":  { vn: "Vua cai trị Dân",            en: "King rules the Commoner" },
  "dan>nole": { vn: "Dân áp chế Nô lệ",           en: "Commoner subdues the Slave" },
  "nole>vua": { vn: "Nô lệ vùng lên lật đổ Vua",  en: "Slave overthrows the King" }
};
function judge(a, b) { return a === b ? "draw" : (BEATS[a] === b ? "win" : "lose"); }

var T = {
  vn: {
    subtitle: "Đối kháng 1v1 — luật vòng tròn",
    loginTitle: "Đăng nhập", username: "Tên tài khoản", password: "Mật khẩu",
    enter: "Đăng nhập", newAcct: "Tài khoản chưa tồn tại sẽ được tạo tự động.",
    errFields: "Nhập tên tài khoản và mật khẩu.", errWrongPw: "Sai mật khẩu.",
    errCode: "Mã phòng chưa hợp lệ.", errRoom: "Không vào được phòng (sai mã hoặc chủ phòng đã thoát).",
    oppLeft: "Đối thủ đã rời trận.", netErr: "Lỗi kết nối mạng.", connecting: "Đang kết nối tới phòng…",
    logout: "Đăng xuất",
    tabLobby: "Sảnh", tabRank: "Bảng xếp hạng", tabHist: "Lịch sử đấu",
    ranked: "Đấu xếp hạng", to3: "Chạm 3", to5: "Chạm 5", bo5: "Thắng 3/5 ván", bo9: "Thắng 5/9 ván",
    pickHint: "Chọn hình thức đấu", vsBot: "Đấu với máy", createRoom: "Tạo phòng",
    codePh: "Nhập mã phòng", joinBtn: "Vào phòng", back: "Quay lại",
    you: "Bạn", opp: "Đối thủ", cpu: "Máy", roomCode: "Mã phòng",
    waiting: "Đang chờ đối thủ vào phòng…", pickYours: "Chọn quân của bạn", waitMove: "Chờ đối thủ ra quân…",
    round: "Ván", maxR: "tối đa", firstTo: "Thắng trước",
    wonR: "Thắng ván!", lostR: "Thua ván!", drawR: "Hòa — ra cùng quân",
    youWin: "🏆 Bạn chiến thắng!", youLose: "💀 Bạn thua cuộc", score: "Tỉ số",
    again: "Chơi lại", toLobby: "Về sảnh", quit: "Thoát trận",
    lbRank: "Hạng", lbPlayer: "Người chơi", lbWin: "Thắng", lbLose: "Thua",
    lbEmpty: "Chưa có dữ liệu xếp hạng.", meTag: "(bạn)",
    histEmpty: "Chưa có trận nào.", histWin: "Thắng", histLose: "Thua", vs: "gặp"
  },
  en: {
    subtitle: "1v1 duel — circular rule",
    loginTitle: "Log in", username: "Username", password: "Password",
    enter: "Log in", newAcct: "A new account is created automatically.",
    errFields: "Enter a username and password.", errWrongPw: "Wrong password.",
    errCode: "Invalid room code.", errRoom: "Could not join the room (wrong code or host left).",
    oppLeft: "Opponent left the match.", netErr: "Network connection error.", connecting: "Connecting to room…",
    logout: "Log out",
    tabLobby: "Lobby", tabRank: "Leaderboard", tabHist: "Match history",
    ranked: "Ranked", to3: "First to 3", to5: "First to 5", bo5: "Win 3 of 5", bo9: "Win 5 of 9",
    pickHint: "Pick how to play", vsBot: "vs Computer", createRoom: "Create room",
    codePh: "Enter room code", joinBtn: "Join", back: "Back",
    you: "You", opp: "Opponent", cpu: "Computer", roomCode: "Room code",
    waiting: "Waiting for an opponent…", pickYours: "Pick your piece", waitMove: "Waiting for opponent's move…",
    round: "Round", maxR: "max", firstTo: "First to",
    wonR: "Round won!", lostR: "Round lost!", drawR: "Draw — same piece",
    youWin: "🏆 You win!", youLose: "💀 You lose", score: "Score",
    again: "Play again", toLobby: "Back to lobby", quit: "Quit match",
    lbRank: "Rank", lbPlayer: "Player", lbWin: "Wins", lbLose: "Losses",
    lbEmpty: "No ranking data yet.", meTag: "(you)",
    histEmpty: "No matches yet.", histWin: "Won", histLose: "Lost", vs: "vs"
  }
};

// ===================== trạng thái =====================
var state = {
  lang: null, screen: "login", user: null,
  tab: "lobby", lobbyTarget: null,
  mode: null, role: "host", code: "", target: 3,
  game: 1, round: 1, scores: { me: 0, opp: 0 },
  myMove: null, oppMove: null, oppName: "",
  phase: "idle", recordedGame: -1, resolvedTag: "", oppBuf: {},
  netMsg: "", peer: null, conn: null, _joinTimer: null
};
function tr() { return T[state.lang || "vn"]; }
function rname(id) { return ROLE[id][state.lang || "vn"]; }

// ===================== tiện ích =====================
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function el(id) { return document.getElementById(id); }
function genCode() {
  var c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
  for (var i = 0; i < 4; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}
// hash đơn giản (KHÔNG bảo mật — chỉ để tài khoản cục bộ không lưu mật khẩu thô)
function hashPw(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
// ---- localStorage ----
function loadAccounts() { try { return JSON.parse(localStorage.getItem("vdn_accounts") || "{}"); } catch (e) { return {}; } }
function saveAccounts(a) { try { localStorage.setItem("vdn_accounts", JSON.stringify(a)); } catch (e) {} }
function loadHistory() { try { return JSON.parse(localStorage.getItem("vdn_history") || "{}"); } catch (e) { return {}; } }
function saveHistory(h) { try { localStorage.setItem("vdn_history", JSON.stringify(h)); } catch (e) {} }

function recordResult(result, me, opp) {
  if (!state.user) return;
  var key = state.user.toLowerCase();
  var accs = loadAccounts();
  var acc = accs[key] || { pw: "", name: state.user, wins: 0, losses: 0 };
  if (result === "win") acc.wins = (acc.wins || 0) + 1; else acc.losses = (acc.losses || 0) + 1;
  accs[key] = acc; saveAccounts(accs);
  var hist = loadHistory();
  var arr = hist[key] || [];
  arr.unshift({
    vs: state.oppName || (state.mode === "bot" ? "CPU" : "?"),
    bot: state.mode === "bot", target: state.target,
    result: result, me: me, opp: opp, t: Date.now()
  });
  hist[key] = arr.slice(0, 30); saveHistory(hist);
}

// ===================== auth =====================
function doLogin() {
  var name = (el("loginName").value || "").trim();
  var pw = el("loginPw").value || "";
  var errEl = el("loginErr");
  if (!name || !pw) { errEl.textContent = tr().errFields; return; }
  var accs = loadAccounts(), key = name.toLowerCase(), ph = hashPw(pw);
  if (!accs[key]) {
    accs[key] = { pw: ph, name: name, wins: 0, losses: 0 };
    saveAccounts(accs); enterLobby(name); return;
  }
  if (accs[key].pw !== ph) { errEl.textContent = tr().errWrongPw; return; }
  enterLobby(accs[key].name || name);
}
function enterLobby(name) {
  state.user = name; state.screen = "lobby"; state.tab = "lobby"; state.lobbyTarget = null; render();
}
function logout() { cleanupNet(); state.user = null; state.screen = "login"; render(); }

// ===================== bắt đầu trận =====================
function freshMatch() {
  state.game = 1; state.round = 1; state.scores = { me: 0, opp: 0 };
  state.myMove = null; state.oppMove = null;
  state.resolvedTag = ""; state.recordedGame = -1; state.oppBuf = {};
}
function startBot(target) {
  state.mode = "bot"; state.role = "host"; state.target = target;
  state.oppName = tr().cpu; freshMatch(); state.phase = "choosing";
  state.screen = "game"; render();
}

// ===================== online (PeerJS) =====================
function ensurePeerLib() { return typeof Peer !== "undefined"; }

function createRoom(target) {
  if (!ensurePeerLib()) { state.netMsg = tr().netErr; state.phase = "left"; state.screen = "game"; render(); return; }
  state.mode = "online"; state.role = "host"; state.target = target;
  state.oppName = ""; freshMatch(); state.phase = "waiting";
  state.code = genCode(); state.netMsg = ""; state.screen = "game"; render();
  openHost(0);
}
function openHost(attempt) {
  var peer = new Peer("vdn-" + state.code, { debug: 0 });
  state.peer = peer;
  peer.on("connection", function (conn) { setupConn(conn); });
  peer.on("error", function (e) {
    if (e && e.type === "unavailable-id" && attempt < 3) {
      try { peer.destroy(); } catch (x) {}
      state.code = genCode(); render(); openHost(attempt + 1);
    } else { state.netMsg = tr().netErr; state.phase = "left"; render(); }
  });
}
function joinRoom(rawCode) {
  var code = (rawCode || "").trim().toUpperCase();
  if (code.length < 3) return tr().errCode;
  if (!ensurePeerLib()) { state.netMsg = tr().netErr; state.phase = "left"; state.screen = "game"; render(); return null; }
  state.mode = "online"; state.role = "guest"; state.code = code;
  state.target = state.lobbyTarget || 3; state.oppName = "";
  freshMatch(); state.phase = "waiting"; state.netMsg = ""; state.screen = "game"; render();

  var peer = new Peer(undefined, { debug: 0 });
  state.peer = peer;
  peer.on("open", function () {
    var conn;
    try { conn = peer.connect("vdn-" + code, { reliable: true }); }
    catch (e) { joinFail(); return; }
    setupConn(conn);
    state._joinTimer = setTimeout(function () { if (state.phase === "waiting") joinFail(); }, 9000);
  });
  peer.on("error", function () { joinFail(); });
  return null;
}
function joinFail() { clearJoinTimer(); state.netMsg = tr().errRoom; state.phase = "left"; render(); }
function clearJoinTimer() { if (state._joinTimer) { clearTimeout(state._joinTimer); state._joinTimer = null; } }

function setupConn(conn) {
  state.conn = conn;
  conn.on("open", function () {
    clearJoinTimer();
    var hello = { type: "hello", name: state.user };
    if (state.role === "host") hello.target = state.target;
    try { conn.send(hello); } catch (e) {}
    if (state.phase === "waiting") { state.phase = "choosing"; render(); }
  });
  conn.on("data", onData);
  conn.on("close", netLeft);
  conn.on("error", netLeft);
}
function onData(d) {
  if (!d || !d.type) return;
  if (d.type === "hello") {
    state.oppName = d.name || "";
    if (typeof d.target === "number") state.target = d.target;
    if (state.phase === "waiting") state.phase = "choosing";
    render();
  } else if (d.type === "move") {
    state.oppBuf[d.game + "-" + d.round] = d.move;
    tryResolve();
  } else if (d.type === "rematch") {
    if (d.game > state.game) applyRematch(d.game);
  }
}
function netLeft() {
  if (state.phase === "left") return;
  state.netMsg = tr().oppLeft; state.phase = "left"; render();
}
function cleanupNet() {
  clearJoinTimer();
  try { if (state.conn) state.conn.close(); } catch (e) {}
  try { if (state.peer) state.peer.destroy(); } catch (e) {}
  state.conn = null; state.peer = null;
}

// ===================== logic ván đấu =====================
function onPick(id) {
  if (state.phase !== "choosing" || state.myMove) return;
  state.myMove = id; render();
  if (state.mode === "bot") {
    var bot = ROLES[Math.floor(Math.random() * 3)].id;
    setTimeout(function () { resolve(id, bot); }, 850);
  } else {
    if (state.conn && state.conn.open) {
      try { state.conn.send({ type: "move", game: state.game, round: state.round, move: id }); } catch (e) {}
    }
    tryResolve();
  }
}
function tryResolve() {
  if (state.phase !== "choosing" || !state.myMove) return;
  var opp = state.oppBuf[state.game + "-" + state.round];
  if (opp) resolve(state.myMove, opp);
}
function resolve(mine, theirs) {
  var tag = state.game + "-" + state.round;
  if (state.resolvedTag === tag) return;
  state.resolvedTag = tag;
  state.oppMove = theirs; state.phase = "reveal";
  var res = judge(mine, theirs);
  if (res === "win") state.scores.me++; else if (res === "lose") state.scores.opp++;
  var over = state.scores.me >= state.target || state.scores.opp >= state.target;
  if (over && state.recordedGame !== state.game) {
    state.recordedGame = state.game;
    recordResult(state.scores.me >= state.target ? "win" : "lose", state.scores.me, state.scores.opp);
  }
  render();
  setTimeout(function () {
    if (over) { state.phase = "gameover"; }
    else { state.round++; state.myMove = null; state.oppMove = null; state.phase = "choosing"; }
    render();
  }, over ? 1600 : 1900);
}
function applyRematch(g) {
  state.game = g; state.round = 1; state.scores = { me: 0, opp: 0 };
  state.myMove = null; state.oppMove = null;
  state.resolvedTag = ""; state.recordedGame = -1; state.oppBuf = {};
  state.phase = "choosing"; render();
}
function rematch() {
  var ng = state.game + 1; applyRematch(ng);
  if (state.mode === "online" && state.conn && state.conn.open) {
    try { state.conn.send({ type: "rematch", game: ng }); } catch (e) {}
  }
}
function toLobby() {
  cleanupNet();
  state.screen = "lobby"; state.mode = null; state.phase = "idle";
  state.code = ""; state.netMsg = ""; state.lobbyTarget = null; render();
}

// ===================== views (trả về chuỗi HTML) =====================
function viewLang() {
  return '' +
    '<div class="head">' +
      '<div class="crowns">👑 ⚔️ ⛓️</div>' +
      '<h1>Vua · Dân · Nô Lệ</h1>' +
    '</div>' +
    '<div class="panel">' +
      '<p style="text-align:center;color:var(--muted);margin:0 0 16px">Chọn ngôn ngữ · Choose language</p>' +
      '<div class="stack">' +
        '<button class="btn" data-lang="vn">🇻🇳 Tiếng Việt</button>' +
        '<button class="btn ghost" data-lang="en">🇬🇧 English</button>' +
      '</div>' +
    '</div>';
}
function shell(content) {
  var right = (state.screen !== "login" && state.user)
    ? '<button class="mini ghosttext" id="logoutBtn">' + esc(state.user) + ' · ' + tr().logout + '</button>'
    : '<span></span>';
  return '' +
    '<div class="topbar">' +
      '<button class="mini" id="langToggle">🌐 ' + (state.lang === "vn" ? "VN" : "EN") + '</button>' +
      right +
    '</div>' +
    '<div class="head">' +
      '<div class="crowns">👑 ⚔️ ⛓️</div>' +
      '<h1>Vua · Dân · Nô Lệ</h1>' +
      '<p class="sub">' + tr().subtitle + '</p>' +
    '</div>' +
    content +
    '<div class="foot">👑 ' + rname("vua") + ' &gt; 🧑‍🌾 ' + rname("dan") + ' &gt; ⛓️ ' + rname("nole") + ' &gt; 👑 ' + rname("vua") + '</div>';
}
function viewLogin() {
  return '' +
    '<div class="panel">' +
      '<h2 class="title">' + tr().loginTitle + '</h2>' +
      '<div class="stack">' +
        '<input id="loginName" class="field" maxlength="16" placeholder="' + tr().username + '" autocomplete="username" />' +
        '<input id="loginPw" class="field" type="password" maxlength="32" placeholder="' + tr().password + '" autocomplete="current-password" />' +
        '<div class="err" id="loginErr"></div>' +
        '<button class="btn" id="loginBtn">' + tr().enter + '</button>' +
        '<p class="hint">' + tr().newAcct + '</p>' +
      '</div>' +
    '</div>';
}
function viewLobby() {
  var tabs = [["lobby", tr().tabLobby], ["rank", tr().tabRank], ["hist", tr().tabHist]];
  var tabsHtml = tabs.map(function (t) {
    return '<button class="tab' + (state.tab === t[0] ? " active" : "") + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
  }).join("");
  var body = state.tab === "lobby" ? viewLobbyHome()
           : state.tab === "rank" ? viewLeaderboard()
           : viewHistory();
  return '<div class="tabs">' + tabsHtml + '</div>' + body;
}
function viewLobbyHome() {
  if (!state.lobbyTarget) {
    return '<div class="panel">' +
      '<p style="color:var(--muted);font-size:14px;margin:0 0 12px">' + tr().ranked + '</p>' +
      '<div class="stack">' +
        modeCard("⚔️", tr().ranked + " · " + tr().to3, tr().bo5, 3) +
        modeCard("🏰", tr().ranked + " · " + tr().to5, tr().bo9, 5) +
      '</div>' +
    '</div>';
  }
  var label = state.lobbyTarget === 3 ? tr().to3 : tr().to5;
  return '<div class="panel">' +
    '<div class="rowtop">' +
      '<h2 class="title" style="margin:0">' + tr().ranked + ' · ' + label + '</h2>' +
      '<button class="link" id="lobbyBack">← ' + tr().back + '</button>' +
    '</div>' +
    '<p style="color:var(--muted);font-size:14px;margin:0 0 12px">' + tr().pickHint + '</p>' +
    '<div class="stack">' +
      '<button class="btn" id="botBtn">🤖 ' + tr().vsBot + '</button>' +
      '<button class="btn ghost" id="createBtn">🛡️ ' + tr().createRoom + '</button>' +
      '<div>' +
        '<input id="codeInput" class="field code-input" maxlength="4" placeholder="' + tr().codePh + '" />' +
        '<div class="err" id="joinErr"></div>' +
        '<button class="btn ghost" id="joinBtn" style="margin-top:8px">🔑 ' + tr().joinBtn + '</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}
function modeCard(ico, title, desc, target) {
  return '<button class="modecard" data-target="' + target + '">' +
    '<span class="ico">' + ico + '</span>' +
    '<span><b>' + title + '</b><small>' + desc + '</small></span>' +
  '</button>';
}
function viewLeaderboard() {
  var accs = loadAccounts();
  var rows = Object.keys(accs).map(function (k) {
    var a = accs[k];
    return { name: a.name || k, wins: a.wins || 0, losses: a.losses || 0 };
  }).sort(function (x, y) {
    return (y.wins - x.wins) || (x.losses - y.losses) || x.name.localeCompare(y.name);
  }).slice(0, 50);

  if (rows.length === 0) return '<div class="panel"><p class="empty">' + tr().lbEmpty + '</p></div>';
  var head = '<div class="lbhead"><span class="c-rank">' + tr().lbRank + '</span>' +
    '<span class="c-name">' + tr().lbPlayer + '</span>' +
    '<span class="c-w">' + tr().lbWin + '</span>' +
    '<span class="c-l">' + tr().lbLose + '</span></div>';
  var body = rows.map(function (r, i) {
    var me = state.user && r.name.toLowerCase() === state.user.toLowerCase();
    var medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
    return '<div class="lbrow' + (me ? " me" : "") + '">' +
      '<span class="c-rank">' + medal + '</span>' +
      '<span class="c-name">' + esc(r.name) + (me ? ' <span style="color:var(--gold);font-size:12px">' + tr().meTag + '</span>' : '') + '</span>' +
      '<span class="c-w">' + r.wins + '</span>' +
      '<span class="c-l">' + r.losses + '</span>' +
    '</div>';
  }).join("");
  return '<div class="panel">' + head + body + '</div>';
}
function viewHistory() {
  var hist = loadHistory();
  var items = (state.user && hist[state.user.toLowerCase()]) || [];
  if (items.length === 0) return '<div class="panel"><p class="empty">' + tr().histEmpty + '</p></div>';
  var locale = state.lang === "vn" ? "vi-VN" : "en-US";
  var rows = items.map(function (m) {
    var win = m.result === "win";
    var when = new Date(m.t).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    var oppLabel = m.bot ? tr().cpu : esc(m.vs);
    var tgt = m.target === 3 ? tr().to3 : tr().to5;
    return '<div class="histrow">' +
      '<div class="histleft">' +
        '<span class="arrow ' + (win ? "win" : "lose") + '">' + (win ? "▲" : "▼") + '</span>' +
        '<div>' +
          '<div class="htop"><span class="tag' + (win ? "" : " lose") + '">' + (win ? tr().histWin : tr().histLose) + '</span> ' +
            '<span style="color:var(--muted)">' + tr().vs + ' ' + oppLabel + '</span></div>' +
          '<div class="hbot">' + tgt + ' · ' + when + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="hscore">' + m.me + '–' + m.opp + '</div>' +
    '</div>';
  }).join("");
  return '<div class="panel">' + rows + '</div>';
}
function viewGame() {
  var oppLabel = state.mode === "bot" ? tr().cpu : (state.oppName || tr().opp);
  var maxRounds = state.target * 2 - 1;
  var showOpp = state.phase === "reveal" || state.phase === "gameover";
  var result = (showOpp && state.myMove && state.oppMove) ? judge(state.myMove, state.oppMove) : null;

  var head = '<div class="gamehead">' +
    '<div class="score me"><div class="lbl">' + tr().you + '</div><div class="val">' + state.scores.me + '</div></div>' +
    '<div class="roundinfo">' + tr().round + ' ' + state.round + ' / ' + tr().maxR + ' ' + maxRounds +
      '<br><span class="small">' + tr().firstTo + ' ' + state.target + '</span></div>' +
    '<div class="score opp"><div class="lbl">' + esc(oppLabel) + '</div><div class="val">' + state.scores.opp + '</div></div>' +
  '</div>';

  var codeLine = state.mode === "online"
    ? '<div class="codeline">' + tr().roomCode + ': <b>' + esc(state.code) + '</b></div>' : '';

  var arena = '<div class="arena">' +
    slot(tr().you, state.myMove, !!state.myMove, false, result === "win", result === "lose") +
    slot(oppLabel, state.oppMove, showOpp, (state.mode !== "bot" && state.phase === "choosing" && !!state.myMove), result === "lose", result === "win") +
  '</div>';

  var status = '<div class="status">' + statusText(result) + '</div>';

  var controls;
  if (state.phase === "gameover") {
    var won = state.scores.me >= state.target;
    controls = '<div class="center-msg">' +
      '<div class="big">' + (won ? tr().youWin : tr().youLose) + '</div>' +
      '<div class="scoreline">' + tr().score + ' ' + state.scores.me + ' – ' + state.scores.opp + '</div>' +
      '<div class="stack">' +
        '<button class="btn" id="rematchBtn">' + tr().again + '</button>' +
        '<button class="btn ghost" id="backBtn">' + tr().toLobby + '</button>' +
      '</div>' +
    '</div>';
  } else if (state.phase === "left") {
    controls = '<div class="center-msg">' +
      '<div class="big">⚠️</div>' +
      '<div class="scoreline">' + esc(state.netMsg) + '</div>' +
      '<button class="btn" id="backBtn">' + tr().toLobby + '</button>' +
    '</div>';
  } else {
    var roles = "";
    if (state.phase === "choosing" || state.phase === "reveal") {
      var disabled = state.phase !== "choosing" || !!state.myMove;
      roles = '<div class="roles">' + ROLES.map(function (r) {
        var sel = state.myMove === r.id;
        var cls = "role" + (sel ? " sel" : "") + (disabled && !sel ? " dim" : "");
        return '<button class="' + cls + '" data-role="' + r.id + '"' + (disabled ? " disabled" : "") + '>' +
          '<span class="re">' + r.emoji + '</span><span class="rn">' + r[state.lang] + '</span></button>';
      }).join("") + '</div>';
    }
    controls = roles + '<button class="quit" id="quitBtn">' + tr().quit + '</button>';
  }

  return '<div class="panel">' + head + codeLine + arena + status + controls + '</div>';
}
function slot(title, move, reveal, waiting, win, lose) {
  var cls = "slot" + (win ? " win" : lose ? " lose" : "");
  var face = reveal && move ? ROLE[move].emoji : (waiting ? "⏳" : (move ? "✔️" : "❔"));
  var name = reveal && move ? rname(move) : "";
  return '<div class="' + cls + '">' +
    '<div class="stitle">' + esc(title) + '</div>' +
    '<div class="emoji">' + face + '</div>' +
    '<div class="sname">' + name + '</div>' +
  '</div>';
}
function statusText(result) {
  if (state.phase === "waiting") {
    return '<span style="color:var(--muted)">' + (state.role === "guest" ? tr().connecting : tr().waiting) + '</span>';
  }
  if (state.phase === "choosing" && !state.myMove) return '<span style="color:var(--gold-soft)">' + tr().pickYours + '</span>';
  if (state.phase === "choosing" && state.myMove && state.mode !== "bot") return '<span style="color:var(--muted)">' + tr().waitMove + '</span>';
  if (state.phase === "reveal" && result) {
    if (result === "draw") return '<span class="draw">' + tr().drawR + '</span>';
    var pair = result === "win" ? (state.myMove + ">" + state.oppMove) : (state.oppMove + ">" + state.myMove);
    var why = WHY[pair] ? WHY[pair][state.lang] : "";
    return '<span class="' + result + '">' + (result === "win" ? tr().wonR : tr().lostR) +
      ' <span class="why">(' + why + ')</span></span>';
  }
  return "";
}

// ===================== render + gắn sự kiện =====================
function render() {
  var app = el("app");
  if (!state.lang) { app.innerHTML = viewLang(); bindLang(); return; }
  if (state.screen === "login") { app.innerHTML = shell(viewLogin()); bindShell(); bindLogin(); }
  else if (state.screen === "lobby") { app.innerHTML = shell(viewLobby()); bindShell(); bindLobby(); }
  else if (state.screen === "game") { app.innerHTML = shell(viewGame()); bindShell(); bindGame(); }
}
function bindLang() {
  var btns = document.querySelectorAll("[data-lang]");
  btns.forEach(function (b) {
    b.onclick = function () { state.lang = b.getAttribute("data-lang"); state.screen = "login"; render(); };
  });
}
function bindShell() {
  var lt = el("langToggle");
  if (lt) lt.onclick = function () { state.lang = state.lang === "vn" ? "en" : "vn"; render(); };
  var lo = el("logoutBtn");
  if (lo) lo.onclick = logout;
}
function bindLogin() {
  var btn = el("loginBtn"); if (btn) btn.onclick = doLogin;
  var pw = el("loginPw");
  if (pw) pw.onkeydown = function (e) { if (e.key === "Enter") doLogin(); };
}
function bindLobby() {
  document.querySelectorAll("[data-tab]").forEach(function (b) {
    b.onclick = function () { state.tab = b.getAttribute("data-tab"); render(); };
  });
  if (state.tab !== "lobby") return;
  if (!state.lobbyTarget) {
    document.querySelectorAll("[data-target]").forEach(function (b) {
      b.onclick = function () { state.lobbyTarget = parseInt(b.getAttribute("data-target"), 10); render(); };
    });
  } else {
    var back = el("lobbyBack"); if (back) back.onclick = function () { state.lobbyTarget = null; render(); };
    var botB = el("botBtn"); if (botB) botB.onclick = function () { startBot(state.lobbyTarget); };
    var crB = el("createBtn"); if (crB) crB.onclick = function () { createRoom(state.lobbyTarget); };
    var joinB = el("joinBtn");
    if (joinB) joinB.onclick = function () {
      var e = joinRoom(el("codeInput").value);
      if (e) el("joinErr").textContent = e;
    };
  }
}
function bindGame() {
  document.querySelectorAll("[data-role]").forEach(function (b) {
    b.onclick = function () { onPick(b.getAttribute("data-role")); };
  });
  var q = el("quitBtn"); if (q) q.onclick = toLobby;
  var bk = el("backBtn"); if (bk) bk.onclick = toLobby;
  var rm = el("rematchBtn"); if (rm) rm.onclick = rematch;
}

// ===================== khởi động =====================
render();