require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* ================= FIX STATIC ================= */
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ================= FORCE GAME ROUTE ================= */
app.get("/game.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

/* ================= DB ================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* ================= BOT ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN);

/* WEBHOOK */
app.post("/bot", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= BOT TEST ================= */
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🤖 Bot is working!");
});

/* ================= CALLBACK FIX ================= */
bot.on("callback_query", async (q) => {
  try {
    const [action, phone] = (q.data || "").split(":");

    await bot.answerCallbackQuery(q.id).catch(()=>{});

    if (action === "approve") {
      await bot.sendMessage(process.env.ADMIN_ID, "✅ Approved " + phone);
    }

    if (action === "reject") {
      await bot.sendMessage(process.env.ADMIN_ID, "❌ Rejected " + phone);
    }

  } catch (e) {}
});

/* ================= USER ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone: String,
  status: { type: String, default: "pending" },
  balance: { type: Number, default: 100 },
  cartela: Array
}));

/* ================= CARTELA ================= */
let players = [];
let playerCards = {};
let called = [];

function unique(min,max){
  let s=new Set();
  while(s.size<5){
    s.add(Math.floor(Math.random()*(max-min+1))+min);
  }
  return [...s];
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

/* ================= WIN CHECK ================= */
function isWinner(card,called){
  const hit=n=>n==="FREE"||called.includes(n);

  for(let r=0;r<5;r++){
    if(card[r].every(hit)) return true;
  }

  for(let c=0;c<5;c++){
    if([0,1,2,3,4].every(r=>hit(card[r][c]))) return true;
  }

  return card.flat().every(hit);
}

/* ================= JOIN ================= */
app.post("/join", async(req,res)=>{
  const {phone}=req.body;

  let user=await User.findOne({phone});
  if(!user){
    user=await User.create({phone});
  }

  if(user.balance<10){
    return res.json({ok:false,msg:"Insufficient balance"});
  }

  if(!playerCards[phone]){
    playerCards[phone]=generateCard();
  }

  user.balance-=10;
  user.cartela=playerCards[phone];
  await user.save();

  if(!players.includes(phone)) players.push(phone);

  res.json({ok:true,cartela:user.cartela,balance:user.balance});
});

/* ================= GAME ================= */
function startGame(){
  called=[];
  io.emit("start");

  const interval=setInterval(async()=>{

    let num;
    do{
      num=Math.floor(Math.random()*75)+1;
    }while(called.includes(num));

    called.push(num);

    io.emit("number",num);
    io.emit("called",called);

    for(let phone of players){
      const user=await User.findOne({phone});
      if(!user||!user.cartela) continue;

      if(isWinner(user.cartela,called)){
        clearInterval(interval);

        const total=players.length*10;
        const win=Math.floor(total*0.8);

        await User.findOneAndUpdate(
          {phone},
          {$inc:{balance:win}}
        );

        io.emit("winner",{phone,win});
        io.emit("message","🎉 GOOD BINGO!");

        setTimeout(startGame,5000);
        return;
      }
    }

  },3000);
}

/* ================= COUNTDOWN ================= */
function countdown(){
  let t=20;
  io.emit("countdown",t);

  const timer=setInterval(()=>{
    t--;
    io.emit("countdown",t);

    if(t<=0){
      clearInterval(timer);
      startGame();
    }
  },1000);
}

io.on("connection",(socket)=>{
  socket.on("start",countdown);
});

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 FULL SYSTEM RUNNING");
});