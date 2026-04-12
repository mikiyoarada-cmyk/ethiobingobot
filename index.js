require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* ================= CRITICAL FIX (RAW JSON WEBHOOK SUPPORT) ================= */
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(express.static("public"));

/* ================= DB ================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* ================= BOT ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

/* ================= WEBHOOK ENDPOINT FIX ================= */
app.post("/bot", (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (e) {
    console.log("Webhook error:", e.message);
    res.sendStatus(500);
  }
});

/* ================= USER MODEL ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone: { type: String, unique: true },
  status: { type: String, default: "pending" },
  balance: { type: Number, default: 0 },
  cartela: Array
}));

/* ================= SAFE CALLBACK FIX ================= */
bot.on("callback_query", async (q) => {
  try {
    const [action, phone] = (q.data || "").split(":");

    await bot.answerCallbackQuery(q.id).catch(() => {});

    if (!phone) return;

    if (action === "approve") {
      await User.findOneAndUpdate(
        { phone },
        { status: "approved", balance: 100 }
      );

      await bot.sendMessage(process.env.ADMIN_ID, `✅ APPROVED ${phone}`);
    }

    if (action === "reject") {
      await User.findOneAndUpdate(
        { phone },
        { status: "rejected" }
      );

      await bot.sendMessage(process.env.ADMIN_ID, `❌ REJECTED ${phone}`);
    }

  } catch (err) {
    console.log("callback error:", err.message);
  }
});

/* ================= TEST COMMAND (IMPORTANT DEBUG) ================= */
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🤖 Bot is working!");
});

/* ================= SERVER ================= */
server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 WEBHOOK BOT FIX RUNNING");
});