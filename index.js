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

/* ================= TELEGRAM ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN);

app.post("/bot", (req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= MODEL ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  status:{type:String,default:"pending"},
  balance:{type:Number,default:0},
  cartela:Array,
  txid:String
}));

/* ================= REGISTER ================= */
app.post("/register", async(req,res)=>{
  const {phone}=req.body;
  await User.findOneAndUpdate({phone},{},{upsert:true});
  res.json({ok:true});
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
`💰 Payment Request
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

/* ================= BOT BUTTON ================= */
bot.on("callback_query", async(q)=>{
  const phone = q.data.split("_")[1];

  if(q.data.startsWith("approve")){
    await User.findOneAndUpdate({phone},{
      status:"approved",
      balance:100
    });
    bot.sendMessage(q.message.chat.id,"✅ Approved "+phone);
  }

  if(q.data.startsWith("reject")){
    await User.findOneAndUpdate({phone},{status:"rejected"});
    bot.sendMessage(q.message.chat.id,"❌ Rejected "+phone);
  }
});

/* ================= BALANCE ================= */
app.get("/balance/:phone", async(req,res)=>{
  const user=await User.findOne({phone:req.params.phone});
  res.json({balance:user?user.balance:0});
});

/* ================= BINGO CARD (NO DUPLICATE) ================= */
function getUnique(min,max){
  let arr=[];
  while(arr.length<5){
    let n=Math.floor(Math.random()*(max-min+1))+min;
    if(!arr.includes(n)) arr.push(n);
  }
  return arr.sort((a,b)=>a-b);
}

function generateCard(){
  const B=getUnique(1,15);
  const I=getUnique(16,30);
  const N=getUnique(31,45);
  const G=getUnique(46,60);
  const O=getUnique(61,75);

  let card=[];
  for(let i=0;i<5;i++){
    card.push([B[i],I[i],N[i],G[i],O[i]]);
  }

  card[2][2]="FREE";
  return card;
}

/* ================= JOIN ================= */
let players=[];

app.post("/join", async(req,res)=>{
  const {phone}=req.body;

  const user=await User.findOne({phone});

  if(!user || user.status!=="approved"){
    return res.json({ok:false,msg:"Not approved"});
  }

  if(user.balance<10){
    return res.json({ok:false,msg:"Insufficient balance"});
  }

  user.balance-=10;
  user.cartela=generateCard();
  await user.save();

  if(!players.includes(phone)) players.push(phone);

  io.emit("players",players);

  res.json({ok:true,cartela:user.cartela,balance:user.balance});
});

/* ================= GAME ================= */
let called=[];
let interval;

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

io.on("connection",(socket)=>{
  socket.on("start",startCountdown);
});

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 FULL SYSTEM RUNNING");
});