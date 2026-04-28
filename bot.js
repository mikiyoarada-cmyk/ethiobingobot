require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);

const TELEBIRR_NUMBER = "0904489434";

/* ================= BOT ================= */
const bot = new TelegramBot(BOT_TOKEN);

/* ================= USERS ================= */
let users = {};

/* ================= START ================= */
bot.onText(/\/start/, (msg) => {

  bot.sendMessage(msg.chat.id,
`🎯 BINGO GAME

Click PLAY to continue`,
{
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 PLAY", callback_data: "play" }]
      ]
    }
  });
});

/* ================= PLAY ================= */
bot.on("callback_query", (q) => {

  const chatId = q.message?.chat?.id;
  if (!chatId) return;

  if (q.data === "play") {

    users[chatId] = { paid:false, approved:false };

    bot.sendMessage(chatId,
`💰 PAY TO PLAY

Send to TeleBirr:
${TELEBIRR_NUMBER}

Then send TXID`);
  }
});

/* ================= TXID ================= */
bot.on("message", (msg) => {

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  users[chatId] = users[chatId] || {};
  users[chatId].txid = text;

  bot.sendMessage(chatId, "📩 TXID RECEIVED");

  if (ADMIN_ID) {
    bot.sendMessage(ADMIN_ID,
`💰 NEW PAYMENT

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
    });
  }
});

/* ================= ADMIN ================= */
bot.on("callback_query", (q) => {

  const data = q.data;

  if (data.startsWith("approve_")) {

    const id = Number(data.split("_")[1]);
    users[id].approved = true;

    bot.sendMessage(id, "✅ APPROVED");
  }

  if (data.startsWith("reject_")) {

    const id = Number(data.split("_")[1]);
    users[id].approved = false;

    bot.sendMessage(id, "❌ REJECTED");
  }
});

/* ================= WEBHOOK ROUTE (FIX) ================= */
/* THIS IS THE MOST IMPORTANT PART */
app.post("/webhook", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("BOT RUNNING ON PORT", PORT);
});