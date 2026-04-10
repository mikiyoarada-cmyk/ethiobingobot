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

/* =======================
   MONGO
======================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* =======================
   MODELS
======================= */
const userSchema = new mongoose.Schema({
  phone: String,
  transactionId: String,
  cartela: Array,
  room: { type: String, default: "global" },
  status: { type: String, default: "pending" },
  isWinner: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

/* =======================
   TELEGRAM BOT ADMIN CONTROL
======================= */
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

/* ADMIN ID CHECK */
const ADMIN_ID = process.env.ADMIN_CHAT_ID;

/* PAYMENT REQUEST → TELEGRAM APPROVAL BUTTONS */
async function sendToAdmin(user) {
  bot.sendMessage(
    ADMIN_ID,
    `💰 New Payment\nPhone: ${user.phone}\nTX: ${user.transactionId}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `ap_${user._id}` },
            { text: "❌ Reject", callback_data: `re_${user._id}` }
          ]
        ]
      }
    }
  );
}

/* TELEGRAM CALLBACK */
bot.on("callback_query", async (q) => {

  const data = q.data;

  if (data.startsWith("ap_")) {
    const id = data.split("_")[1];

    const u = await User.findById(id);
    if (!u) return;

    u.status = "approved";
    await u.save();

    bot.sendMessage(q.message.chat.id, "✅ Approved");
  }

  if (data.startsWith("re_")) {
    const id = data.split("_")[1];

    await User.findByIdAndUpdate(id, { status: "rejected" });

    bot.sendMessage(q.message.chat.id, "❌ Rejected");
  }
});

/* =======================
   CARTELA GENERATOR
======================= */
function generateCartela() {
  let card = [];
  for (let i = 0; i < 5; i++) {
    let row = [];
    for (let j = 0; j < 5; j++) {
      row.push(Math.floor(Math.random() * 75) + 1);
    }
    card.push(row);
  }
  return card;
}

/* =======================
   PAY SYSTEM (MANUAL + TELEGRAM VERIFY)
======================= */
app.post("/pay", async (req, res) => {
  const { phone, transactionId, room } = req.body;

  const exists = await User.findOne({ transactionId });
  if (exists) return res.json({ ok: false });

  const user = await User.create({
    phone,
    transactionId,
    cartela: generateCartela(),
    room: room || "global"
  });

  sendToAdmin(user);

  res.json({ ok: true, msg: "Sent to Telegram admin" });
});

/* =======================
   DASHBOARD API
======================= */
app.get("/admin/stats", async (req, res) => {
  const total = await User.countDocuments();
  const approved = await User.countDocuments({ status: "approved" });
  const pending = await User.countDocuments({ status: "pending" });
  const winners = await User.countDocuments({ isWinner: true });

  res.json({ total, approved, pending, winners });
});

/* =======================
   USERS LIST
======================= */
app.get("/admin/list", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

/* =======================
   WINNER SYSTEM (AUTO DETECTION HOOK)
======================= */
app.post("/winner", async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.json({ ok: false });

  user.isWinner = true;
  user.status = "winner";
  await user.save();

  io.emit("winner", userId);

  res.json({ ok: true });
});

/* =======================
   SOCKET MULTIPLAYER ROOMS
======================= */
let rooms = {};
let interval;

io.on("connection", (socket) => {

  socket.on("joinRoom", (room) => {
    socket.join(room);
  });

  /* START GAME PER ROOM */
  socket.on("startGame", (room = "global") => {

    let numbers = [];
    io.to(room).emit("start");

    if (interval) clearInterval(interval);

    interval = setInterval(() => {

      const num = Math.floor(Math.random() * 75) + 1;
      numbers.push(num);

      io.to(room).emit("number", num);

      if (numbers.length >= 75) {
        clearInterval(interval);
      }

    }, 4000);

  });

});

/* =======================
   ADMIN PAGE ROUTE FIX
======================= */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* =======================
   SERVER
======================= */
const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("🚀 Bingo PRO V6 Running");
});