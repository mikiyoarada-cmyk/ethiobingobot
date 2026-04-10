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
   ENV CHECK
======================= */
console.log("Server starting...");

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
  transactionId: String,
  status: { type: String, default: "pending" },
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

/* =======================
   SIMPLE ADMIN LOGIN
======================= */
app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }

  res.json({ ok: false });
});

/* =======================
   PAYMENT REQUEST (TELEBIRR)
======================= */
app.post("/pay", async (req, res) => {
  const { phone, transactionId } = req.body;

  const exists = await User.findOne({ transactionId });
  if (exists) return res.json({ ok: false, msg: "Already used" });

  await User.create({
    phone,
    transactionId,
    status: "pending"
  });

  res.json({
    ok: true,
    telebirr: process.env.TELEBIRR_NUMBER,
    msg: "Send payment to this number and wait approval"
  });
});

/* =======================
   ADMIN LIST
======================= */
app.get("/admin/list", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

/* =======================
   APPROVE / REJECT
======================= */
app.post("/admin/approve/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, {
    status: "approved",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  res.json({ ok: true });
});

app.post("/admin/reject/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, {
    status: "rejected"
  });

  res.json({ ok: true });
});

/* =======================
   CHECK ACCESS
======================= */
app.post("/check", async (req, res) => {
  const user = await User.findOne({ phone: req.body.phone });

  if (!user) return res.json({ ok: false });
  if (user.status !== "approved") return res.json({ ok: false });
  if (new Date() > user.expiresAt) return res.json({ ok: false });

  res.json({ ok: true });
});

/* =======================
   TELEGRAM BOT (ADMIN CONTROL)
======================= */
const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/users/, async (msg) => {
  const users = await User.find().limit(10);

  let text = "🎯 Pending Users:\n\n";
  users.forEach(u => {
    text += `${u.phone} | ${u.status}\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

/* =======================
   BINGO GAME
======================= */
let interval;
let numbers = [];

io.on("connection", (socket) => {

  socket.on("start", () => {

    numbers = [];
    io.emit("start");

    if (interval) clearInterval(interval);

    interval = setInterval(() => {

      const num = Math.floor(Math.random() * 75) + 1;

      numbers.push(num);
      io.emit("number", num);

      if (numbers.length >= 75) clearInterval(interval);

    }, 4000);

  });

});

/* =======================
   SERVER
======================= */
server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 Server running");
});