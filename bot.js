require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_ID = process.env.ADMIN_ID;
const TELEBIRR_NUMBER = "0904489434";

/* ================= USERS ================= */
let users = {}; 
// { userId: {paid:false, approved:false, txid:""} }

/* ================= START ================= */
bot.onText(/\/start/, (msg) => {
  const id = msg.chat.id;

  bot.sendMessage(id,
`🎯 BINGO GAME

Press PLAY to join`,
{
    reply_markup:{
      inline_keyboard:[
        [{ text:"🎮 PLAY", callback_data:"play" }]
      ]
    }
  });
});

/* ================= PLAY ================= */
bot.on("callback_query", (query) => {

  const id = query.message.chat.id;

  if(query.data === "play"){

    users[id] = users[id] || {
      paid:false,
      approved:false,
      txid:null
    };

    bot.sendMessage(id,
`💰 TO PLAY PAY ANY AMOUNT (min 10 ETB)

Send to TeleBirr:
📱 ${TELEBIRR_NUMBER}

Then send:
TXID + AMOUNT`);
  }

  if(query.data.startsWith("approve_")){

    const userId = query.data.split("_")[1];

    if(users[userId]){
      users[userId].approved = true;
      users[userId].paid = true;

      bot.sendMessage(userId,"✅ PAYMENT APPROVED. YOU CAN PLAY NOW.");
      bot.sendMessage(ADMIN_ID,"APPROVED USER: "+userId);
    }
  }

  if(query.data.startsWith("reject_")){

    const userId = query.data.split("_")[1];

    if(users[userId]){
      users[userId].approved = false;

      bot.sendMessage(userId,"❌ PAYMENT REJECTED");
      bot.sendMessage(ADMIN_ID,"REJECTED USER: "+userId);
    }
  }
});

/* ================= TXID HANDLER ================= */
bot.on("message",(msg)=>{

  const id = msg.chat.id;
  const text = msg.text;

  if(!text) return;

  if(text.includes("TXID") || text.length > 5){

    if(!users[id]) users[id] = {paid:false,approved:false};

    users[id].txid = text;
    users[id].paid = true;

    bot.sendMessage(id,"📩 TXID RECEIVED. WAIT FOR APPROVAL");

    bot.sendMessage(ADMIN_ID,
`💰 NEW PAYMENT REQUEST

USER: ${id}
TXID: ${text}
AMOUNT: user defined`,
{
  reply_markup:{
    inline_keyboard:[
      [
        { text:"✅ APPROVE", callback_data:`approve_${id}` },
        { text:"❌ REJECT", callback_data:`reject_${id}` }
      ]
    ]
  }
});
  }
});

/* ================= EXPORT USERS ================= */
function isApproved(userId){
  return users[userId]?.approved === true;
}

module.exports = { bot, isApproved };