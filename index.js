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

/* ================= DATABASE ================= */
mongoose.connect(process.env.MONGODB_URI)
.then(()=>console.log("MongoDB connected"))
.catch(err=>console.log(err));

/* ================= TELEGRAM BOT ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN);
app.post("/bot",(req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= USER MODEL ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  balance:{type:Number,default:0},
  status:{type:String,default:"pending"},
  txid:String
}));

/* ================= GAME STATE ================= */
let called = [];
let interval;
let roomPlayers = {};

/* ================= CARD GENERATOR ================= */
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

/* ================= START GAME ================= */
function startCountdown(){
  let t = 10;
  io.emit("countdown",t);

  let cd = setInterval(()=>{
    t--;
    io.emit("countdown",t);

    if(t<=0){
      clearInterval(cd);
      startGame();
    }
  },1000);
}

function startGame(){
  called = [];
  io.emit("start");

  interval = setInterval(()=>{
    let num;
    do{
      num=Math.floor(Math.random()*75)+1;
    }while(called.includes(num));

    called.push(num);

    io.emit("number",num);
    io.emit("called",called);

  },3000);
}

/* ================= SOCKET ================= */
io.on("connection",(socket)=>{

  socket.on("start",startCountdown);

  socket.on("join",async(phone)=>{
    const user = await User.findOne({phone});
    if(!user) return;

    socket.emit("balance",user.balance);
    socket.emit("card",generateCard());
  });

  /* ================= BINGO WIN ================= */
  socket.on("bingo",async({phone})=>{

    const user = await User.findOne({phone});
    if(!user) return;

    const reward = 1000;
    const win = reward * 0.8;
    const admin = reward * 0.2;

    user.balance += win;
    await user.save();

    socket.emit("win",win);

    bot.sendMessage(process.env.ADMIN_ID,
`🏆 WINNER ALERT
Phone: ${phone}
Win: ${win}
Admin: ${admin}`);
  });

});

/* ================= ADMIN ================= */
app.post("/approve/:phone",async(req,res)=>{
  await User.findOneAndUpdate(
    {phone:req.params.phone},
    {status:"approved",balance:100}
  );
  res.json({ok:true});
});

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 SYSTEM FULL PRO READY");
});