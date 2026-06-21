/* Kéo · Búa · Bao — front-end (nói chuyện với server)
   Đăng nhập/BXH/Lịch sử qua API. Online (tìm trận, phòng, ván đấu) qua Socket.IO.
   Đấu với máy: chạy cục bộ, KHÔNG tính vào BXH (chỉ để luyện tập). */

// Giữ nguyên id nội bộ (vua/dan/nole) để KHÔNG phải sửa server. Chỉ đổi hiển thị sang kéo/búa/bao.
// Vòng khắc chế cũ: vua>dan, dan>nole, nole>vua  ==  Búa>Kéo, Kéo>Bao, Bao>Búa (đúng luật kéo búa bao).
var ROLES = [
  { id: "dan",  emoji: "✌️", vn: "Kéo", en: "Scissors" },
  { id: "vua",  emoji: "✊", vn: "Búa", en: "Rock" },
  { id: "nole", emoji: "✋", vn: "Bao", en: "Paper" }
];
var ROLE = {}; ROLES.forEach(function (r) { ROLE[r.id] = r; });
var BEATS = { vua: "dan", dan: "nole", nole: "vua" };
var WHY = {
  "vua>dan":  { vn: "Búa đập Kéo", en: "Rock smashes Scissors" },
  "dan>nole": { vn: "Kéo cắt Bao", en: "Scissors cut Paper" },
  "nole>vua": { vn: "Bao bọc Búa", en: "Paper covers Rock" }
};
function judge(a, b) { return a === b ? "draw" : (BEATS[a] === b ? "win" : "lose"); }

