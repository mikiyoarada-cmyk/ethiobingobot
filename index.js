require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* =======================
   MONGO
======================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* =======================
   USER MODEL
======================= */
const userSchema = new mongoose.Schema({
  phone: String,
  cartela: Array,
  status: { type: String, default: "pending" },
  balance: { type: Number, default: 0 }
});

const User = mongoose.model("User", userSchema);

/* =======================
   TELEGRAM WEBHOOK
======================= */
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  console.log("Telegram:", req.body);
  res.json({ ok: true });
});

/* =======================
   REGISTER
======================= */
app.post("/register", async (req, res) => {
  const { phone } = req.body;

  let user = await User.findOne({ phone });

  if (!user) {
    user = await User.create({ phone });
  }

  res.json({ ok: true });
});

/* =======================
   SEND TXID
======================= */
app.post("/pay", async (req, res) => {
  const { phone } = req.body;

  await User.findOneAndUpdate(
    { phone },
    { status: "pending" },
    { upsert: true }
  );

  res.json({ ok: true });
});

/* =======================
   ADMIN APPROVE
======================= */
app.post("/admin/approve/:phone", async (req, res) => {
  await User.findOneAndUpdate(
    { phone: req.params.phone },
    { status: "approved" }
  );

  res.json({ ok: true });
});

/* =======================
   CHECK ACCESS
======================= */
app.get("/check/:phone", async (req, res) => {
  const user = await User.findOne({ phone });

  if (!user || user.status !== "approved") {
    return res.json({ ok: false });
  }

  res.json({ ok: true });
});

/* =======================
   CARTELA (REAL BINGO)
======================= */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function unique(min, max) {
  let arr = [];
  while (arr.length < 5) {
    let n = rand(min, max);
    if (!arr.includes(n)) arr.push(n);
  }
  return arr;
}

function generateCard() {
  const B = unique(1,15);
  const I = unique(16,30);
  const N = unique(31,45);
  const G = unique(46,60);
  const O = unique(61,75);

  let card = [];

  for (let i = 0; i < 5; i++) {
    card.push([B[i], I[i], N[i], G[i], O[i]]);
  }

  card[2][2] = "FREE";

  return card;
}

/* =======================
   JOIN GAME
======================= */
let players = [];

app.post("/join", async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });

  if (!user || user.status !== "approved") {
    return res.json({ ok: false, msg: "Not approved" });
  }

  user.cartela = generateCard();
  await user.save();

  if (!players.includes(phone)) {
    players.push(phone);
  }

  io.emit("players", players);

  res.json({ ok: true, cartela: user.cartela });
});

/* =======================
   GAME ENGINE
======================= */
let called = [];
let interval;

/* WIN CHECK */
function checkWin(card) {
  const marks = card.map(row =>
    row.map(n => n === "FREE" || called.includes(n))
  );

  // rows
  for (let r of marks) {
    if (r.every(v => v)) return true;
  }

  // cols
  for (let c = 0; c < 5; c++) {
    if (marks.every(r => r[c])) return true;
  }

  // diagonals
  if (marks.every((r,i)=>r[i])) return true;
  if (marks.every((r,i)=>r[4-i])) return true;

  return false;
}

/* DETECT WINNER */
async function detectWinner() {
  const users = await User.find({ status: "approved" });

  for (let u of users) {
    if (u.cartela && checkWin(u.cartela)) {
      return u.phone;
    }
  }

  return null;
}

/* COUNTDOWN */
function startCountdown() {
  let t = 40;
  io.emit("countdown", t);

  let cd = setInterval(() => {
    t--;
    io.emit("countdown", t);

    if (t <= 0) {
      clearInterval(cd);
      startGame();
    }
  }, 1000);
}

/* START GAME */
function startGame() {
  called = [];
  io.emit("start");

  interval = setInterval(async () => {

    let num;
    do {
      num = rand(1,75);
    } while (called.includes(num));

    called.push(num);

    io.emit("number", num);
    io.emit("calledList", called);

    const winner = await detectWinner();

    if (winner) {
      io.emit("winner", winner);
      io.emit("gameEnd", "🎉 GOOD BINGO");

      clearInterval(interval);

      setTimeout(() => {
        startCountdown();
      }, 40000);
    }

  }, 4000);
}

/* =======================
   SOCKET
======================= */
io.on("connection", (socket) => {

  socket.on("start", () => {
    startCountdown();
  });

});

/* =======================
   ADMIN PAGE
======================= */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* =======================
   SERVER
======================= */
server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 FINAL BINGO SYSTEM RUNNING");
});