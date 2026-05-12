require("dotenv").config();

const express = require("express");
const http = require("http");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");

const game = require("./game");
const auth = require("./auth");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const bot = new TelegramBot(process.env.BOT_TOKEN);

const ADMIN_ID = Number(process.env.ADMIN_ID);
const TELEBIRR_NUMBER = "0904489434";

/* ================= START GAME ENGINE ================= */
game.init(server);

/* ================= TELEGRAM ================= */
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "🎯 Bingo Game Ready", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 PLAY", url: "https://ethiobingo-1j5k.onrender.com/game.html" }]
      ]
    }
  });
});

/* ================= TXID ================= */
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  if (!auth.users) auth.users = {};

  auth.users[chatId] = { txid: text, approved: false };

  await bot.sendMessage(chatId, "📩 TXID received, waiting approval.");

  if (ADMIN_ID) {
    bot.sendMessage(
      ADMIN_ID,
      `💰 PAYMENT

USER: ${chatId}
TXID: ${text}`
    );
  }
});

/* ================= SERVER ================= */
app.get("/", (req, res) => {
  res.send("Bingo Server Running");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on", PORT);
});