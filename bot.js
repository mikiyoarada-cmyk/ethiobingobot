require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const server = http.createServer(app);

/* ================= EXPRESS ================= */

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ================= TELEGRAM BOT ================= */

const bot = new TelegramBot(process.env.BOT_TOKEN, {
polling: true
});

/* Remove old webhook if one exists */
bot.deleteWebHook().catch(console.error);

/* ================= START COMMAND ================= */

bot.onText(//start/, async (msg) => {
const chatId = msg.chat.id;

await bot.sendMessage(
chatId,
"🎯 BINGO GAME\n\nClick PLAY to open the game.",
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

/* ================= MESSAGE HANDLER ================= */

bot.on("message", async (msg) => {
if (!msg.text) return;
if (msg.text.startsWith("/")) return;

await bot.sendMessage(
msg.chat.id,
"📩 Message received."
);
});

/* ================= HOME ================= */

app.get("/", (req, res) => {
res.send("Bingo Bot Running");
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
console.log("Server running");
});
