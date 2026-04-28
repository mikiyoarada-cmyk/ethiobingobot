require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

/* ================= CONFIG ================= */
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const TELEBIRR_NUMBER = "0904489434";

/* ================= BOT (WEBHOOK MODE) ================= */
const bot = new TelegramBot(BOT_TOKEN);

/* ================= USERS DB ================= */
let users = {};

/* ================= START ================= */
bot.onText(/\/start/, (msg) => {

  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
`🎯 BINGO GAME

Press PLAY to start`,
{
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 PLAY", callback_data: "play" }]
      ]
    }
  });
});

/* ================= CALLBACK ================= */
bot.on("callback_query", (query) => {

  const chatId = query.message?.chat?.id;
  if (!chatId) return;

  if (query.data === "play") {

    users[chatId] = users[chatId] || {
      paid: false,
      approved: false,
      txid: null
    };

    bot.sendMessage(chatId,
`💰 PAYMENT REQUIRED

Send TeleBirr payment:
${TELEBIRR_NUMBER}

Then send TXID here`);
  }
});

/* ================= MESSAGE ================= */
bot.on("message", (msg) => {

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  users[chatId] = users[chatId] || {
    paid: false,
    approved: false
  };

  users[chatId].txid = text;
  users[chatId].paid = true;

  bot.sendMessage(chatId, "📩 TXID RECEIVED. WAIT APPROVAL");

  if (ADMIN_ID) {
    bot.sendMessage(ADMIN_ID,
`💰 NEW PAYMENT

USER: ${chatId}
TXID: ${text}
PAYMENT: ${TELEBIRR_NUMBER}`,
{
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ APPROVE", callback_data: "approve_" + chatId },
            { text: "❌ REJECT", callback_data: "reject_" + chatId }
          ]
        ]
      }
    });
  }
});

/* ================= ADMIN ACTIONS ================= */
bot.on("callback_query", (query) => {

  const data = query.data;
  const chatId = query.message?.chat?.id;

  if (!data || !chatId) return;

  if (data.startsWith("approve_")) {

    const userId = Number(data.split("_")[1]);

    if (users[userId]) {
      users[userId].approved = true;

      bot.sendMessage(userId, "✅ PAYMENT APPROVED. YOU CAN PLAY NOW");

      if (ADMIN_ID) {
        bot.sendMessage(ADMIN_ID, "APPROVED: " + userId);
      }
    }
  }

  if (data.startsWith("reject_")) {

    const userId = Number(data.split("_")[1]);

    if (users[userId]) {
      users[userId].approved = false;

      bot.sendMessage(userId, "❌ PAYMENT REJECTED");

      if (ADMIN_ID) {
        bot.sendMessage(ADMIN_ID, "REJECTED: " + userId);
      }
    }
  }
});

/* ================= WEBHOOK ================= */
app.post("/bot", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🤖 BOT RUNNING ON PORT", PORT);
});