var T = {
  vn: {
    subtitle: "Kéo búa bao — đối kháng 1v1",
    loginTitle: "Đăng nhập", username: "Tên tài khoản", password: "Mật khẩu",
    enter: "Đăng nhập", newAcct: "Tài khoản chưa tồn tại sẽ được tạo tự động.",
    errFields: "Nhập tên tài khoản và mật khẩu.", errWrongPw: "Sai mật khẩu.", errServer: "Lỗi máy chủ, thử lại sau.",
    errCode: "Mã phòng chưa hợp lệ.", errRoom: "Không vào được phòng (sai mã hoặc chủ phòng đã thoát).",
    oppLeft: "Đối thủ đã rời trận.", forfeitWin: "Đối thủ rời trận — bạn được xử thắng.", netErr: "Mất kết nối máy chủ.",
    connecting: "Đang vào phòng…", creatingRoom: "Đang tạo phòng…",
    searching: "Đang tìm đối thủ…", cancelSearch: "Hủy tìm", fewPlayers: "Ít người đang online — có thể chờ lâu. Thử Đấu với máy nhé.",
    logout: "Đăng xuất",
    tabLobby: "Sảnh", tabRank: "Bảng xếp hạng", tabHist: "Lịch sử đấu",
    ranked: "Đấu xếp hạng", to3: "Chạm 3", to5: "Chạm 5", bo5: "Thắng 3/5 ván", bo9: "Thắng 5/9 ván",
    pickHint: "Chọn hình thức đấu", findMatch: "Tìm trận ngẫu nhiên", vsBot: "Đấu với máy (luyện tập)", createRoom: "Tạo phòng",
    codePh: "Nhập mã phòng", joinBtn: "Vào phòng", back: "Quay lại",
    you: "Bạn", opp: "Đối thủ", cpu: "Máy", roomCode: "Mã phòng",
    waiting: "Đang chờ đối thủ vào phòng…", pickYours: "Chọn quân của bạn", waitMove: "Chờ đối thủ ra quân…",
    round: "Ván", maxR: "tối đa", firstTo: "Thắng trước",
    wonR: "Thắng ván!", lostR: "Thua ván!", drawR: "Hòa — ra cùng quân",
    youWin: "🏆 Bạn chiến thắng!", youLose: "💀 Bạn thua cuộc", score: "Tỉ số",
    again: "Chơi lại", toLobby: "Về sảnh", quit: "Thoát trận",
    wantsRematch: "muốn chơi lại", accept: "Chấp nhận", decline: "Từ chối", waitingRematch: "Đang chờ đối thủ đồng ý…", oppDeclined: "Đối thủ từ chối chơi lại.",
    lbRank: "Hạng", lbPlayer: "Người chơi", lbWin: "Thắng", lbLose: "Thua",
    lbEmpty: "Chưa có ai trên bảng xếp hạng.", lbNote: "Chỉ trận online được tính; đấu với máy không tính.", meTag: "(bạn)",
    histEmpty: "Chưa có trận online nào.", histWin: "Thắng", histLose: "Thua", vs: "gặp"
  },
  en: {
    subtitle: "Rock paper scissors — 1v1",
    loginTitle: "Log in", username: "Username", password: "Password",
    enter: "Log in", newAcct: "A new account is created automatically.",
    errFields: "Enter a username and password.", errWrongPw: "Wrong password.", errServer: "Server error, try again.",
    errCode: "Invalid room code.", errRoom: "Could not join the room (wrong code or host left).",
    oppLeft: "Opponent left the match.", forfeitWin: "Opponent left — you win by forfeit.", netErr: "Lost connection to server.",
    connecting: "Joining room…", creatingRoom: "Creating room…",
    searching: "Finding an opponent…", cancelSearch: "Cancel", fewPlayers: "Few players online — this may take a while. Try the bot.",
    logout: "Log out",
    tabLobby: "Lobby", tabRank: "Leaderboard", tabHist: "Match history",
    ranked: "Ranked", to3: "First to 3", to5: "First to 5", bo5: "Win 3 of 5", bo9: "Win 5 of 9",
    pickHint: "Pick how to play", findMatch: "Find random match", vsBot: "vs Computer (practice)", createRoom: "Create room",
    codePh: "Enter room code", joinBtn: "Join", back: "Back",
    you: "You", opp: "Opponent", cpu: "Computer", roomCode: "Room code",
    waiting: "Waiting for an opponent…", pickYours: "Pick your piece", waitMove: "Waiting for opponent's move…",
    round: "Round", maxR: "max", firstTo: "First to",
    wonR: "Round won!", lostR: "Round lost!", drawR: "Draw — same piece",
    youWin: "🏆 You win!", youLose: "💀 You lose", score: "Score",
    again: "Play again", toLobby: "Back to lobby", quit: "Quit match",
    wantsRematch: "wants a rematch", accept: "Accept", decline: "Decline", waitingRematch: "Waiting for opponent to accept…", oppDeclined: "Opponent declined the rematch.",
    lbRank: "Rank", lbPlayer: "Player", lbWin: "Wins", lbLose: "Losses",
    lbEmpty: "No one on the leaderboard yet.", lbNote: "Only online matches count; practice vs computer does not.", meTag: "(you)",
    histEmpty: "No online matches yet.", histWin: "Won", histLose: "Lost", vs: "vs"
  }
};

// ===================== trạng thái =====================
var state = {
  lang: null, screen: "login", user: null, token: null,
  tab: "lobby", lobbyTarget: null,
  mode: null, role: "host", code: "", target: 3, matchId: null,
  round: 1, scores: { me: 0, opp: 0 }, myMove: null, oppMove: null, oppName: "",
  phase: "idle", lastWin: false, forfeit: false, oppGone: false,
  rematchWaiting: false, rematchOffer: false, rematchFromName: "", rematchNote: "", netMsg: "",
  lbRows: null, histRows: null, _hint: null
};
var socket = null;
function tr() { return T[state.lang || "vn"]; }
function rname(id) { return ROLE[id][state.lang || "vn"]; }

// ===================== tiện ích =====================
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function el(id) { return document.getElementById(id); }

