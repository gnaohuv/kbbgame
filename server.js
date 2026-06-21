/* Vua · Dân · Nô Lệ — server
   Express phục vụ game tĩnh + API đăng nhập/BXH/lịch sử (Postgres, bcrypt)
   + Socket.IO: ghép trận ngẫu nhiên, phòng theo mã, và làm trọng tài ván đấu (chống gian lận). */

const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const PORT = process.env.PORT || 3000;
const SECRET = process.env.TOKEN_SECRET || "vdn-dev-secret-doi-cai-nay-tren-railway";

// ---------- Postgres ----------
const CONN = process.env.DATABASE_URL || "";
// Railway: dùng biến DATABASE_URL trỏ tới service Postgres. URL nội bộ không cần SSL;
// URL public (proxy.rlwy.net) thì cần SSL.
const needSSL = /proxy\.rlwy\.net|sslmode=require/.test(CONN);
const pool = new Pool({
  connectionString: CONN,
  ssl: needSSL ? { rejectUnauthorized: false } : false
});

async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uname TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    pw_hash TEXT NOT NULL,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent TEXT NOT NULL,
    target INT NOT NULL,
    result TEXT NOT NULL,
    me_score INT NOT NULL,
    opp_score INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}

// ---------- token (HMAC, không cần lưu trạng thái, sống qua redeploy) ----------
function signToken(user) {
  const body = Buffer.from(JSON.stringify({ id: user.id, n: user.name })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return body + "." + sig;
}
function verifyToken(token) {
  if (!token || typeof token !== "string" || token.indexOf(".") < 0) return null;
  const parts = token.split(".");
  const body = parts[0], sig = parts[1];
  const expect = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig !== expect) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()); } catch (e) { return null; }
}

// ---------- HTTP ----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/login", async (req, res) => {
  try {
    let { username, password } = req.body || {};
    username = (username || "").trim();
    if (!username || !password) return res.status(400).json({ error: "fields" });
    if (username.length > 16 || password.length > 64) return res.status(400).json({ error: "fields" });
    const uname = username.toLowerCase();
    const r = await pool.query("SELECT * FROM users WHERE uname=$1", [uname]);
    if (r.rows.length === 0) {
      const hash = await bcrypt.hash(password, 10);
      const ins = await pool.query(
        "INSERT INTO users(uname,name,pw_hash) VALUES($1,$2,$3) RETURNING *",
        [uname, username, hash]
      );
      const u = ins.rows[0];
      return res.json({ token: signToken(u), name: u.name, wins: u.wins, losses: u.losses });
    }
    const u = r.rows[0];
    const ok = await bcrypt.compare(password, u.pw_hash);
    if (!ok) return res.status(401).json({ error: "wrongpw" });
    return res.json({ token: signToken(u), name: u.name, wins: u.wins, losses: u.losses });
  } catch (e) {
    console.error("login error", e);
    return res.status(500).json({ error: "server" });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT name, wins, losses FROM users ORDER BY wins DESC, losses ASC, name ASC LIMIT 100"
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json([]); }
});

function authOf(req) {
  const h = req.headers["authorization"] || "";
  const token = h.indexOf("Bearer ") === 0 ? h.slice(7) : (req.query.token || "");
  return verifyToken(token);
}
app.get("/api/history", async (req, res) => {
  const u = authOf(req);
  if (!u) return res.status(401).json([]);
  try {
    const r = await pool.query(
      `SELECT opponent, target, result, me_score, opp_score,
              (EXTRACT(EPOCH FROM created_at)*1000)::bigint AS t
       FROM matches WHERE user_id=$1 ORDER BY id DESC LIMIT 30`,
      [u.id]
    );
    res.json(r.rows.map(x => ({
      vs: x.opponent, target: x.target, result: x.result,
      me: x.me_score, opp: x.opp_score, t: Number(x.t)
    })));
  } catch (e) { res.status(500).json([]); }
});

const server = http.createServer(app);
const io = new Server(server);

// xác thực socket bằng token
io.use((socket, next) => {
  const u = verifyToken(socket.handshake.auth && socket.handshake.auth.token);
  if (!u) return next(new Error("auth"));
  socket.data.user = u; // { id, n }
  next();
});

