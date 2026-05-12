require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const auth = require("./auth");

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.BOT_TOKEN);

const ADMIN_ID = Number(process.env.ADMIN_ID);
const TELEBIRR_NUMBER = "0904489434";
const GAME_URL = "https://ethiobingo-1j5k.onrender.com/game.html";

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

/* ================= CALLBACK BUTTONS ================= */
bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat?.id;
  if (!chatId) return;

  /* ===== PLAY BUTTON ===== */
  if (query.data === "play") {
    auth.users[chatId] = auth.users[chatId] || { approved: false };

    // If already approved, send Play Bingo button
    if (auth.users[chatId].approved) {
      await bot.sendMessage(
        chatId,
`✅ PAYMENT APPROVED

Click below to open the Bingo game.`,
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

    // Ask for payment
    await bot.sendMessage(
      chatId,
`💰 PAY TO PLAY

Send at least 10 ETB to TeleBirr:
📱 ${TELEBIRR_NUMBER}

After payment, send your TXID here.

Once admin approves, you will receive a 🎯 PLAY BINGO button.`
    );

    return bot.answerCallbackQuery(query.id);
  }

  /* ===== APPROVE ===== */
  if (query.data.startsWith("approve_")) {
    const userId = query.data.replace("approve_", "");

    auth.users[userId] = auth.users[userId] || {};
    auth.users[userId].approved = true;

    // Notify user
    await bot.sendMessage(
      userId,
`✅ PAYMENT APPROVED

You can now join the live Bingo game.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎯 PLAY BINGO", url: GAME_URL }]
          ]
        }
      }
    );

    await bot.sendMessage(chatId, "✅ User approved successfully.");
    return bot.answerCallbackQuery(query.id);
  }

  /* ===== REJECT ===== */
  if (query.data.startsWith("reject_")) {
    const userId = query.data.replace("reject_", "");

    auth.users[userId] = auth.users[userId] || {};
    auth.users[userId].approved = false;

    await bot.sendMessage(
      userId,
      "❌ PAYMENT REJECTED\n\nPlease send a valid TXID."
    );

    await bot.sendMessage(chatId, "❌ User rejected.");
    return bot.answerCallbackQuery(query.id);
  }
});

/* ================= RECEIVE TXID ================= */
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  auth.users[chatId] = auth.users[chatId] || {};
  auth.users[chatId].txid = text;
  auth.users[chatId].approved = false;

  await bot.sendMessage(
    chatId,
    "📩 TXID RECEIVED. Waiting for admin approval."
  );

  // Send to admin
  if (ADMIN_ID) {
    await bot.sendMessage(
      ADMIN_ID,
`💰 NEW PAYMENT REQUEST

👤 USER ID: ${chatId}
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

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.send("Bingo Telegram Bot Running");
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🤖 Telegram Bot Running on port", PORT);
});