function api(path, opts) {
  opts = opts || {};
  var headers = {};
  if (opts.body) headers["Content-Type"] = "application/json";
  if (opts.auth && state.token) headers["Authorization"] = "Bearer " + state.token;
  return fetch(path, {
    method: opts.method || "GET", headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(function (r) {
    return r.json().catch(function () { return null; }).then(function (j) {
      if (!r.ok) { var e = new Error("http"); e.status = r.status; e.body = j; throw e; }
      return j;
    });
  });
}

// ===================== auth =====================
function doLogin() {
  var name = (el("loginName").value || "").trim();
  var pw = el("loginPw").value || "";
  var errEl = el("loginErr");
  if (!name || !pw) { errEl.textContent = tr().errFields; return; }
  errEl.textContent = "…";
  api("/api/login", { method: "POST", body: { username: name, password: pw } })
    .then(function (d) {
      state.token = d.token; state.user = d.name;
      try { localStorage.setItem("vdn_token", d.token); localStorage.setItem("vdn_name", d.name); } catch (e) {}
      connectSocket();
      state.screen = "lobby"; state.tab = "lobby"; state.lobbyTarget = null; render();
    })
    .catch(function (err) {
      var code = err && err.body && err.body.error;
      errEl.textContent = code === "wrongpw" ? tr().errWrongPw : (code === "fields" ? tr().errFields : tr().errServer);
    });
}
function logout() {
  try { localStorage.removeItem("vdn_token"); localStorage.removeItem("vdn_name"); } catch (e) {}
  if (socket) { try { socket.disconnect(); } catch (e) {} socket = null; }
  state.token = null; state.user = null; state.screen = "login"; render();
}

// ===================== socket =====================
function connectSocket() {
  if (socket || typeof io === "undefined") return;
  socket = io({ auth: { token: state.token } });
  socket.on("connect_error", function (err) {
    if (err && err.message === "auth") { logout(); }
    else if (state.screen === "game" && (state.phase === "matchmaking" || state.phase === "waiting")) {
      state.netMsg = tr().netErr; state.phase = "left"; render();
    }
  });
  socket.on("disconnect", function () {
    if (state.screen === "game" && state.mode === "online" && state.phase !== "gameover" && state.phase !== "left") {
      state.netMsg = tr().netErr; state.phase = "left"; render();
    }
  });
  socket.on("searching", function () { /* đang chờ, UI đã hiện */ });
  socket.on("roomCreated", function (d) { state.code = d.code; if (state.phase === "waiting") render(); });
  socket.on("joinError", function () { state.netMsg = tr().errRoom; state.phase = "left"; render(); });
  socket.on("matched", function (d) { onMatched(d); });
  socket.on("reveal", function (d) { onReveal(d); });
  socket.on("rematchStart", function () { onRematchStart(); });
  socket.on("oppLeft", function () {
    if (state.phase === "left") return;
    if (state.phase === "gameover" || state.phase === "reveal") {
      state.rematchOffer = false; state.rematchWaiting = false;
      state.oppGone = true; state.rematchNote = tr().oppLeft;
      if (state.phase === "gameover") render();
      return;
    }
    state.netMsg = tr().oppLeft; state.phase = "left"; render();
  });
  socket.on("rematchOffer", function (d) {
    if (state.phase !== "gameover") return;
    state.rematchOffer = true; state.rematchWaiting = false;
    state.rematchFromName = (d && d.name) || tr().opp; render();
  });
  socket.on("rematchDeclined", function () {
    state.rematchWaiting = false; state.rematchNote = tr().oppDeclined; render();
  });
  socket.on("forfeit", function (d) {
    state.scores = (d && d.scores) || { me: state.target, opp: 0 };
    state.myMove = null; state.oppMove = null;
    state.lastWin = true; state.forfeit = true; state.phase = "gameover"; render();
  });
}
function ensureIo() {
  if (typeof io === "undefined" || !socket) { state.netMsg = tr().netErr; state.phase = "left"; state.screen = "game"; render(); return false; }
  return true;
}

// ===================== dữ liệu BXH / lịch sử =====================
function loadLeaderboard() {
  state.lbRows = null;
  api("/api/leaderboard").then(function (rows) {
    state.lbRows = rows || [];
    if (state.screen === "lobby" && state.tab === "rank") render();
  }).catch(function () { state.lbRows = []; if (state.screen === "lobby" && state.tab === "rank") render(); });
}
function loadHistory() {
  state.histRows = null;
  api("/api/history", { auth: true }).then(function (rows) {
    state.histRows = rows || [];
    if (state.screen === "lobby" && state.tab === "hist") render();
  }).catch(function (err) {
    if (err && err.status === 401) { logout(); return; }
    state.histRows = []; if (state.screen === "lobby" && state.tab === "hist") render();
  });
}

// ===================== bắt đầu trận =====================
function freshScores() {
  state.round = 1; state.scores = { me: 0, opp: 0 }; state.myMove = null; state.oppMove = null;
  state.forfeit = false; state.oppGone = false;
  state.rematchWaiting = false; state.rematchOffer = false; state.rematchFromName = ""; state.rematchNote = "";
}
function startBot(target) {
  state.mode = "bot"; state.role = "host"; state.target = target; state.oppName = tr().cpu;
  freshScores(); state.phase = "choosing"; state.code = ""; state.screen = "game"; render();
}
function findMatch(target) {
  if (!ensureIo()) return;
  state.mode = "online"; state.target = target; state.oppName = ""; state.code = "";
  freshScores(); state.phase = "matchmaking"; state.screen = "game"; render();
  socket.emit("find", { target: target }); startHint();
}
function createRoom(target) {
  if (!ensureIo()) return;
  state.mode = "online"; state.role = "host"; state.target = target; state.oppName = ""; state.code = "";
  freshScores(); state.phase = "waiting"; state.screen = "game"; render();
  socket.emit("createRoom", { target: target });
}
function joinRoomGo(rawCode) {
  var code = (rawCode || "").trim().toUpperCase();
  if (code.length < 3) return tr().errCode;
  if (!ensureIo()) return null;
  state.mode = "online"; state.role = "guest"; state.target = state.lobbyTarget || 3; state.oppName = ""; state.code = code;
  freshScores(); state.phase = "waiting"; state.screen = "game"; render();
  socket.emit("joinRoom", { code: code });
  return null;
}
function cancelSearch() {
  stopHint(); if (socket) socket.emit("cancelFind");
  state.screen = "lobby"; state.mode = null; state.phase = "idle"; render();
}
function startHint() { stopHint(); state._hint = setTimeout(function () { var h = el("mmHint"); if (h) h.textContent = tr().fewPlayers; }, 12000); }
function stopHint() { if (state._hint) { clearTimeout(state._hint); state._hint = null; } }

// ===================== diễn biến ván =====================
function onMatched(d) {
  stopHint();
  state.mode = "online"; state.matchId = d.matchId; state.target = d.target;
  state.role = d.role; state.oppName = d.opponent || tr().opp; state.code = "";
  freshScores(); state.phase = "choosing"; state.screen = "game"; render();
}
function onPick(id) {
  if (state.phase !== "choosing" || state.myMove) return;
  state.myMove = id; render();
  if (state.mode === "bot") {
    var bot = ROLES[Math.floor(Math.random() * 3)].id;
    setTimeout(function () { revealLocal(id, bot); }, 850);
  } else if (socket) {
    socket.emit("move", { move: id });
  }
}
function revealLocal(mine, theirs) { // chỉ dùng cho đấu với máy
  state.oppMove = theirs;
  var res = judge(mine, theirs);
  if (res === "win") state.scores.me++; else if (res === "lose") state.scores.opp++;
  var over = state.scores.me >= state.target || state.scores.opp >= state.target;
  state.phase = "reveal"; render();
  setTimeout(function () {
    if (over) { state.lastWin = state.scores.me >= state.target; state.phase = "gameover"; }
    else { state.round++; state.myMove = null; state.oppMove = null; state.phase = "choosing"; }
    render();
  }, over ? 1600 : 1900);
}
function onReveal(d) { // online — server là trọng tài
  state.myMove = d.mine; state.oppMove = d.theirs;
  state.scores = d.scores || { me: 0, opp: 0 }; state.lastWin = !!d.youWin;
  state.phase = "reveal"; render();
  setTimeout(function () {
    if (d.over) { state.phase = "gameover"; }
    else { state.round++; state.myMove = null; state.oppMove = null; state.phase = "choosing"; }
    render();
  }, d.over ? 1600 : 1900);
}
function onRematchStart() {
  freshScores(); state.phase = "choosing"; render();
}
function rematch() {
  if (state.mode === "bot") { freshScores(); state.phase = "choosing"; render(); return; }
  if (socket) { state.rematchWaiting = true; state.rematchNote = ""; socket.emit("rematchRequest"); render(); }
}
function acceptRematch() { if (socket) socket.emit("rematchAccept"); state.rematchOffer = false; render(); }
function declineRematch() { if (socket) socket.emit("rematchDecline"); state.rematchOffer = false; render(); }
function toLobby() {
  stopHint();
  if (state.mode === "online" && socket) { try { socket.emit("leaveMatch"); } catch (e) {} }
  state.screen = "lobby"; state.mode = null; state.phase = "idle";
  state.code = ""; state.netMsg = ""; state.lobbyTarget = null; render();
}

// ===================== views =====================
function viewLang() {
  return '' +
    '<div class="head"><div class="crowns">✌️ ✊ ✋</div><h1>Kéo · Búa · Bao</h1></div>' +
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
    '<div class="topbar"><button class="mini" id="langToggle">🌐 ' + (state.lang === "vn" ? "VN" : "EN") + '</button>' + right + '</div>' +
    '<div class="head"><div class="crowns">✌️ ✊ ✋</div><h1>Kéo · Búa · Bao</h1><p class="sub">' + tr().subtitle + '</p></div>' +
    content +
    '<div class="foot">✊ ' + rname("vua") + ' &gt; ✌️ ' + rname("dan") + ' &gt; ✋ ' + rname("nole") + ' &gt; ✊ ' + rname("vua") + '</div>';
}
function viewLogin() {
  return '<div class="panel"><h2 class="title">' + tr().loginTitle + '</h2><div class="stack">' +
    '<input id="loginName" class="field" maxlength="16" placeholder="' + tr().username + '" autocomplete="username" />' +
    '<input id="loginPw" class="field" type="password" maxlength="64" placeholder="' + tr().password + '" autocomplete="current-password" />' +
    '<div class="err" id="loginErr"></div>' +
    '<button class="btn" id="loginBtn">' + tr().enter + '</button>' +
    '<p class="hint">' + tr().newAcct + '</p>' +
  '</div></div>';
}
function viewLobby() {
  var tabs = [["lobby", tr().tabLobby], ["rank", tr().tabRank], ["hist", tr().tabHist]];
  var tabsHtml = tabs.map(function (t) {
    return '<button class="tab' + (state.tab === t[0] ? " active" : "") + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
  }).join("");
  var body = state.tab === "lobby" ? viewLobbyHome() : state.tab === "rank" ? viewLeaderboard() : viewHistory();
  return '<div class="tabs">' + tabsHtml + '</div>' + body;
}
function viewLobbyHome() {
  if (!state.lobbyTarget) {
    return '<div class="panel"><p style="color:var(--muted);font-size:15px;margin:0 0 12px">' + tr().ranked + '</p><div class="stack">' +
      modeCard("⚔️", tr().ranked + " · " + tr().to3, 3) +
      modeCard("🏰", tr().ranked + " · " + tr().to5, 5) +
    '</div></div>';
  }
  var label = state.lobbyTarget === 3 ? tr().to3 : tr().to5;
  return '<div class="panel">' +
    '<div class="rowtop"><h2 class="title" style="margin:0">' + tr().ranked + ' · ' + label + '</h2>' +
      '<button class="link" id="lobbyBack">← ' + tr().back + '</button></div>' +
    '<p style="color:var(--muted);font-size:15px;margin:0 0 12px">' + tr().pickHint + '</p>' +
    '<div class="stack">' +
      '<button class="btn" id="findBtn">🎲 ' + tr().findMatch + '</button>' +
      '<button class="btn ghost" id="botBtn">🤖 ' + tr().vsBot + '</button>' +
      '<button class="btn ghost" id="createBtn">🛡️ ' + tr().createRoom + '</button>' +
      '<div><input id="codeInput" class="field code-input" maxlength="4" placeholder="' + tr().codePh + '" />' +
        '<div class="err" id="joinErr"></div>' +
        '<button class="btn ghost" id="joinBtn" style="margin-top:8px">🔑 ' + tr().joinBtn + '</button></div>' +
    '</div></div>';
}
function modeCard(ico, title, target) {
  return '<button class="modecard" data-target="' + target + '"><span class="ico">' + ico + '</span>' +
    '<span><b>' + title + '</b></span></button>';
}
function viewLeaderboard() {
  if (state.lbRows === null) return '<div class="panel"><p class="empty">…</p></div>';
  var rows = state.lbRows;
  if (rows.length === 0) return '<div class="panel"><p class="empty">' + tr().lbEmpty + '</p><p class="hint" style="margin-top:10px">' + tr().lbNote + '</p></div>';
  var head = '<div class="lbhead"><span class="c-rank">' + tr().lbRank + '</span><span class="c-name">' + tr().lbPlayer +
    '</span><span class="c-w">' + tr().lbWin + '</span><span class="c-l">' + tr().lbLose + '</span></div>';
  var body = rows.map(function (r, i) {
    var me = state.user && r.name.toLowerCase() === state.user.toLowerCase();
    var medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
    return '<div class="lbrow' + (me ? " me" : "") + '"><span class="c-rank">' + medal + '</span>' +
      '<span class="c-name">' + esc(r.name) + (me ? ' <span style="color:var(--gold);font-size:13px">' + tr().meTag + '</span>' : '') + '</span>' +
      '<span class="c-w">' + r.wins + '</span><span class="c-l">' + r.losses + '</span></div>';
  }).join("");
  return '<div class="panel">' + head + body + '<p class="hint" style="margin-top:12px">' + tr().lbNote + '</p></div>';
}
function viewHistory() {
  if (state.histRows === null) return '<div class="panel"><p class="empty">…</p></div>';
  var items = state.histRows;
  if (items.length === 0) return '<div class="panel"><p class="empty">' + tr().histEmpty + '</p></div>';
  var locale = state.lang === "vn" ? "vi-VN" : "en-US";
  var rows = items.map(function (m) {
    var win = m.result === "win";
    var when = new Date(m.t).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    var tgt = m.target === 3 ? tr().to3 : tr().to5;
    return '<div class="histrow"><div class="histleft">' +
      '<span class="arrow ' + (win ? "win" : "lose") + '">' + (win ? "▲" : "▼") + '</span><div>' +
      '<div class="htop"><span class="tag' + (win ? "" : " lose") + '">' + (win ? tr().histWin : tr().histLose) + '</span> ' +
        '<span style="color:var(--muted)">' + tr().vs + ' ' + esc(m.vs) + '</span></div>' +
      '<div class="hbot">' + tgt + ' · ' + when + '</div></div></div>' +
      '<div class="hscore">' + m.me + '–' + m.opp + '</div></div>';
  }).join("");
  return '<div class="panel">' + rows + '</div>';
}
function viewGame() {
  if (state.phase === "matchmaking") {
    return '<div class="panel"><div class="center-msg">' +
      '<div class="big">🔎</div>' +
      '<div style="font-size:18px;font-weight:700;margin-bottom:6px">' + tr().searching + '</div>' +
      '<div style="color:var(--muted);margin-bottom:4px">' + (state.target === 3 ? tr().to3 : tr().to5) + '</div>' +
      '<div class="hint" id="mmHint"></div>' +
      '<button class="btn ghost" id="mmCancel" style="margin-top:18px">' + tr().cancelSearch + '</button>' +
    '</div></div>';
  }

  var oppLabel = state.mode === "bot" ? tr().cpu : (state.oppName || tr().opp);
  var showOpp = state.phase === "reveal" || state.phase === "gameover";
  var result = (showOpp && state.myMove && state.oppMove) ? judge(state.myMove, state.oppMove) : null;

  var head = '<div class="gamehead">' +
    '<div class="score me"><div class="lbl">' + tr().you + '</div><div class="val">' + state.scores.me + '</div></div>' +
    '<div class="roundinfo">' + tr().round + ' ' + state.round + '</div>' +
    '<div class="score opp"><div class="lbl">' + esc(oppLabel) + '</div><div class="val">' + state.scores.opp + '</div></div>' +
  '</div>';

  var codeLine = (state.mode === "online" && state.code)
    ? '<div class="codeline">' + tr().roomCode + ': <b>' + esc(state.code) + '</b></div>' : '';

  var arena = '<div class="arena">' +
    slot(tr().you, state.myMove, !!state.myMove, false, result === "win", result === "lose") +
    slot(oppLabel, state.oppMove, showOpp, (state.mode !== "bot" && state.phase === "choosing" && !!state.myMove), result === "lose", result === "win") +
  '</div>';

  var status = '<div class="status">' + statusText(result) + '</div>';

  var controls;
  if (state.phase === "gameover") {
    var won = state.mode === "online" ? state.lastWin : (state.scores.me >= state.target);
    var note = "";
    var buttons;
    if (state.rematchOffer) {
      note = '<div class="scoreline">' + esc(state.rematchFromName) + ' ' + tr().wantsRematch + '</div>';
      buttons = '<div class="stack"><button class="btn" id="acceptBtn">' + tr().accept + '</button>' +
        '<button class="btn ghost" id="declineBtn">' + tr().decline + '</button></div>';
    } else if (state.rematchWaiting) {
      note = '<div class="scoreline">' + tr().waitingRematch + '</div>';
      buttons = '<button class="btn ghost" id="backBtn">' + tr().toLobby + '</button>';
    } else {
      if (state.rematchNote) note = '<div class="scoreline">' + esc(state.rematchNote) + '</div>';
      else if (state.forfeit) note = '<div class="scoreline">' + tr().forfeitWin + '</div>';
      var showRematch = (state.mode === "bot") || (state.mode === "online" && !state.forfeit && !state.oppGone);
      buttons = showRematch
        ? '<div class="stack"><button class="btn" id="rematchBtn">' + tr().again + '</button>' +
          '<button class="btn ghost" id="backBtn">' + tr().toLobby + '</button></div>'
        : '<button class="btn" id="backBtn">' + tr().toLobby + '</button>';
    }
    controls = '<div class="center-msg"><div class="big">' + (won ? tr().youWin : tr().youLose) + '</div>' +
      note + '<div class="scoreline">' + tr().score + ' ' + state.scores.me + ' – ' + state.scores.opp + '</div>' +
      buttons + '</div>';
  } else if (state.phase === "left") {
    controls = '<div class="center-msg"><div class="big">⚠️</div>' +
      '<div class="scoreline">' + esc(state.netMsg) + '</div>' +
      '<button class="btn" id="backBtn">' + tr().toLobby + '</button></div>';
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
  return '<div class="' + cls + '"><div class="stitle">' + esc(title) + '</div><div class="emoji">' + face + '</div><div class="sname">' + name + '</div></div>';
}
function statusText(result) {
  if (state.phase === "waiting") {
    if (state.role === "guest") return '<span style="color:var(--muted)">' + tr().connecting + '</span>';
    return '<span style="color:var(--muted)">' + (state.code ? tr().waiting : tr().creatingRoom) + '</span>';
  }
  if (state.phase === "choosing" && !state.myMove) return '<span style="color:var(--gold-soft)">' + tr().pickYours + '</span>';
  if (state.phase === "choosing" && state.myMove && state.mode !== "bot") return '<span style="color:var(--muted)">' + tr().waitMove + '</span>';
  if (state.phase === "reveal" && result) {
    if (result === "draw") return '<span class="draw">' + tr().drawR + '</span>';
    var pair = result === "win" ? (state.myMove + ">" + state.oppMove) : (state.oppMove + ">" + state.myMove);
    var why = WHY[pair] ? WHY[pair][state.lang] : "";
    return '<span class="' + result + '">' + (result === "win" ? tr().wonR : tr().lostR) + ' <span class="why">(' + why + ')</span></span>';
  }
  return "";
}

// ===================== render + sự kiện =====================
function render() {
  var app = el("app");
  if (!state.lang) { app.innerHTML = viewLang(); bindLang(); return; }
  if (state.screen === "login") { app.innerHTML = shell(viewLogin()); bindShell(); bindLogin(); }
  else if (state.screen === "lobby") { app.innerHTML = shell(viewLobby()); bindShell(); bindLobby(); }
  else if (state.screen === "game") { app.innerHTML = shell(viewGame()); bindShell(); bindGame(); }
}
function bindLang() {
  document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.onclick = function () {
      state.lang = b.getAttribute("data-lang");
      try { localStorage.setItem("vdn_lang", state.lang); } catch (e) {}
      if (state.token) { connectSocket(); state.screen = "lobby"; state.tab = "lobby"; }
      else state.screen = "login";
      render();
    };
  });
}
function bindShell() {
  var lt = el("langToggle");
  if (lt) lt.onclick = function () {
    state.lang = state.lang === "vn" ? "en" : "vn";
    try { localStorage.setItem("vdn_lang", state.lang); } catch (e) {}
    render();
  };
  var lo = el("logoutBtn"); if (lo) lo.onclick = logout;
}
function bindLogin() {
  var btn = el("loginBtn"); if (btn) btn.onclick = doLogin;
  var pw = el("loginPw"); if (pw) pw.onkeydown = function (e) { if (e.key === "Enter") doLogin(); };
}
function bindLobby() {
  document.querySelectorAll("[data-tab]").forEach(function (b) {
    b.onclick = function () {
      state.tab = b.getAttribute("data-tab");
      if (state.tab === "rank") loadLeaderboard();
      else if (state.tab === "hist") loadHistory();
      render();
    };
  });
  if (state.tab !== "lobby") return;
  if (!state.lobbyTarget) {
    document.querySelectorAll("[data-target]").forEach(function (b) {
      b.onclick = function () { state.lobbyTarget = parseInt(b.getAttribute("data-target"), 10); render(); };
    });
  } else {
    var back = el("lobbyBack"); if (back) back.onclick = function () { state.lobbyTarget = null; render(); };
    var findB = el("findBtn"); if (findB) findB.onclick = function () { findMatch(state.lobbyTarget); };
    var botB = el("botBtn"); if (botB) botB.onclick = function () { startBot(state.lobbyTarget); };
    var crB = el("createBtn"); if (crB) crB.onclick = function () { createRoom(state.lobbyTarget); };
    var joinB = el("joinBtn");
    if (joinB) joinB.onclick = function () {
      var e = joinRoomGo(el("codeInput").value);
      if (e) el("joinErr").textContent = e;
    };
  }
}
function bindGame() {
  var cancel = el("mmCancel"); if (cancel) cancel.onclick = cancelSearch;
  document.querySelectorAll("[data-role]").forEach(function (b) {
    b.onclick = function () { onPick(b.getAttribute("data-role")); };
  });
  var q = el("quitBtn"); if (q) q.onclick = toLobby;
  var bk = el("backBtn"); if (bk) bk.onclick = toLobby;
  var rm = el("rematchBtn"); if (rm) rm.onclick = rematch;
  var ac = el("acceptBtn"); if (ac) ac.onclick = acceptRematch;
  var dc = el("declineBtn"); if (dc) dc.onclick = declineRematch;
}

// ===================== khởi động =====================
(function init() {
  try {
    state.lang = localStorage.getItem("vdn_lang") || null;
    var t = localStorage.getItem("vdn_token"), n = localStorage.getItem("vdn_name");
    if (t) { state.token = t; state.user = n || "?"; }
  } catch (e) {}
  if (state.lang) {
    if (state.token) { connectSocket(); state.screen = "lobby"; state.tab = "lobby"; }
    else state.screen = "login";
  }
  render();
})();