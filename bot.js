require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const auth = require("./auth");

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.BOT_TOKEN);

const ADMIN_ID = Number(process.env.ADMIN_ID);

// 🔥 YOUR TELEBIRR NUMBER
const TELEBIRR_NUMBER = "0904489434";

/* ================= START ================= */
bot.onText(/\/start/, (msg) => {

  bot.sendMessage(msg.chat.id,
`🎯 BINGO GAME

Click PLAY to join`,
{
  reply_markup:{
    inline_keyboard:[
      [{ text:"🎮 PLAY", callback_data:"play" }]
    ]
  }
});
});

/* ================= BUTTON ================= */
bot.on("callback_query",(q)=>{

  const chatId = q.message?.chat?.id;
  if(!chatId) return;

  // PLAY
  if(q.data === "play"){

    auth.users[chatId] = { approved:false };

    bot.sendMessage(chatId,
`💰 PAY TO PLAY

Send to TeleBirr:
📱 ${TELEBIRR_NUMBER}

Minimum: 10 ETB

After payment send TXID`);
  }

  // APPROVE
  if(q.data.startsWith("ok_")){

    const id = q.data.split("_")[1];

    auth.users[id] = { approved:true };

    bot.sendMessage(id,"✅ PAYMENT APPROVED — YOU CAN PLAY");
    bot.sendMessage(chatId,"✔ Approved");
  }

  // REJECT
  if(q.data.startsWith("no_")){

    const id = q.data.split("_")[1];

    auth.users[id] = { approved:false };

    bot.sendMessage(id,"❌ PAYMENT REJECTED");
    bot.sendMessage(chatId,"❌ Rejected");
  }

});

/* ================= TXID ================= */
bot.on("message",(msg)=>{

  const chatId = msg.chat.id;
  const text = msg.text;

  if(!text || text.startsWith("/")) return;

  auth.users[chatId] = auth.users[chatId] || {};
  auth.users[chatId].txid = text;

  bot.sendMessage(chatId,"📩 TXID RECEIVED — WAIT FOR APPROVAL");

  // SEND TO ADMIN
  if(ADMIN_ID){
    bot.sendMessage(ADMIN_ID,
`💰 NEW PAYMENT

USER: ${chatId}
TXID: ${text}`,
{
  reply_markup:{
    inline_keyboard:[
      [
        { text:"✅ APPROVE", callback_data:"ok_"+chatId },
        { text:"❌ REJECT", callback_data:"no_"+chatId }
      ]
    ]
  }
});
  }

});

/* ================= WEBHOOK ================= */
app.post("/webhook",(req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= TEST ================= */
app.get("/",(req,res)=>{
  res.send("BOT WORKING");
});

/* ================= SERVER ================= */
app.listen(process.env.PORT || 3000, ()=>{
  console.log("🤖 BOT RUNNING");
});