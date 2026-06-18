require("dotenv").config();

const express = require("express");
const http = require("http");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");

const game = require("./game");
const auth = require("./auth");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const bot = new TelegramBot(process.env.BOT_TOKEN, {
polling: true
});

const ADMIN_ID = Number(process.env.ADMIN_ID);

/* ================= GAME INIT ================= */
game.init(server);

/* ================= START ================= */
bot.onText(//start/, (msg) => {
const chatId = msg.chat.id;

bot.sendMessage(
chatId,
"🎯 BINGO GAME READY",
{
reply_markup: {
inline_keyboard: [
[
{
text: "🎮 PLAY",
url: "https://ethiobingo-1j5k.onrender.com/game.html"
}
]
]
}
}
);
});

/* ================= TXID ================= */
bot.on("message", (msg) => {
const chatId = msg.chat.id;
const text = msg.text;

if (!text || text.startsWith("/")) return;

auth.users[chatId] = { txid: text };

if (ADMIN_ID) {
bot.sendMessage(
ADMIN_ID,
`💰 PAYMENT

USER: ${chatId}
TXID: ${text}`
);
}

bot.sendMessage(chatId, "📩 Sent to admin.");
});

/* ================= HOME ================= */
app.get("/", (req, res) => {
res.send("Bingo Bot Running");
});

/* ================= SERVER ================= */
server.listen(process.env.PORT || 3000, () => {
console.log("Server running");
});
