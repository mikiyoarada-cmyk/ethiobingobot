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

/* ✅ POLLING FIX */
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_ID = Number(process.env.ADMIN_ID);

/* ================= GAME ================= */
game.init(server);

/* ================= START ================= */
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  auth.users[chatId] = { approved: false };

  bot.sendMessage(chatId,
`🎯 BINGO GAME

Send TXID to join`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 OPEN GAME", url: "https://ethiobingo-1j5k.onrender.com/game.html" }]
      ]
    }
  });
});

/* ================= TXID ================= */
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  auth.users[chatId] = { txid: text, approved: false };

  if (ADMIN_ID) {
    bot.sendMessage(
      ADMIN_ID,
      `💰 PAYMENT REQUEST

USER: ${chatId}
TXID: ${text}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ APPROVE", callback_data: "approve_" + chatId },
              { text: "❌ REJECT", callback_data: "reject_" + chatId }
            ]
          ]
        }
      }
    );
  }

  bot.sendMessage(chatId, "📩 Sent to admin for approval.");
});

/* ================= ADMIN ACTIONS ================= */
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;

  if (query.data.startsWith("approve_")) {
    const userId = query.data.split("_")[1];

    auth.users[userId].approved = true;

    bot.sendMessage(userId,
`✅ APPROVED

Now open game and choose your card`);

    bot.sendMessage(chatId, "Approved ✔");
  }

  if (query.data.startsWith("reject_")) {
    const userId = query.data.split("_")[1];

    auth.users[userId].approved = false;

    bot.sendMessage(userId, "❌ REJECTED");
    bot.sendMessage(chatId, "Rejected ❌");
  }
});

/* ================= SERVER ================= */
server.listen(process.env.PORT || 3000, () => {
  console.log("Bingo running");
});