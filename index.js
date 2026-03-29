const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;

// IMPORTANT: webhook mode
const bot = new TelegramBot(TOKEN, { webHook: true });

// ===== WEBHOOK ROUTE (ROOT "/") =====
app.post("/", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ===== TEST ROUTE =====
app.get("/", (req, res) => {
  res.send("Bot running ✅");
});

// ===== BOT COMMANDS =====
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";

  console.log("MESSAGE:", text);

  if (text === "/start") {
    bot.sendMessage(chatId, "🎉 Welcome to Ethiopian Bingo!\nClick Play on website.");
  } 
  else if (text.toLowerCase().includes("play")) {
    bot.sendMessage(chatId, "🎲 Game starting...");
  } 
  else {
    bot.sendMessage(chatId, "You said: " + text);
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port", PORT));