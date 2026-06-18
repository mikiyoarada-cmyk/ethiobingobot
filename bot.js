require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

const GAME_URL = "https://ethiobingo-1j5k.onrender.com/game.html";

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true
});


bot.onText(/^\/start$/, function (msg) {

  bot.sendMessage(
    msg.chat.id,
    "🎯 ETHIO BINGO\n\nClick PLAY BINGO to open game",
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


app.get("/", function(req, res){
  res.send("Ethio Bingo Running");
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, function(){
  console.log("Server running");
});