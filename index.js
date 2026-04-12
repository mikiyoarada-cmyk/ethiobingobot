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

/* ================= ENV ================= */
const TOKEN = process.env.TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const MONGO = process.env.MONGO_URL;

/* ================= DB ================= */
mongoose.connect(MONGO)
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>console.log(err));

/* ================= BOT ================= */
const bot = new TelegramBot(TOKEN, { polling: true });

/* ================= USER ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  status:{type:String,default:"pending"},
  balance:{type:Number,default:0},
  cartela:Array,
  txid:String
}));

/* ================= ADMIN ================= */
app.get("/admin", (req,res)=>{
  res.sendFile(path.join(__dirname,"public/admin.html"));
});

app.get("/admin/list", async(req,res)=>{
  res.json(await User.find());
});

app.post("/admin/approve/:phone", async(req,res)=>{
  const phone = req.params.phone;

  await User.findOneAndUpdate(
    {phone},
    {status:"approved",balance:100}
  );

  bot.sendMessage(ADMIN_ID, "✅ Approved " + phone);

  res.json({ok:true});
});

app.post("/admin/reject/:phone", async(req,res)=>{
  const phone = req.params.phone;

  await User.findOneAndUpdate(
    {phone},
    {status:"rejected"}
  );

  bot.sendMessage(ADMIN_ID, "❌ Rejected " + phone);

  res.json({ok:true});
});

/* ================= PAYMENT ================= */
app.post("/pay", async(req,res)=>{
  const {phone,txid} = req.body;

  await User.findOneAndUpdate(
    {phone},
    {txid,status:"pending"},
    {upsert:true}
  );

  bot.sendMessage(ADMIN_ID,
`💰 PAYMENT REQUEST

Phone: ${phone}
TXID: ${txid}`,
{
  reply_markup:{
    inline_keyboard:[[
      {text:"✅ Approve",callback_data:`approve_${phone}`},
      {text:"❌ Reject",callback_data:`reject_${phone}`}
    ]]
  }
});

  res.json({ok:true});
});

/* ================= BOT BUTTON FIX ================= */
bot.on("callback_query", async(q)=>{
  const data = q.data;
  const phone = data.split("_")[1];

  if(data.startsWith("approve")){
    await User.findOneAndUpdate(
      {phone},
      {status:"approved",balance:100}
    );

    bot.answerCallbackQuery(q.id,{text:"Approved"});
    bot.sendMessage(q.message.chat.id,"✅ Approved " + phone);
  }

  if(data.startsWith("reject")){
    await User.findOneAndUpdate(
      {phone},
      {status:"rejected"}
    );

    bot.answerCallbackQuery(q.id,{text:"Rejected"});
    bot.sendMessage(q.message.chat.id,"❌ Rejected " + phone);
  }
});

/* ================= BALANCE ================= */
app.get("/balance/:phone", async(req,res)=>{
  const user = await User.findOne({phone:req.params.phone});
  res.json({balance:user ? user.balance : 0});
});

/* ================= PERFECT CARD ================= */
function pick(nums){
  let res=[];
  while(res.length<5){
    let n=nums[Math.floor(Math.random()*nums.length)];
    if(!res.includes(n)) res.push(n);
  }
  return res;
}

function generateCard(){
  const B = pick([...Array(15)].map((_,i)=>i+1));
  const I = pick([...Array(15)].map((_,i)=>i+16));
  const N = pick([...Array(15)].map((_,i)=>i+31));
  const G = pick([...Array(15)].map((_,i)=>i+46));
  const O = pick([...Array(15)].map((_,i)=>i+61));

  return [
    [B[0],I[0],N[0],G[0],O[0]],
    [B[1],I[1],N[1],G[1],O[1]],
    [B[2],I[2],"FREE",G[2],O[2]],
    [B[3],I[3],N[3],G[3],O[3]],
    [B[4],I[4],N[4],G[4],O[4]]
  ];
}

/* ================= JOIN ================= */
let players=[];

app.post("/join", async(req,res)=>{
  const {phone}=req.body;
  const user=await User.findOne({phone});

  if(!user || user.status!=="approved"){
    return res.json({ok:false,msg:"Not approved"});
  }

  if(user.balance < 10){
    return res.json({ok:false,msg:"Insufficient balance"});
  }

  user.balance -= 10;
  user.cartela = generateCard();
  await user.save();

  if(!players.includes(phone)) players.push(phone);

  io.emit("players",players);

  res.json({
    ok:true,
    cartela:user.cartela,
    balance:user.balance
  });
});

/* ================= GAME ================= */
let called=[];
let interval;
let pot=0;

function startCountdown(){
  if(players.length < 2){
    io.emit("msg","Need at least 2 players");
    return;
  }

  pot = players.length * 10;

  let t=20;
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
  called=[];
  io.emit("start");

  interval=setInterval(()=>{
    let num;

    do{
      num=Math.floor(Math.random()*75)+1;
    }while(called.includes(num));

    called.push(num);

    io.emit("number",num);
    io.emit("called",called);

  },3000);
}

/* ================= WIN ================= */
app.post("/win", async(req,res)=>{
  const {phone}=req.body;

  clearInterval(interval);

  const winAmount = Math.floor(pot * 0.8);

  await User.findOneAndUpdate(
    {phone},
    {$inc:{balance:winAmount}}
  );

  io.emit("winner", {phone, winAmount});

  players=[];
  called=[];
  pot=0;

  res.json({ok:true});
});

/* ================= SOCKET ================= */
io.on("connection",(socket)=>{
  socket.on("start",startCountdown);
});

/* ================= SERVER ================= */
server.listen(process.env.PORT || 10000, ()=>{
  console.log("🚀 ETHIOBINGO FULL SYSTEM READY");
});