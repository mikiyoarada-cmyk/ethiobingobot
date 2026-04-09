require('dotenv').config();

const http = require('http');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const path = require('path');

// ================= ENV =================
const token = process.env.BOT_TOKEN;
const mongoURI = process.env.MONGODB_URI;
const PORT = process.env.PORT;

// Debug logs
console.log("BOT_TOKEN exists:", !!token);
console.log("MONGODB_URI exists:", !!mongoURI);
console.log("PORT:", PORT);

// Validate env
if (!token || !mongoURI) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

// ================= MONGODB =================
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ================= HTTP SERVER (CRITICAL FOR RENDER) =================
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running 🚀');
});

// IMPORTANT: bind to 0.0.0.0
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ================= TELEGRAM BOT =================
const bot = new TelegramBot(token, { polling: true });

console.log("🤖 Bot is running...");

// ================= GAME =================
let gameStarted = false;
let numbers = [];
let interval = null;

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

// START GAME
bot.onText(/\/startgame/, (msg) => {
  const chatId = msg.chat.id;

  if (gameStarted) {
    return bot.sendMessage(chatId, "ጨዋታው ጀምሯል ❗");
  }

  gameStarted = true;
  numbers = shuffle(Array.from({ length: 75 }, (_, i) => i + 1));

  bot.sendMessage(chatId, "🎮 Game Started!");

  interval = setInterval(() => {
    if (!gameStarted) return;

    if (numbers.length === 0) {
      bot.sendMessage(chatId, "All numbers called!");
      clearInterval(interval);
      return;
    }

    const number = numbers.pop();

    bot.sendMessage(chatId, `🎱 Number: ${number}`);

    const voicePath = path.join(__dirname, 'public', 'voices', `${number}.mp3`);

    bot.sendAudio(chatId, voicePath).catch(() => {});

  }, 3000);
});

// END GAME
bot.onText(/\/endgame/, (msg) => {
  const chatId = msg.chat.id;

  if (!gameStarted) {
    return bot.sendMessage(chatId, "No active game.");
  }

  gameStarted = false;

  if (interval) {
    clearInterval(interval);
    interval = null;
  }

  bot.sendMessage(chatId, "🏁 Good Bingo 🎉 Game Ended!");
});

// MENU
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "🎉 Bingo Bot Menu\n\n/startgame - Start Game\n/endgame - Stop Game"
  );
});