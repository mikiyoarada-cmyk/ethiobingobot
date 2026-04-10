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
const URL = process.env.RENDER_EXTERNAL_URL;

// ===== DB =====
mongoose.connect(MONGO)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ===== TELEGRAM (WEBHOOK ONLY) =====
const bot = new TelegramBot(BOT_TOKEN);

bot.setWebHook(`${URL}/bot${BOT_TOKEN}`);

app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ===== MODELS =====
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  txId: String,
  approved: Boolean,
  expireAt: Date
}));

// ===== TELEGRAM COMMANDS =====
bot.onText(/\/approve (.+)/, async (msg, match) => {
  const userId = match[1];

  const expire = new Date();
  expire.setDate(expire.getDate() + 30);

  await User.findByIdAndUpdate(userId, {
    approved: true,
    expireAt: expire
  });

  bot.sendMessage(msg.chat.id, "✅ Approved 30 days");
});

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

  socket.emit('state', { called });

  socket.on('start', () => {

    if (running) return;

    running = true;
    called = [];

    io.emit('start');

    if (interval) clearInterval(interval);

    interval = setInterval(() => {

      let num;

      do {
        num = Math.floor(Math.random() * 75) + 1;
      } while (called.includes(num));

      called.push(num);

      console.log("CALL:", num);

      io.emit('number', num);

      if (called.length >= 75) {
        clearInterval(interval);
        running = false;
      }

    }, 4000); // safe timing

  });

});

// ===== PAYMENT =====
app.post('/pay', async (req, res) => {
  const { userId, txId } = req.body;

  await User.findByIdAndUpdate(userId, { txId });

  bot.sendMessage(ADMIN_CHAT_ID,
    `💰 Payment\nUser: ${userId}\nTX: ${txId}\n\n/approve ${userId}\n/reject ${userId}`
  );

  res.json({ msg: "Sent for approval" });
});

// ===== ROOT =====
app.get('/', (req, res) => {
  res.send("✅ Server running");
});

// ===== SERVER =====
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Running on " + PORT));