// ---------- ghép trận / phòng / trận đấu ----------
const queues = { 3: [], 5: [] };  // hàng chờ tìm trận ngẫu nhiên theo chế độ
const rooms = {};                 // code -> { host, target }
const games = {};                 // matchId -> state

const BEATS = { vua: "dan", dan: "nole", nole: "vua" };
function judge(a, b) { return a === b ? "draw" : (BEATS[a] === b ? "win" : "lose"); }
function makeCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = "";
  for (let i = 0; i < 4; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}
function leaveQueues(socket) {
  [3, 5].forEach(t => { const q = queues[t]; const i = q.indexOf(socket); if (i >= 0) q.splice(i, 1); });
}

function startMatch(sA, sB, target) {
  const id = "m" + crypto.randomBytes(5).toString("hex");
  const st = {
    id, target, round: 1, recorded: false,
    a: { socket: sA, score: 0, move: null, uid: sA.data.user.id, name: sA.data.user.n },
    b: { socket: sB, score: 0, move: null, uid: sB.data.user.id, name: sB.data.user.n }
  };
  games[id] = st;
  sA.data.matchId = id; sB.data.matchId = id;
  sA.emit("matched", { matchId: id, target, opponent: st.b.name, role: "host" });
  sB.emit("matched", { matchId: id, target, opponent: st.a.name, role: "guest" });
}

function startRematch(st) {
  st.round = 1; st.recorded = false;
  st.a.score = 0; st.b.score = 0; st.a.move = null; st.b.move = null;
  st.a.want = false; st.b.want = false;
  st.a.socket.emit("rematchStart", {});
  st.b.socket.emit("rematchStart", {});
}

io.on("connection", (socket) => {
  socket.on("find", (d) => {
    if (socket.data.matchId) return;
    const target = (d && d.target === 5) ? 5 : 3;
    leaveQueues(socket);
    const q = queues[target];
    let other = null;
    while (q.length) { const c = q.shift(); if (c && c.connected && c.id !== socket.id && !c.data.matchId) { other = c; break; } }
    if (other) startMatch(other, socket, target);
    else { q.push(socket); socket.emit("searching"); }
  });
  socket.on("cancelFind", () => leaveQueues(socket));

  socket.on("createRoom", (d) => {
    if (socket.data.matchId) return;
    const target = (d && d.target === 5) ? 5 : 3;
    if (socket.data.roomCode) delete rooms[socket.data.roomCode];
    let code; do { code = makeCode(); } while (rooms[code]);
    rooms[code] = { host: socket, target };
    socket.data.roomCode = code;
    socket.emit("roomCreated", { code, target });
  });
  socket.on("joinRoom", (d) => {
    if (socket.data.matchId) return;
    const code = ((d && d.code) || "").trim().toUpperCase();
    const room = rooms[code];
    if (!room || !room.host.connected || room.host.id === socket.id) { socket.emit("joinError"); return; }
    delete rooms[code];
    room.host.data.roomCode = null;
    startMatch(room.host, socket, room.target);
  });

  socket.on("move", (d) => {
    const st = games[socket.data.matchId]; if (!st) return;
    const move = d && d.move;
    if (["vua", "dan", "nole"].indexOf(move) < 0) return;
    const me = (st.a.socket.id === socket.id) ? st.a : (st.b.socket.id === socket.id ? st.b : null);
    if (!me || me.move) return;
    me.move = move;
    const A = st.a, B = st.b;
    if (A.move && B.move) {
      const rA = judge(A.move, B.move), rB = judge(B.move, A.move);
      if (rA === "win") A.score++; else if (rB === "win") B.score++;
      const over = A.score >= st.target || B.score >= st.target;
      A.socket.emit("reveal", { mine: A.move, theirs: B.move, result: rA, scores: { me: A.score, opp: B.score }, over: over, youWin: over ? (A.score >= st.target) : false });
      B.socket.emit("reveal", { mine: B.move, theirs: A.move, result: rB, scores: { me: B.score, opp: A.score }, over: over, youWin: over ? (B.score >= st.target) : false });
      A.move = null; B.move = null;
      if (over) { if (!st.recorded) { st.recorded = true; recordMatch(st); } }
      else { st.round++; }
    }
  });

  socket.on("rematchRequest", () => {
    const st = games[socket.data.matchId]; if (!st) return;
    const me = (st.a.socket.id === socket.id) ? st.a : (st.b.socket.id === socket.id ? st.b : null);
    if (!me) return;
    const other = (me === st.a) ? st.b : st.a;
    if (other.want) { startRematch(st); return; }   // cả hai cùng muốn -> vào luôn
    me.want = true;
    if (other.socket && other.socket.connected) other.socket.emit("rematchOffer", { name: me.name });
  });
  socket.on("rematchAccept", () => {
    const st = games[socket.data.matchId]; if (!st) return;
    startRematch(st);
  });
  socket.on("rematchDecline", () => {
    const st = games[socket.data.matchId]; if (!st) return;
    st.a.want = false; st.b.want = false;
    const me = (st.a.socket.id === socket.id) ? st.a : st.b;
    const other = (me === st.a) ? st.b : st.a;
    if (other.socket && other.socket.connected) other.socket.emit("rematchDeclined", {});
  });

  socket.on("leaveMatch", () => endGame(socket));

  socket.on("disconnect", () => {
    leaveQueues(socket);
    if (socket.data.roomCode) { delete rooms[socket.data.roomCode]; socket.data.roomCode = null; }
    endGame(socket);
  });
});

