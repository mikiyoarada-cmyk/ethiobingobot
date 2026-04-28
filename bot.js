require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_ID = Number(process.env.ADMIN_ID); // IMPORTANT FIX
const TELEBIRR_NUMBER = "0904489434";

/* ================= USERS ================= */
let users = {};

/* ================= START ================= */
bot.onText(/\/start/, (msg) => {

  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
`🎯 BINGO GAME

Click PLAY to start`,
{
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 PLAY", callback_data: "play" }]
      ]
    }
  });
});

/* ================= BUTTONS ================= */
bot.on("callback_query", (query) => {

  const chatId = query.message?.chat?.id;
  if (!chatId) return;

  const data = query.data;

  /* PLAY */
  if (data === "play") {

    users[chatId] = users[chatId] || {
      paid: false,
      approved: false,
      txid: null
    };

    bot.sendMessage(chatId,
`💰 PAYMENT REQUIRED

Send to TeleBirr:
📱 ${TELEBIRR_NUMBER}

Then send TXID here`);
  }

  /* APPROVE */
  if (data.startsWith("approve_")) {

    const userId = Number(data.split("_")[1]);

    if (users[userId]) {
      users[userId].approved = true;
      users[userId].paid = true;

      bot.sendMessage(userId, "✅ PAYMENT APPROVED. YOU CAN PLAY NOW");

      if (ADMIN_ID) {
        bot.sendMessage(ADMIN_ID, "APPROVED USER: " + userId);
      }
    }
  }

  /* REJECT */
  if (data.startsWith("reject_")) {

    const userId = Number(data.split("_")[1]);

    if (users[userId]) {
      users[userId].approved = false;
      users[userId].paid = false;

      bot.sendMessage(userId, "❌ PAYMENT REJECTED");

      if (ADMIN_ID) {
        bot.sendMessage(ADMIN_ID, "REJECTED USER: " + userId);
      }
    }
  }
});

/* ================= TXID ================= */
bot.on("message", (msg) => {

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  users[chatId] = users[chatId] || {
    paid: false,
    approved: false,
    txid: null
  };

  users[chatId].txid = text;
  users[chatId].paid = true;

  bot.sendMessage(chatId, "📩 TXID RECEIVED. WAIT FOR APPROVAL");

  if (ADMIN_ID) {
    bot.sendMessage(ADMIN_ID,
`💰 PAYMENT REQUEST

USER: ${chatId}
TXID: ${text}
PAY: ${TELEBIRR_NUMBER}`,
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

/* ================= EXPORT ================= */
function isApproved(userId) {
  return users[userId]?.approved === true;
}

module.exports = { bot, isApproved };