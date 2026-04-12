require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ================= DATABASE ================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* ================= BOT ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN);

/* WEBHOOK */
app.post("/bot", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= SAFETY ================= */
process.on("unhandledRejection", (e) => {
  console.log("ERROR:", e.message);
});

/* ================= USER MODEL ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone: { type: String, unique: true },
  status: { type: String, default: "pending" },
  balance: { type: Number, default: 0 },
  cartela: Array
}));

/* ================= ADMIN ================= */
app.get("/admin/list", async (req, res) => {
  res.json(await User.find());
});

/* ================= PAYMENT ================= */
app.post("/pay", async (req, res) => {
  const { phone, txid } = req.body;

  await User.findOneAndUpdate(
    { phone },
    { txid, status: "pending" },
    { upsert: true }
  );

  bot.sendMessage(process.env.ADMIN_ID,
`💰 PAYMENT REQUEST
Phone: ${phone}
TXID: ${txid}`,
{
  reply_markup: {
    inline_keyboard: [[
      { text: "Approve", callback_data: `approve:${phone}` },
      { text: "Reject", callback_data: `reject:${phone}` }
    ]]
  }
});

  res.json({ ok: true });
});

/* ================= CALLBACK FIX ================= */
bot.on("callback_query", async (q) => {
  try {
    const [action, phone] = (q.data || "").split(":");

    await bot.answerCallbackQuery(q.id).catch(() => {});

    if (action === "approve") {
      await User.findOneAndUpdate(
        { phone },
        { status: "approved", balance: 100 }
      );
    }

    if (action === "reject") {
      await User.findOneAndUpdate(
        { phone },
        { status: "rejected" }
      );
    }

  } catch (err) {
    console.log("callback safe error");
  }
});

/* ================= GAME SYSTEM ================= */
let players = [];
let playerCards = {};
let called = [];

/* ================= CARTELA ================= */
function unique(min, max) {
  const set = new Set();
  while (set.size < 5) {
    set.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return [...set];
}

function generateCard() {
  const B = unique(1, 15);
  const I = unique(16, 30);
  const N = unique(31, 45);
  const G = unique(46, 60);
  const O = unique(61, 75);

  return [
    [B[0], I[0], N[0], G[0], O[0]],
    [B[1], I[1], N[1], G[1], O[1]],
    [B[2], I[2], "FREE", G[2], O[2]],
    [B[3], I[3], N[3], G[3], O[3]],
    [B[4], I[4], N[4], G[4], O[4]],
  ];
}

/* ================= WIN CHECK ================= */
function isWinner(card, called) {
  const hit = (n) => n === "FREE" || called.includes(n);

  for (let r = 0; r < 5; r++) {
    if (card[r].every(hit)) return true;
  }

  for (let c = 0; c < 5; c++) {
    if ([0,1,2,3,4].every(r => hit(card[r][c]))) return true;
  }

  return card.flat().every(hit);
}

/* ================= JOIN ================= */
app.post("/join", async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });

  if (!user || user.status !== "approved") {
    return res.json({ ok: false, msg: "Not approved" });
  }

  if (user.balance < 10) {
    return res.json({ ok: false, msg: "Insufficient balance" });
  }

  if (!playerCards[phone]) {
    playerCards[phone] = generateCard();
  }

  user.balance -= 10;
  user.cartela = playerCards[phone];
  await user.save();

  if (!players.includes(phone)) players.push(phone);

  io.emit("players", players);

  res.json({ ok: true, cartela: user.cartela, balance: user.balance });
});

/* ================= GAME LOOP ================= */
function startGame() {
  called = [];
  io.emit("start");

  const interval = setInterval(async () => {

    let num;
    do {
      num = Math.floor(Math.random() * 75) + 1;
    } while (called.includes(num));

    called.push(num);

    io.emit("number", num);
    io.emit("called", called);

    for (let phone of players) {
      const user = await User.findOne({ phone });
      if (!user || !user.cartela) continue;

      if (isWinner(user.cartela, called)) {

        clearInterval(interval);

        const total = players.length * 10;
        const winner = Math.floor(total * 0.8);
        const admin = Math.floor(total * 0.2);

        await User.findOneAndUpdate(
          { phone },
          { $inc: { balance: winner } }
        );

        io.emit("winner", { phone, winner, admin });

        io.emit("message", "🎉 GOOD BINGO!");

        setTimeout(() => {
          startGame();
        }, 5000);

        return;
      }
    }

  }, 3000);
}

/* ================= COUNTDOWN ================= */
function countdown() {
  let t = 30;

  io.emit("countdown", t);

  const timer = setInterval(() => {
    t--;
    io.emit("countdown", t);

    if (t <= 0) {
      clearInterval(timer);
      startGame();
    }
  }, 1000);
}

io.on("connection", (socket) => {
  socket.on("start", countdown);
});

/* ================= SERVER ================= */
server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 FULL BINGO PRO SYSTEM RUNNING");
});