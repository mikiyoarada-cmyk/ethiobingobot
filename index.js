require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// ENV variables
const token = process.env.BOT_TOKEN;
const mongoURI = process.env.MONGODB_URI;

// Debug logs (important on Render)
console.log("BOT_TOKEN exists:", !!token);
console.log("MONGODB_URI exists:", !!mongoURI);

// Safety checks
if (!token) {
  console.error("❌ BOT_TOKEN is missing");
  process.exit(1);
}

if (!mongoURI) {
  console.error("❌ MONGODB_URI is missing");
  process.exit(1);
}

// MongoDB connection
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// Bot init
const bot = new TelegramBot(token, { polling: true });

console.log("🤖 Bot is running...");

// Game state
let gameStarted = false;
let numbers = [];

// Shuffle
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "🎉 Welcome to Bingo Bot!");
});

// Menu buttons
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "Start Game") {
    if (gameStarted) {
      return bot.sendMessage(chatId, "ጨዋታው ጀምሯል ❗");
    }

    gameStarted = true;
    numbers = shuffle(Array.from({ length: 75 }, (_, i) => i + 1));

    return bot.sendMessage(chatId, "🎮 Game Started!");
  }

  if (text === "End Game") {
    gameStarted = false;
    numbers = [];

    return bot.sendMessage(chatId, "🏁 Good Bingo 🎉");
  }

  if (text === "Call Number") {
    if (!gameStarted) {
      return bot.sendMessage(chatId, "Start the game first.");
    }

    if (numbers.length === 0) {
      return bot.sendMessage(chatId, "All numbers called!");
    }

    const number = numbers.pop();
    bot.sendMessage(chatId, `🎱 Number: ${number}`);
  }
});