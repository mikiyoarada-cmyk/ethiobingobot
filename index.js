require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ================= DB ================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* ================= BOT ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN);

/* WEBHOOK */
app.post("/bot", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= SAFE LOG ================= */
console.log("ADMIN_ID =", process.env.ADMIN_ID);

/* ================= USER MODEL ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone: String,
  status: { type: String, default: "pending" },
  balance: { type: Number, default: 0 }
}));

/* ================= PAYMENT ================= */
app.post("/pay", async (req, res) => {
  const { phone, txid } = req.body;

  await User.findOneAndUpdate(
    { phone },
    { txid, status: "pending" },
    { upsert: true }
  );

  // IMPORTANT: check ADMIN_ID exists
  if (!process.env.ADMIN_ID) {
    console.log("❌ ADMIN_ID missing in .env");
    return res.json({ ok: false });
  }

  bot.sendMessage(process.env.ADMIN_ID,
`💰 PAYMENT REQUEST
Phone: ${phone}
TXID: ${txid}`,
{
  reply_markup: {
    inline_keyboard: [[
      { text: "✅ Approve", callback_data: `approve:${phone}` },
      { text: "❌ Reject", callback_data: `reject:${phone}` }
    ]]
  }
});

  res.json({ ok: true });
});

/* ================= FIXED CALLBACK (100% SAFE) ================= */
bot.on("callback_query", async (q) => {
  try {
    const data = q.data || "";
    const [action, phone] = data.split(":");

    // ALWAYS respond instantly
    await bot.answerCallbackQuery(q.id).catch(() => {});

    console.log("BUTTON CLICKED:", action, phone);

    if (action === "approve") {
      await User.findOneAndUpdate(
        { phone },
        { status: "approved", balance: 100 }
      );

      await bot.sendMessage(process.env.ADMIN_ID,
        `✅ APPROVED: ${phone}`
      );
    }

    if (action === "reject") {
      await User.findOneAndUpdate(
        { phone },
        { status: "rejected" }
      );

      await bot.sendMessage(process.env.ADMIN_ID,
        `❌ REJECTED: ${phone}`
      );
    }

  } catch (err) {
    console.log("CALLBACK ERROR:", err.message);
  }
});

/* ================= ADMIN CHECK ================= */
app.get("/admin/list", async (req, res) => {
  res.json(await User.find());
});

/* ================= SERVER ================= */
server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 BUTTON FIX SYSTEM RUNNING");
});