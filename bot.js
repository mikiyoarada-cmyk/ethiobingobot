require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

const bot = new TelegramBot(process.env.BOT_TOKEN, {
polling: true
});

bot.onText(//start/, (msg) => {
bot.sendMessage(
msg.chat.id,
"🎯 BINGO GAME READY"
);
});

bot.on("message", (msg) => {
if (!msg.text) return;
if (msg.text.startsWith("/")) return;

bot.sendMessage(
msg.chat.id,
"📩 Message received"
);
});

app.get("/", (req, res) => {
res.send("Bingo Bot Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("Server running");
});
