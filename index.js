require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ================= DB ================= */
mongoose.connect(process.env.MONGODB_URI)
.then(()=>console.log("MongoDB connected"))
.catch(console.log);

/* ================= USER ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  status:{type:String,default:"approved"}
}));

/* ================= GAME STATE ================= */
let game = {
  phase:"waiting", // waiting | countdown | playing | ended
  countdown:30,
  players:{},
  called:[],
  selectedCards:{},
  round:1,
  interval:null
};

/* ================= CARD GENERATOR ================= */
function generateCard(){
  function u(min,max){
    let arr=[];
    while(arr.length<5){
      let n=Math.floor(Math.random()*(max-min+1))+min;
      if(!arr.includes(n)) arr.push(n);
    }
    return arr.sort((a,b)=>a-b);
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

/* ================= SOCKET ================= */
io.on("connection",(socket)=>{

  /* JOIN PLAYER */
  socket.on("join",({phone})=>{

    game.players[phone]={
      socketId:socket.id,
      card:generateCard()
    };

    socket.emit("card",game.players[phone].card);
  });

  /* SELECT CARTELA BEFORE GAME */
  socket.on("select_cartela",(phone)=>{
    if(game.phase!=="waiting"){
      return socket.emit("wait","Game already started");
    }

    game.selectedCards[phone]=game.players[phone]?.card;
    socket.emit("selected","ok");
  });

  /* START GAME MANUAL TRIGGER */
  socket.on("start",()=>{
    if(game.phase==="waiting"){
      startCountdown();
    }
  });
});

/* ================= COUNTDOWN ================= */
function startCountdown(){

  game.phase="countdown";
  game.countdown=30;
  game.called=[];

  io.emit("phase","countdown");

  let cd=setInterval(()=>{

    game.countdown--;
    io.emit("countdown",game.countdown);

    if(game.countdown<=0){
      clearInterval(cd);
      startGame();
    }

  },1000);
}

/* ================= GAME LOOP ================= */
function startGame(){

  game.phase="playing";
  io.emit("phase","playing");

  game.interval=setInterval(()=>{

    let num;
    do{
      num=Math.floor(Math.random()*75)+1;
    }while(game.called.includes(num));

    game.called.push(num);

    io.emit("number",num);
    io.emit("called",game.called);

    checkWinner();

    if(game.called.length>=75){
      clearInterval(game.interval);
      endGame();
    }

  },2500);
}

/* ================= WIN CHECK ================= */
function checkWinner(){

  for(let phone in game.selectedCards){

    const card = game.selectedCards[phone];
    if(!card) continue;

    const win = card.flat().every(n =>
      n==="FREE" || game.called.includes(n)
    );

    if(win){

      io.emit("winner",{
        phone,
        msg:"GOOD BINGO 🎉"
      });

      endGame();
      return;
    }
  }
}

/* ================= END GAME ================= */
function endGame(){

  game.phase="ended";

  io.emit("game_end","GOOD BINGO 🎉");

  setTimeout(()=>{

    game.round++;
    game.players={};
    game.selectedCards={};

    startCountdown();

  },5000);
}

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🔥 MULTIPLAYER BINGO FIXED READY");
});