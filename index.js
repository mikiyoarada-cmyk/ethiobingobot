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

/* WEBHOOK ENDPOINT (MUST MATCH SETWEBHOOK /bot) */
app.post("/bot", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= SAFE ERROR HANDLER ================= */
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED ERROR:", err.message);
});

/* ================= USER MODEL ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone: String,
  status: { type: String, default: "pending" },
  balance: { type: Number, default: 0 },
  cartela: Array,
  txid: String
}));

/* ================= ADMIN ================= */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

app.get("/admin/list", async (req, res) => {
  res.json(await User.find());
});

app.post("/admin/approve/:phone", async (req, res) => {
  await User.findOneAndUpdate(
    { phone: req.params.phone },
    { status: "approved", balance: 100 }
  );
  res.json({ ok: true });
});

app.post("/admin/reject/:phone", async (req, res) => {
  await User.findOneAndUpdate(
    { phone: req.params.phone },
    { status: "rejected" }
  );
  res.json({ ok: true });
});

/* ================= REGISTER ================= */
app.post("/register", async (req, res) => {
  const { phone } = req.body;
  await User.findOneAndUpdate({ phone }, {}, { upsert: true });
  res.json({ ok: true });
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
      { text: "✅ Approve", callback_data: `approve:${phone}` },
      { text: "❌ Reject", callback_data: `reject:${phone}` }
    ]]
  }
});

  res.json({ ok: true });
});

/* ================= SAFE CALLBACK HANDLER (FIX CRASH) ================= */
bot.on("callback_query", async (q) => {
  try {
    if (!q.data) {
      return bot.answerCallbackQuery(q.id, { text: "Invalid button ❌" });
    }

    const parts = q.data.split(":");
    const action = parts[0];
    const phone = parts[1];

    if (!action || !phone) {
      return bot.answerCallbackQuery(q.id, { text: "Expired button ❌" });
    }

    if (action === "approve") {
      await User.findOneAndUpdate(
        { phone },
        { status: "approved", balance: 100 }
      );

      await bot.answerCallbackQuery(q.id, { text: "Approved ✅" });
      await bot.sendMessage(q.message.chat.id, `✅ Approved ${phone}`);
    }

    if (action === "reject") {
      await User.findOneAndUpdate(
        { phone },
        { status: "rejected" }
      );

      await bot.answerCallbackQuery(q.id, { text: "Rejected ❌" });
      await bot.sendMessage(q.message.chat.id, `❌ Rejected ${phone}`);
    }

  } catch (err) {
    console.log("Callback safe error:", err.message);

    try {
      await bot.answerCallbackQuery(q.id, {
        text: "Button expired ⚠️"
      });
    } catch (e) {}
  }
});

/* ================= BALANCE ================= */
app.get("/balance/:phone", async (req, res) => {
  const user = await User.findOne({ phone: req.params.phone });
  res.json({ balance: user ? user.balance : 0 });
});

/* ================= FIXED UNIQUE CARTELA ================= */
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

/* ================= GAME ================= */
let players = [];
let called = [];

/* JOIN GAME (10 ETB) */
app.post("/join", async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });

  if (!user || user.status !== "approved") {
    return res.json({ ok: false, msg: "Not approved" });
  }

  if (user.balance < 10) {
    return res.json({ ok: false, msg: "No balance" });
  }

  user.balance -= 10;
  user.cartela = generateCard();
  await user.save();

  if (!players.includes(phone)) players.push(phone);

  io.emit("players", players);

  res.json({ ok: true, cartela: user.cartela, balance: user.balance });
});

/* ================= GAME LOOP ================= */
function startGame() {
  called = [];
  io.emit("start");

  const interval = setInterval(() => {
    let num;

    do {
      num = Math.floor(Math.random() * 75) + 1;
    } while (called.includes(num));

    called.push(num);

    io.emit("number", num);
    io.emit("called", called);

    // SIMPLE WIN CHECK PLACEHOLDER (upgrade later)
    if (players.length > 0 && called.length > 10) {
      const winner = players[0];

      clearInterval(interval);

      User.findOneAndUpdate(
        { phone: winner },
        { $inc: { balance: 80 } }
      ).then(() => {
        io.emit("winner", winner);
        console.log("WINNER:", winner);

        setTimeout(startGame, 5000);
      });
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
  console.log("🚀 BINGO SYSTEM FULLY STABLE RUNNING");
});