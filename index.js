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

/* ================= USER ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  balance:{type:Number,default:0}
}));

/* ================= GAME ROOM ================= */
let room = {
  players: {},
  cards: {},
  called: []
};

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
function startGame(){

  room.called = [];
  io.emit("start");

  const interval = setInterval(()=>{

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

    const card = room.cards[phone];
    const called = room.called;

    let flat = card.flat();

    let win = flat.every(n =>
      n === "FREE" || called.includes(n)
    );

    if(win){

      const total = 1000;
      const winAmount = total * 0.8;
      const adminCut = total * 0.2;

      const user = await User.findOne({phone});

      if(user){
        user.balance += winAmount;
        await user.save();
      }

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

  const roomId = "room1";
  socket.join(roomId);

  socket.on("join",(phone)=>{

    room.players[phone] = socket.id;
    room.cards[phone] = generateCard();

    socket.emit("card",room.cards[phone]);
  });

  socket.on("startGame",()=>{
    startGame();
  });

});

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 MULTIPLAYER READY");
});