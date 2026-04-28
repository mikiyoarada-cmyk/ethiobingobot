require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);

const TELEBIRR = "0904489434";

let users={};

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

  let id=q.message.chat.id;

  if(q.data==="play"){

    users[id]={paid:false,approved:false};

    bot.sendMessage(id,
`💰 PAY TO PLAY
${TELEBIRR}`);
  }
});

/* TXID */
bot.on("message",(msg)=>{

  if(!msg.text || msg.text.startsWith("/")) return;

  users[msg.chat.id]=users[msg.chat.id]||{};

  users[msg.chat.id].txid=msg.text;
  users[msg.chat.id].paid=true;

  if(ADMIN_ID){
    bot.sendMessage(ADMIN_ID,
`NEW TXID ${msg.chat.id}
${msg.text}`);
  }
});

/* WEBHOOK */
app.post("/bot",(req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(process.env.PORT||3000,()=>{
  console.log("BOT RUNNING");
});