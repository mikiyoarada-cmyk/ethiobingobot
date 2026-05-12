require("dotenv").config();

const express = require("express");
const http = require("http");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");
const game = require("./game");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ✅ FIX: POLLING MODE (IMPORTANT) */
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const TELEBIRR_NUMBER = "0904489434";

/* ================= GAME INIT ================= */
game.init(server);

/* ================= START ================= */
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
`🎯 BINGO GAME READY

Click below to open game`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 PLAY", url: "https://ethiobingo-1j5k.onrender.com/game.html" }]
      ]
    }
  });
});

/* ================= CARD REQUEST ================= */
bot.onText(/\/card/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "🎫 Your card is loading... open game page");
});

/* ================= TXID ================= */
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  bot.sendMessage(chatId, "📩 TXID received, waiting admin approval...");
});

/* ================= SERVER ================= */
app.get("/", (req, res) => {
  res.send("Bingo Running");
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});