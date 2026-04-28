require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.BOT_TOKEN);

/* START */
bot.onText(/\/start/, (msg)=>{

  bot.sendMessage(msg.chat.id,
`🎯 BINGO GAME`,
{
    reply_markup:{
      inline_keyboard:[
        [{text:"🎮 PLAY",callback_data:"play"}]
      ]
    }
  });
});

/* PLAY */
bot.on("callback_query",(q)=>{

  if(q.data==="play"){
    bot.sendMessage(q.message.chat.id,
`💰 PAY TO PLAY
Send TXID after payment`);
  }
});

/* TXID */
bot.on("message",(msg)=>{

  if(!msg.text || msg.text.startsWith("/")) return;

  bot.sendMessage(msg.chat.id,"📩 TXID RECEIVED");
});

/* ✅ CORRECT WEBHOOK ROUTE */
app.post("/webhook",(req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* SERVER */
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
  console.log("BOT RUNNING");
});