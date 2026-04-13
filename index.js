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

/* ================= BOT FIXED ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN);
bot.deleteWebHook().catch(()=>{});

/* ================= USER ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  txid:String,
  status:{type:String,default:"pending"},
  balance:{type:Number,default:0},
  paid:{type:Boolean,default:false}
}));

/* ================= WITHDRAW ================= */
const Withdraw = mongoose.model("Withdraw", new mongoose.Schema({
  phone:String,
  amount:Number,
  status:{type:String,default:"pending"}
}));

/* ================= ADMIN PAGE ================= */
app.get("/admin",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/admin.html"));
});

/* ================= PAYMENT REQUEST ================= */
app.post("/pay", async(req,res)=>{
  const {phone,txid}=req.body;

  await User.findOneAndUpdate(
    {phone},
    {txid,status:"pending"},
    {upsert:true}
  );

  bot.sendMessage(process.env.ADMIN_ID,
`💰 PAYMENT REQUEST
Phone: ${phone}
TXID: ${txid}

💡 Manual verify (Telebirr/CBE)`,
{
reply_markup:{
inline_keyboard:[[
{text:"✅ APPROVE",callback_data:`approve:${phone}`},
{text:"❌ REJECT",callback_data:`reject:${phone}`}
]]
}
});

  res.json({ok:true});
});

/* ================= TELEGRAM FIX ================= */
bot.on("callback_query", async(q)=>{

  const [action, phone] = q.data.split(":");
  const user = await User.findOne({phone});

  if(!user){
    return bot.answerCallbackQuery(q.id,"User not found");
  }

  if(action==="approve"){
    user.status="approved";
    user.paid=true;
    user.balance += 100;
    await user.save();

    bot.answerCallbackQuery(q.id,"Approved ✅");
  }

  if(action==="reject"){
    user.status="rejected";
    user.paid=false;
    await user.save();

    bot.answerCallbackQuery(q.id,"Rejected ❌");
  }
});

/* ================= GAME STATE ================= */
let room = {
  players:{},
  called:[],
  jackpot:0,
  round:1
};

/* ================= AUTO RESTART SYSTEM ================= */
function resetGame(){
  room.called=[];
  room.jackpot=0;
  room.round++;

  io.emit("game_reset",{round:room.round});
}

/* ================= WIN CHECK ================= */
async function checkWinner(){

  for(let phone in room.players){

    const user = await User.findOne({phone});
    if(!user || !user.paid) continue;

    const card = room.players[phone].card;

    const win = card.flat().every(n =>
      n==="FREE" || room.called.includes(n)
    );

    if(win){

      const total = room.jackpot || 1000;
      const winAmount = total * 0.8;

      user.balance += winAmount;
      await user.save();

      io.emit("winner",{phone,winAmount});

      bot.sendMessage(process.env.ADMIN_ID,
`🏆 WINNER
Phone: ${phone}
Win: ${winAmount}`);

      resetGame();
      startGame();

      return;
    }
  }
}

/* ================= GAME LOOP ================= */
function startGame(){

  let interval=setInterval(()=>{

    if(room.called.length>=75){
      clearInterval(interval);
      resetGame();
      startGame();
      return;
    }

    let num;
    do{
      num=Math.floor(Math.random()*75)+1;
    }while(room.called.includes(num));

    room.called.push(num);
    room.jackpot += 10;

    io.emit("number",num);
    io.emit("called",room.called);

    checkWinner();

  },3000);
}

/* ================= SOCKET ================= */
io.on("connection",(socket)=>{

  socket.on("join",async(phone)=>{

    const user = await User.findOne({phone});

    if(!user || !user.paid){
      return socket.emit("spectator",true);
    }

    room.players[phone]={
      socketId:socket.id,
      card:generateCard()
    };

    socket.emit("spectator",false);
    socket.emit("card",room.players[phone].card);
  });

  socket.on("start",startGame);
});

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
  console.log("🔥 FULL CASINO SYSTEM RUNNING");
});