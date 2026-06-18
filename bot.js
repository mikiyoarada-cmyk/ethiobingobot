require("dotenv").config();

const express = require("express");
const http = require("http");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");

const game = require("./game");

const app = express();

const server = http.createServer(app);


app.use(express.static(path.join(__dirname, "public")));


const GAME_URL = "https://ethiobingo-1j5k.onrender.com/game.html";


const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true
});


/* START GAME SERVER */
game.init(server);



bot.onText(/^\/start$/, (msg) => {

  bot.sendMessage(
    msg.chat.id,
    "🎯 ETHIO BINGO\n\nClick PLAY BINGO",
    {
      reply_markup:{
        inline_keyboard:[
          [
            {
              text:"🎮 PLAY BINGO",
              url:GAME_URL
            }
          ]
        ]
      }
    }
  );

});



app.get("/",(req,res)=>{
  res.send("Ethio Bingo Running");
});



const PORT = process.env.PORT || 3000;


server.listen(PORT,()=>{
 console.log("Server running");
});