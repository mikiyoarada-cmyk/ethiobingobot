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

/* ================= TELEGRAM BOT (FIXED - NO POLLING ERROR) ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN);

// IMPORTANT FIX: avoid 409 conflict on Render
bot.deleteWebHook().catch(()=>{});

/* ================= USER MODEL ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  txid:String,
  status:{type:String,default:"pending"},
  balance:{type:Number,default:0},
  paid:{type:Boolean,default:false},
  blocked:{type:Boolean,default:false}
}));

/* ================= ADMIN DASHBOARD ================= */
app.get("/admin",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/admin.html"));
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

/* ================= BOT APPROVE / REJECT (FIXED) ================= */
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
    bot.sendMessage(process.env.ADMIN_ID,`Approved: ${phone}`);
  }

  if(action==="reject"){
    user.status="rejected";
    user.paid=false;
    await user.save();

    bot.answerCallbackQuery(q.id,"Rejected ❌");
  }
});

/* ================= WITHDRAW ================= */
const Withdraw = mongoose.model("Withdraw", new mongoose.Schema({
  phone:String,
  amount:Number,
  status:{type:String,default:"pending"}
}));

app.post("/withdraw", async(req,res)=>{
  const {phone,amount}=req.body;

  const user = await User.findOne({phone});

  if(!user || user.balance < amount){
    return res.json({ok:false,msg:"Not enough balance"});
  }

  await Withdraw.create({phone,amount});

  bot.sendMessage(process.env.ADMIN_ID,
`💸 WITHDRAW REQUEST
Phone: ${phone}
Amount: ${amount}`,
{
reply_markup:{
inline_keyboard:[[
{text:"✅ PAY",callback_data:`pay:${phone}:${amount}`},
{text:"❌ REJECT",callback_data:`wreject:${phone}:${amount}`}
]]
}
});

  res.json({ok:true});
});

/* ================= WITHDRAW BOT ================= */
bot.on("callback_query", async(q)=>{

  const data = q.data.split(":");

  if(data[0]==="pay"){
    const phone=data[1];
    const amount=Number(data[2]);

    const user = await User.findOne({phone});
    if(user){
      user.balance -= amount;
      await user.save();
    }

    await Withdraw.updateOne({phone,amount},{status:"paid"});
    bot.answerCallbackQuery(q.id,"Paid ✅");
  }

  if(data[0]==="wreject"){
    const phone=data[1];
    const amount=data[2];

    await Withdraw.updateOne({phone,amount},{status:"rejected"});
    bot.answerCallbackQuery(q.id,"Rejected ❌");
  }
});

/* ================= GAME STATE ================= */
let room = {
  players:{},
  called:[],
  jackpot:0
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
    room.jackpot += 10;

    io.emit("number",num);
    io.emit("called",room.called);

    checkWinner();

    if(room.called.length>=75){
      clearInterval(interval);
    }

  },3000);
}

/* ================= AUTO WINNER ================= */
async function checkWinner(){

  for(let phone in room.players){

    const user = await User.findOne({phone});
    if(!user || !user.paid) continue;

    const card = room.players[phone].card;
    const called = room.called;

    let flat = card.flat();

    let win = flat.every(n =>
      n==="FREE" || called.includes(n)
    );

    if(win){

      const total = room.jackpot || 1000;
      const winAmount = total * 0.8;

      user.balance += winAmount;
      await user.save();

      room.jackpot = 0;

      io.emit("winner",{phone,winAmount});

      bot.sendMessage(process.env.ADMIN_ID,
`🏆 WINNER
Phone: ${phone}
Win: ${winAmount}`);

      return;
    }
  }
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

  socket.on("start",startCountdown);
});

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 CLEAN BINGO SYSTEM READY");
});