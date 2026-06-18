require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

const bot = new TelegramBot(
process.env.BOT_TOKEN,
{
polling: true
}
);

const GAME_URL =
"https://ethiobingo-1j5k.onrender.com/game.html";

bot.onText(//start/, (msg) => {
bot.sendMessage(
msg.chat.id,
"🎯 ETHIO BINGO",
{
reply_markup: {
inline_keyboard: [
[
{
text: "🎮 PLAY BINGO",
url: GAME_URL
}
]
]
}
}
);
});

app.get("/", (req, res) => {
res.send("Ethio Bingo Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("Server running");
});
