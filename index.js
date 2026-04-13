require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ================= DB ================= */
mongoose.connect(process.env.MONGODB_URI)
.then(()=>console.log("MongoDB connected"))
.catch(console.log);

/* ================= TELEGRAM ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN);
bot.deleteWebHook().catch(()=>{});

/* ================= USER ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  txid:String,
  status:{type:String,default:"pending"},
  balance:{type:Number,default:0}, // used as ENTRY TOKENS only
  joined:Boolean
}));

/* ================= GAME STATE ================= */
let room = {
  players:{},
  called:[],
  jackpot:0,
  round:1,
  started:false
};

/* ================= ADMIN APPROVAL (TXID ONLY) ================= */
app.post("/pay", async(req,res)=>{
  const {phone,txid}=req.body;

  await User.findOneAndUpdate(
    {phone},
    {txid,status:"pending"},
    {upsert:true}
  );

  bot.sendMessage(process.env.ADMIN_ID,
`📥 JOIN REQUEST
Phone: ${phone}
TXID: ${txid}`,
{
reply_markup:{
inline_keyboard:[[
{text:"APPROVE",callback_data:`approve:${phone}`},
{text:"REJECT",callback_data:`reject:${phone}`}
]]
}
});

  res.json({ok:true});
});

bot.on("callback_query", async(q)=>{

  const [action, phone] = q.data.split(":");
  const user = await User.findOne({phone});

  if(!user) return;

  if(action==="approve"){
    user.status="approved";
    user.balance = 1; // entry token granted
    await user.save();
    bot.answerCallbackQuery(q.id,"Approved");
  }

  if(action==="reject"){
    user.status="rejected";
    user.balance = 0;
    await user.save();
    bot.answerCallbackQuery(q.id,"Rejected");
  }
});

/* ================= GAME JOIN ================= */
io.on("connection",(socket)=>{

  socket.on("join", async(phone)=>{

    const user = await User.findOne({phone});

    if(!user || user.status!=="approved"){
      socket.emit("spectator",true);
      return;
    }

    if(user.balance < 1){
      socket.emit("insufficient","Need entry approval");
      return;
    }

    user.balance -= 1; // consume entry token
    await user.save();

    room.players[phone]={
      socketId:socket.id,
      card:generateCard()
    };

    socket.emit("spectator",false);
    socket.emit("card",room.players[phone].card);
  });

  socket.on("start",()=>startCountdown());
});

/* ================= 30 SEC AUTO START ================= */
function startCountdown(){

  if(room.started) return;
  room.started=true;

  let t=30;
  io.emit("countdown",t);

  let cd=setInterval(()=>{

    t--;
    io.emit("countdown",t);

    if(t<=0){
      clearInterval(cd);
      startGame();
    }

  },1000);
}

/* ================= GAME LOOP ================= */
function startGame(){

  room.called=[];
  io.emit("start");

  let interval=setInterval(()=>{

    let n;
    do{
      n=Math.floor(Math.random()*75)+1;
    }while(room.called.includes(n));

    room.called.push(n);
    room.jackpot++;

    io.emit("number",n);
    io.emit("called",room.called);

    checkWinner();

    if(room.called.length>=75){
      clearInterval(interval);
      endGame();
    }

  },2500);
}

/* ================= WIN CHECK ================= */
async function checkWinner(){

  for(let phone in room.players){

    const card = room.players[phone].card;

    const win = card.flat().every(n =>
      n==="FREE" || room.called.includes(n)
    );

    if(win){

      io.emit("winner",{phone});

      bot.sendMessage(process.env.ADMIN_ID,
`🏆 WINNER
${phone}`);

      endGame();
      return;
    }
  }
}

/* ================= END GAME ================= */
function endGame(){

  room.started=false;
  room.players={};
  room.called=[];
  room.round++;

  io.emit("game_end","Good Bingo 🎉");

  bot.sendMessage(process.env.ADMIN_ID,"🎉 Good Bingo - Round Ended");
}

/* ================= CARD ================= */
function generateCard(){

  function u(min,max){
    let a=[];
    while(a.length<5){
      let n=Math.floor(Math.random()*(max-min+1))+min;
      if(!a.includes(n)) a.push(n);
    }
    return a.sort((a,b)=>a-b);
  }

  const B=u(1,15),I=u(16,30),N=u(31,45),G=u(46,60),O=u(61,75);

  return [
    [B[0],I[0],N[0],G[0],O[0]],
    [B[1],I[1],N[1],G[1],O[1]],
    [B[2],I[2],"FREE",G[2],O[2]],
    [B[3],I[3],N[3],G[3],O[3]],
    [B[4],I[4],N[4],G[4],O[4]],
  ];
}

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🔥 SAFE MULTIPLAYER BINGO RUNNING");
});