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

/* ================= TELEGRAM FIXED ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN);
bot.deleteWebHook().catch(()=>{});

/* ================= MODELS ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  txid:String,
  status:{type:String,default:"pending"},
  balance:{type:Number,default:0},
  paid:{type:Boolean,default:false}
}));

const Withdraw = mongoose.model("Withdraw", new mongoose.Schema({
  phone:String,
  amount:Number,
  status:{type:String,default:"pending"}
}));

/* ================= ADMIN UI ================= */
app.get("/admin",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/admin.html"));
});

/* ================= DASHBOARD DATA ================= */
app.get("/admin/data", async(req,res)=>{
  const users = await User.find();
  const withdraws = await Withdraw.find();
  res.json({users,withdraws});
});

/* ================= PAYMENT ================= */
app.post("/pay", async(req,res)=>{
  const {phone,txid}=req.body;

  await User.findOneAndUpdate(
    {phone},
    {txid,status:"pending"},
    {upsert:true}
  );

  bot.sendMessage(process.env.ADMIN_ID,
`💰 PAYMENT
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

/* ================= BOT FIX ================= */
bot.on("callback_query", async(q)=>{

  const [action, phone] = q.data.split(":");

  const user = await User.findOne({phone});

  if(action==="approve"){
    user.status="approved";
    user.paid=true;
    user.balance += 100;
    await user.save();

    bot.answerCallbackQuery(q.id,"Approved");
  }

  if(action==="reject"){
    user.status="rejected";
    user.paid=false;
    await user.save();

    bot.answerCallbackQuery(q.id,"Rejected");
  }
});

/* ================= WITHDRAW ================= */
app.post("/withdraw", async(req,res)=>{
  const {phone,amount}=req.body;

  const user = await User.findOne({phone});

  if(!user || user.balance < amount){
    return res.json({ok:false});
  }

  await Withdraw.create({phone,amount});

  bot.sendMessage(process.env.ADMIN_ID,
`WITHDRAW REQUEST
${phone} - ${amount}`,
{
reply_markup:{
inline_keyboard:[[
{text:"PAY",callback_data:`pay:${phone}:${amount}`},
{text:"REJECT",callback_data:`wreject:${phone}:${amount}`}
]]
}
});

  res.json({ok:true});
});

/* ================= WITHDRAW BOT ================= */
bot.on("callback_query", async(q)=>{

  const d = q.data.split(":");

  if(d[0]==="pay"){
    const user = await User.findOne({phone:d[1]});
    user.balance -= Number(d[2]);
    await user.save();

    await Withdraw.updateOne({phone:d[1],amount:d[2]},{status:"paid"});
    bot.answerCallbackQuery(q.id,"Paid");
  }

  if(d[0]==="wreject"){
    await Withdraw.updateOne({phone:d[1],amount:d[2]},{status:"rejected"});
    bot.answerCallbackQuery(q.id,"Rejected");
  }
});

/* ================= GAME ================= */
let room = {players:{},called:[],jackpot:0};

/* ================= AUTO WIN ================= */
async function checkWinner(){

  for(let phone in room.players){

    const user = await User.findOne({phone});
    if(!user || !user.paid) continue;

    const card = room.players[phone].card;
    const flat = card.flat();

    const win = flat.every(n=> n==="FREE" || room.called.includes(n));

    if(win){

      const total = room.jackpot || 1000;
      const winAmount = total * 0.8;

      user.balance += winAmount;
      await user.save();

      room.jackpot = 0;

      io.emit("winner",{phone,winAmount});

      bot.sendMessage(process.env.ADMIN_ID,
`WINNER: ${phone}
WIN: ${winAmount}`);

      return;
    }
  }
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
    room.jackpot += 10;

    io.emit("number",n);
    io.emit("called",room.called);

    checkWinner();

    if(room.called.length>=75){
      clearInterval(interval);
    }

  },2500);
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
  console.log("🔥 CASINO SYSTEM READY");
});