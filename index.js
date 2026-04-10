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
   MONGO CONNECT
======================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("Mongo error:", err));

/* =======================
   MODELS
======================= */
const userSchema = new mongoose.Schema({
  phone: String,
  transactionId: String,
  cartela: Array,
  status: { type: String, default: "pending" },
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

/* =======================
   TELEGRAM BOT
======================= */
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

/* =======================
   ADMIN APPROVAL BUTTONS
======================= */
async function sendApproval(user) {
  bot.sendMessage(
    process.env.ADMIN_CHAT_ID,
    `🎯 New User\nPhone: ${user.phone}\nTX: ${user.transactionId}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve_${user._id}` },
            { text: "❌ Reject", callback_data: `reject_${user._id}` }
          ]
        ]
      }
    }
  );
}

bot.on("callback_query", async (query) => {
  const data = query.data;

  if (data.startsWith("approve_")) {
    const id = data.split("_")[1];

    const user = await User.findById(id);

    user.status = "approved";
    user.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await user.save();

    bot.sendMessage(query.message.chat.id, "✅ Approved");
  }

  if (data.startsWith("reject_")) {
    const id = data.split("_")[1];

    await User.findByIdAndUpdate(id, { status: "rejected" });

    bot.sendMessage(query.message.chat.id, "❌ Rejected");
  }
});

/* =======================
   UNIQUE CARTELA GENERATOR
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
   PAY / REGISTER USER
======================= */
app.post("/pay", async (req, res) => {
  const { phone, transactionId } = req.body;

  const exists = await User.findOne({ transactionId });
  if (exists) return res.json({ ok: false });

  const user = await User.create({
    phone,
    transactionId,
    cartela: generateCartela(),
    status: "pending"
  });

  sendApproval(user);

  res.json({ ok: true, msg: "Sent to admin bot" });
});

/* =======================
   ADMIN LIST
======================= */
app.get("/admin/list", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

/* =======================
   ANALYTICS DASHBOARD API
======================= */
app.get("/admin/stats", async (req, res) => {
  const total = await User.countDocuments();
  const approved = await User.countDocuments({ status: "approved" });
  const pending = await User.countDocuments({ status: "pending" });
  const rejected = await User.countDocuments({ status: "rejected" });

  res.json({ total, approved, pending, rejected });
});

/* =======================
   WINNER SYSTEM
======================= */
let numbers = [];
let interval;

function checkWinner() {
  // simple demo winner logic
  const users = User.find({ status: "approved" });
  return users;
}

app.post("/winner", async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId);

  if (!user) return res.json({ ok: false });

  user.status = "winner";
  await user.save();

  io.emit("winner", userId);

  res.json({ ok: true });
});

/* =======================
   SOCKET BINGO GAME
======================= */
io.on("connection", (socket) => {

  socket.on("start", () => {

    numbers = [];
    io.emit("start");

    if (interval) clearInterval(interval);

    interval = setInterval(() => {

      const num = Math.floor(Math.random() * 75) + 1;
      numbers.push(num);

      io.emit("number", num);

      if (numbers.length >= 75) {
        clearInterval(interval);
      }

    }, 4000);

  });

});

/* =======================
   SERVER
======================= */
server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 Bingo PRO V5 Running");
});