function endGame(socket) {
  const id = socket.data.matchId;
  if (!id) return;
  const st = games[id];
  socket.data.matchId = null;
  if (!st) return;
  const leaver = (st.a.socket.id === socket.id) ? st.a : st.b;
  const other = (st.a.socket.id === socket.id) ? st.b : st.a;
  if (other && other.socket && other.socket.connected) {
    if (!st.recorded) {
      // Trận đang diễn ra: người ở lại được xử thắng target-0, người rời chịu thua.
      st.recorded = true;
      other.score = st.target; leaver.score = 0;
      recordForfeit(st, other, leaver);
      other.socket.emit("forfeit", { scores: { me: st.target, opp: 0 } });
    } else {
      other.socket.emit("oppLeft");
    }
    other.socket.data.matchId = null;
  }
  delete games[id];
}

async function recordForfeit(st, winner, loser) {
  try {
    await pool.query("UPDATE users SET wins=wins+1 WHERE id=$1", [winner.uid]);
    await pool.query("UPDATE users SET losses=losses+1 WHERE id=$1", [loser.uid]);
    await pool.query(
      "INSERT INTO matches(user_id,opponent,target,result,me_score,opp_score) VALUES($1,$2,$3,$4,$5,$6)",
      [winner.uid, loser.name, st.target, "win", st.target, 0]
    );
    await pool.query(
      "INSERT INTO matches(user_id,opponent,target,result,me_score,opp_score) VALUES($1,$2,$3,$4,$5,$6)",
      [loser.uid, winner.name, st.target, "lose", 0, st.target]
    );
  } catch (e) { console.error("forfeit record error", e); }
}

async function recordMatch(st) {
  const A = st.a, B = st.b;
  const aWin = A.score >= st.target;
  try {
    await pool.query("UPDATE users SET wins=wins+1 WHERE id=$1", [aWin ? A.uid : B.uid]);
    await pool.query("UPDATE users SET losses=losses+1 WHERE id=$1", [aWin ? B.uid : A.uid]);
    await pool.query(
      "INSERT INTO matches(user_id,opponent,target,result,me_score,opp_score) VALUES($1,$2,$3,$4,$5,$6)",
      [A.uid, B.name, st.target, aWin ? "win" : "lose", A.score, B.score]
    );
    await pool.query(
      "INSERT INTO matches(user_id,opponent,target,result,me_score,opp_score) VALUES($1,$2,$3,$4,$5,$6)",
      [B.uid, A.name, st.target, aWin ? "lose" : "win", B.score, A.score]
    );
  } catch (e) { console.error("record error", e); }
}

// ---------- start ----------
initDb()
  .then(() => server.listen(PORT, () => console.log("VDN server listening on " + PORT)))
  .catch((e) => {
    console.error("DB init failed — kiểm tra DATABASE_URL:", e.message);
    server.listen(PORT, () => console.log("VDN server on " + PORT + " (DB chưa sẵn sàng)"));
  });
