require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

const GAME_URL = "https://ethiobingo-1j5k.onrender.com/game.html";

const bot = new TelegramBot(process.env.BOT_TOKEN);

async function startBot() {
  await bot.deleteWebHook();

  bot.startPolling();

  console.log("Telegram bot started");
}

startBot();


bot.onText(/^\/start$/, (msg) => {

  bot.sendMessage(
    msg.chat.id,
    "🎯 ETHIO BINGO\n\nClick PLAY BINGO",
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