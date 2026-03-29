const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

// 👉 Your token from environment
const TOKEN = process.env.BOT_TOKEN;

// ❗ VERY IMPORTANT: polling MUST be false
const bot = new TelegramBot(TOKEN, { polling: false });

// ✅ Webhook route (Telegram sends updates here)
app.post("/", (req, res) => {
  console.log("Update received:", req.body); // for debugging
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ✅ Test route (browser check)
app.get("/", (req, res) => {
  res.send("Bot running ✅");
});

// ✅ Bot logic
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  console.log("Message:", text);

  if (text === "/start") {
    bot.sendMessage(chatId, "Welcome to Ethiobingo 🎉");
  } else if (text === "/help") {
    bot.sendMessage(chatId, "Commands:\n/start\n/help");
  } else {
    bot.sendMessage(chatId, "I received: " + text);
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});