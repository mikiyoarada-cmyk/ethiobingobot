// Load environment variables from Render
const TOKEN = process.env.TOKEN;      // Your Telegram bot token
const MONGO_URL = process.env.MONGO_URL; // Your MongoDB connection URL

if (!TOKEN || !MONGO_URL) {
  console.error("Error: TOKEN or MONGO_URL not set in environment!");
  process.exit(1);
}

// Telegram Bot
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(TOKEN, { polling: true });

// MongoDB
const { MongoClient } = require('mongodb');
const client = new MongoClient(MONGO_URL);
let db;

(async () => {
  try {
    await client.connect();
    db = client.db("ethiobingobot"); // database name
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
})();

// Express server (required by Render to keep app alive)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));

// Example bot command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hello! Bot is live 🚀");
});