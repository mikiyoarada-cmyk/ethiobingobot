require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");
const auth = require("./auth");

const app = express();
app.use(express.json());

/* ================= STATIC FILES FIX ================= */
// IMPORTANT: this makes game.html accessible
app.use(express.static(path.join(__dirname, "public")));

const bot = new TelegramBot(process.env.BOT_TOKEN);

const ADMIN_ID = Number(process.env.ADMIN_ID);
const TELEBIRR_NUMBER = "0904489434";

/* ================= GAME LINK ================= */
// now this works because Express serves /public
const GAME_URL = "https://ethiobingo-1j5k.onrender.com/game.html";
// OR better (recommended):
// const GAME_URL = "https://ethiobingo-1j5k.onrender.com/game.html";

/* ================= START ================= */
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `🎯 BINGO GAME

Click PLAY to continue`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎮 PLAY", callback_data: "play" }]
        ]
      }
    }
  );
});

/* ================= CALLBACK ================= */
bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat?.id;
  if (!chatId) return;

  /* ===== PLAY ===== */
  if (query.data === "play") {
    auth.users[chatId] = auth.users[chatId] || { approved: false };

    if (auth.users[chatId].approved) {
      await bot.sendMessage(
        chatId,
        `✅ PAYMENT APPROVED

Click below to play.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎯 PLAY BINGO", url: GAME_URL }]
            ]
          }
        }
      );

      return bot.answerCallbackQuery(query.id);
    }

    await bot.sendMessage(
      chatId,
      `💰 PAY TO PLAY

Send at least 10 ETB to TeleBirr:
📱 ${TELEBIRR_NUMBER}

Then send TXID here.`
    );

    return bot.answerCallbackQuery(query.id);
  }

  /* ===== APPROVE ===== */
  if (query.data.startsWith("approve_")) {
    const userId = query.data.replace("approve_", "");

    auth.users[userId] = auth.users[userId] || {};
    auth.users[userId].approved = true;

    await bot.sendMessage(
      userId,
      `✅ PAYMENT APPROVED

You can now play Bingo.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎯 PLAY BINGO", url: GAME_URL }]
          ]
        }
      }
    );

    await bot.sendMessage(chatId, "✅ User approved.");
    return bot.answerCallbackQuery(query.id);
  }

  /* ===== REJECT ===== */
  if (query.data.startsWith("reject_")) {
    const userId = query.data.replace("reject_", "");

    auth.users[userId] = auth.users[userId] || {};
    auth.users[userId].approved = false;

    await bot.sendMessage(userId, "❌ Payment rejected. Send valid TXID.");
    await bot.sendMessage(chatId, "❌ User rejected.");

    return bot.answerCallbackQuery(query.id);
  }
});

/* ================= TXID HANDLER ================= */
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  auth.users[chatId] = auth.users[chatId] || {};
  auth.users[chatId].txid = text;
  auth.users[chatId].approved = false;

  await bot.sendMessage(chatId, "📩 TXID RECEIVED. Waiting admin approval.");

  if (ADMIN_ID) {
    await bot.sendMessage(
      ADMIN_ID,
      `💰 NEW PAYMENT

👤 USER: ${chatId}
🧾 TXID: ${text}`,
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
});

/* ================= WEBHOOK ================= */
app.post("/webhook", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= HOME ================= */
app.get("/", (req, res) => {
  res.send("🤖 Bingo Bot Running");
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🤖 Server running on port", PORT);
});