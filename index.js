require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const server = http.createServer(app);

/* ================= CRITICAL FIX ================= */
app.use(express.json());

/* ================= DB ================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* ================= BOT (IMPORTANT FIX) ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  webHook: true
});

/* ================= WEBHOOK ROUTE ================= */
app.post("/bot", async (req, res) => {
  try {
    await bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.log("Webhook error:", err.message);
    res.sendStatus(200);
  }
});

/* ================= TEST BOT ================= */
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🤖 Bot is LIVE and working!");
});

/* ================= CALLBACK FIX ================= */
bot.on("callback_query", async (q) => {
  try {
    const data = q.data || "";
    const [action, phone] = data.split(":");

    await bot.answerCallbackQuery(q.id).catch(() => {});

    if (!phone) return;

    if (action === "approve") {
      await bot.sendMessage(process.env.ADMIN_ID, `✅ APPROVED: ${phone}`);
    }

    if (action === "reject") {
      await bot.sendMessage(process.env.ADMIN_ID, `❌ REJECTED: ${phone}`);
    }

  } catch (e) {
    console.log("callback error:", e.message);
  }
});

/* ================= SERVER ================= */
server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 MASTER BOT FIX RUNNING");
});