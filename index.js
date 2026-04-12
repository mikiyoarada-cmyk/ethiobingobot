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

/* ================= DB ================= */
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

/* ================= USER MODEL ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone: String,
  status: { type: String, default: "pending" },
  balance: { type: Number, default: 0 },
  cartela: Array
}));

/* ================= ADMIN ================= */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

app.get("/admin/list", async (req, res) => {
  res.json(await User.find());
});

/* ================= PAY REQUEST ================= */
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

/* ================= FIXED CALLBACK (MAIN FIX) ================= */
bot.on("callback_query", async (q) => {
  try {
    const data = q.data || "";
    const [action, phone] = data.split(":");

    // IMPORTANT: ALWAYS ANSWER CALLBACK IMMEDIATELY
    await bot.answerCallbackQuery(q.id).catch(() => {});

    if (!action || !phone) return;

    if (action === "approve") {
      await User.findOneAndUpdate(
        { phone },
        { status: "approved", balance: 100 }
      );

      await bot.sendMessage(process.env.ADMIN_ID,
        `✅ APPROVED: ${phone}`
      );
    }

    if (action === "reject") {
      await User.findOneAndUpdate(
        { phone },
        { status: "rejected" }
      );

      await bot.sendMessage(process.env.ADMIN_ID,
        `❌ REJECTED: ${phone}`
      );
    }

  } catch (err) {
    console.log("Callback error:", err.message);
  }
});

/* ================= JOIN GAME ================= */
let players = [];

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
  await user.save();

  if (!players.includes(phone)) players.push(phone);

  io.emit("players", players);

  res.json({ ok: true, balance: user.balance });
});

/* ================= GAME ================= */
let called = [];

/* SIMPLE GAME LOOP */
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
  console.log("🚀 FIXED BUTTON SYSTEM RUNNING");
});