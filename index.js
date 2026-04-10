const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== ENV =====
const MONGO = process.env.MONGO_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// ===== DB =====
mongoose.connect(MONGO)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ===== MODELS =====
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  txId: String,
  approved: Boolean,
  expireAt: Date
}));

// ===== TELEGRAM BOT =====
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// APPROVE USER (30 DAYS)
bot.onText(/\/approve (.+)/, async (msg, match) => {
  const userId = match[1];

  const expire = new Date();
  expire.setDate(expire.getDate() + 30);

  await User.findByIdAndUpdate(userId, {
    approved: true,
    expireAt: expire
  });

  bot.sendMessage(msg.chat.id, "✅ Approved for 30 days");
});

// REJECT USER
bot.onText(/\/reject (.+)/, async (msg, match) => {
  const userId = match[1];
  await User.findByIdAndDelete(userId);
  bot.sendMessage(msg.chat.id, "❌ Rejected");
});

// ===== GAME STATE =====
let called = [];
let running = false;
let interval = null;

// ===== SOCKET =====
io.on('connection', (socket) => {

  console.log("User connected");

  // send current state
  socket.emit('state', { called });

  // START GAME
  socket.on('start', () => {

    if (running) return;

    console.log("GAME STARTED");

    running = true;
    called = [];

    io.emit('start');

    // CLEAR OLD INTERVAL
    if (interval) clearInterval(interval);

    interval = setInterval(() => {

      if (!running) return;

      let num;

      // generate unique number
      do {
        num = Math.floor(Math.random() * 75) + 1;
      } while (called.includes(num));

      called.push(num);

      console.log("CALL:", num);

      // send to all players
      io.emit('number', num);

      // stop when all numbers called
      if (called.length >= 75) {
        clearInterval(interval);
        running = false;
        console.log("GAME ENDED");
      }

    }, 8000); // IMPORTANT: slower timing (sync with frontend)

  });

});

// ===== JOIN =====
app.post('/join', async (req, res) => {
  const user = await User.create({
    name: req.body.name,
    approved: false
  });

  res.json(user);
});

// ===== PAYMENT =====
app.post('/pay', async (req, res) => {
  const { userId, txId } = req.body;

  await User.findByIdAndUpdate(userId, { txId });

  // send to telegram admin
  bot.sendMessage(ADMIN_CHAT_ID,
    `💰 Payment Request\nUser: ${userId}\nTX: ${txId}\n\n/approve ${userId}\n/reject ${userId}`
  );

  res.json({ msg: "Sent for approval" });
});

// ===== ROOT =====
app.get('/', (req, res) => {
  res.send("✅ Bingo server running");
});

// ===== SERVER =====
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Running on " + PORT));