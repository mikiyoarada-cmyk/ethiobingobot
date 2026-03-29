const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new TelegramBot(TOKEN);

let users = {};
let players = [];

// Webhook
app.post(`/${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Test route
app.get("/", (req, res) => {
  res.send("Bingo + Balance Running!");
});

// Commands
bot.onText(/\/balance/, (msg) => {
  const id = msg.from.id;
  if (!users[id]) users[id] = { balance: 0 };

  bot.sendMessage(msg.chat.id, `💰 Balance: ${users[id].balance}`);
});

bot.onText(/\/add (\d+) (\d+)/, (msg, match) => {
  if (msg.from.id != ADMIN_ID) return;

  const userId = match[1];
  const amount = parseInt(match[2]);

  if (!users[userId]) users[userId] = { balance: 0 };
  users[userId].balance += amount;

  bot.sendMessage(msg.chat.id, `✅ Added ${amount}`);
});

bot.onText(/\/join/, (msg) => {
  const id = msg.from.id;

  if (!users[id]) users[id] = { balance: 0 };

  if (users[id].balance < 5) {
    return bot.sendMessage(msg.chat.id, "❌ Need 5 birr");
  }

  users[id].balance -= 5;
  players.push(id);

  bot.sendMessage(msg.chat.id, "✅ Joined");

  if (players.length >= 2) {
    const winner = players[Math.floor(Math.random() * players.length)];
    users[winner].balance += 20;

    bot.sendMessage(msg.chat.id, `🏆 Winner: ${winner}`);
    players = [];
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});