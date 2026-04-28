require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const users = require("./auth");

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);
const TELEBIRR = "0904489434";

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

  const id=q.message.chat.id;

  if(q.data==="play"){

    users[id]={approved:false};

    bot.sendMessage(id,
`💰 PAY TO JOIN
Send to TeleBirr:
${TELEBIRR}

Then send TXID`);
  }
});

/* TXID */
bot.on("message",(msg)=>{

  if(!msg.text || msg.text.startsWith("/")) return;

  const id=msg.chat.id;

  users[id]=users[id]||{};

  users[id].txid=msg.text;
  users[id].approved=true;

  bot.sendMessage(id,"📩 TXID RECEIVED");

  if(ADMIN_ID){

    bot.sendMessage(ADMIN_ID,
`NEW PAYMENT
USER: ${id}
TXID: ${msg.text}`,
{
      reply_markup:{
        inline_keyboard:[
          [
            {text:"APPROVE",callback_data:"ok_"+id},
            {text:"REJECT",callback_data:"no_"+id}
          ]
        ]
      }
    });
  }
});

/* ADMIN */
bot.on("callback_query",(q)=>{

  const d=q.data;

  if(d.startsWith("ok_")){
    const id=d.split("_")[1];
    users[id].approved=true;
    bot.sendMessage(id,"✅ APPROVED - YOU CAN PLAY");
  }

  if(d.startsWith("no_")){
    const id=d.split("_")[1];
    users[id].approved=false;
    bot.sendMessage(id,"❌ REJECTED");
  }
});

/* WEBHOOK */
app.post("/webhook",(req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(process.env.PORT||3000,()=>{
  console.log("BOT RUNNING");
});