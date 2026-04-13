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
.catch(err=>console.log(err));

/* ================= BOT ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN);

/* ================= USER MODEL ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  txid:String,
  status:{type:String,default:"pending"},
  balance:{type:Number,default:0},
  paid:{type:Boolean,default:false}
}));

/* ================= GAME STATE ================= */
let room = {
  players: {},        // paid users
  spectators: {},     // free users
  cards: {},
  called: []
};

/* ================= CARD ================= */
function unique(min,max){
  let arr=[];
  while(arr.length<5){
    let n=Math.floor(Math.random()*(max-min+1))+min;
    if(!arr.includes(n)) arr.push(n);
  }
  return arr.sort((a,b)=>a-b);
}

function generateCard(){
  const B=unique(1,15);
  const I=unique(16,30);
  const N=unique(31,45);
  const G=unique(46,60);
  const O=unique(61,75);

  return [
    [B[0],I[0],N[0],G[0],O[0]],
    [B[1],I[1],N[1],G[1],O[1]],
    [B[2],I[2],"FREE",G[2],O[2]],
    [B[3],I[3],N[3],G[3],O[3]],
    [B[4],I[4],N[4],G[4],O[4]],
  ];
}

/* ================= PAYMENT ================= */
app.post("/pay", async(req,res)=>{
  const {phone,txid}=req.body;

  await User.findOneAndUpdate(
    {phone},
    {txid,status:"pending",paid:false},
    {upsert:true}
  );

  bot.sendMessage(process.env.ADMIN_ID,
`💰 PAYMENT REQUEST
Phone: ${phone}
TXID: ${txid}`,
{
reply_markup:{
inline_keyboard:[[
{text:"✅ Approve",callback_data:`approve:${phone}`},
{text:"❌ Reject",callback_data:`reject:${phone}`}
]]
}
});

  res.json({ok:true});
});

/* ================= BOT APPROVE ================= */
bot.on("callback_query",async(q)=>{

  const [action, phone] = q.data.split(":");

  if(action==="approve"){
    await User.findOneAndUpdate(
      {phone},
      {status:"approved",paid:true,balance:0}
    );
    bot.answerCallbackQuery(q.id,"Approved");
  }

  if(action==="reject"){
    await User.findOneAndUpdate(
      {phone},
      {status:"rejected",paid:false}
    );
    bot.answerCallbackQuery(q.id,"Rejected");
  }
});

/* ================= GAME START ================= */
function startCountdown(){
  let t=40;
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

function startGame(){

  room.called=[];
  io.emit("start");

  let interval=setInterval(()=>{

    let num;
    do{
      num=Math.floor(Math.random()*75)+1;
    }while(room.called.includes(num));

    room.called.push(num);

    io.emit("number",num);
    io.emit("called",room.called);

    checkWinner();

    if(room.called.length>=75){
      clearInterval(interval);
    }

  },3000);
}

/* ================= WIN CHECK ================= */
async function checkWinner(){

  for(let phone in room.players){

    const user = await User.findOne({phone});
    if(!user || !user.paid) continue;

    const card = room.cards[phone];
    const called = room.called;

    let flat = card.flat();

    let win = flat.every(n =>
      n==="FREE" || called.includes(n)
    );

    if(win){

      const total = 1000;
      const winAmount = total * 0.8;
      const adminCut = total * 0.2;

      user.balance += winAmount;
      await user.save();

      io.emit("winner",{phone,winAmount});

      bot.sendMessage(process.env.ADMIN_ID,
`🏆 WINNER
Phone: ${phone}
Win: ${winAmount}
Admin: ${adminCut}`);

      return;
    }
  }
}

/* ================= SOCKET ================= */
io.on("connection",(socket)=>{

  socket.on("join",async(phone)=>{

    const user = await User.findOne({phone});

    if(!user){
      room.spectators[socket.id]=true;
      socket.emit("spectator",true);
      return;
    }

    if(!user.paid){
      room.spectators[socket.id]=true;
      socket.emit("spectator",true);
      return;
    }

    room.players[phone]=socket.id;
    room.cards[phone]=generateCard();

    socket.emit("spectator",false);
    socket.emit("card",room.cards[phone]);
  });

  socket.on("start",startCountdown);
});

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 FULL BINGO SYSTEM READY");
});