const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
  console.log("❌ BOT_TOKEN missing");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: false });

// ✅ Webhook
app.post("/", (req, res) => {
  try {
    console.log("Update:", JSON.stringify(req.body));
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.log("❌ ERROR:", err.message);
    res.sendStatus(200);
  }
});

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Bot running ✅");
});

// ✅ SAFE BOT HANDLER (NO CRASH)
bot.on("message", (msg) => {
  try {
    const chatId = msg.chat.id;

    // 🔴 FIX: handle undefined text
    const text = msg.text ? msg.text : "";

    console.log("Message:", text);

    if (text === "/start") {
      bot.sendMessage(chatId, "Welcome to Ethiobingo 🎉");
    } else if (text === "/help") {
      bot.sendMessage(chatId, "Commands:\n/start\n/help");
    } else if (text === "") {
      bot.sendMessage(chatId, "Send text message please 🙂");
    } else {
      bot.sendMessage(chatId, "You said: " + text);
    }

  } catch (err) {
    console.log("❌ BOT ERROR:", err.message);
  }
});

// ✅ Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("✅ Server running on port " + PORT);
});