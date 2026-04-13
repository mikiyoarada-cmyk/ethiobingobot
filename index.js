require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ================= DB ================= */
mongoose.connect(process.env.MONGODB_URI)
.then(()=>console.log("MongoDB connected"))
.catch(console.log);

/* ================= GAME ================= */
let game = {
  phase:"waiting",
  countdown:30,
  players:{},
  selected:{},
  called:[],
  interval:null
};

/* ================= CARD ================= */
function card(){
  function r(min,max){
    let a=[];
    while(a.length<5){
      let n=Math.floor(Math.random()*(max-min+1))+min;
      if(!a.includes(n)) a.push(n);
    }
    return a.sort((a,b)=>a-b);
  }

  const B=r(1,15),I=r(16,30),N=r(31,45),G=r(46,60),O=r(61,75);

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

  socket.on("join",(phone)=>{

    game.players[phone]={
      socketId:socket.id,
      card:card()
    };

    socket.emit("card",game.players[phone].card);
  });

  socket.on("select_cartela",(phone)=>{

    if(game.phase!=="waiting"){
      return socket.emit("msg","Wait next round");
    }

    game.selected[phone]=game.players[phone]?.card;

    socket.emit("selected",true);
  });
});

/* ================= FIXED 30 SECOND START ================= */
function startCountdown(){

  game.phase="countdown";
  game.called=[];
  game.selected={};

  let t=30; // 🔥 FIXED 30 seconds

  io.emit("phase","countdown");

  let cd=setInterval(()=>{

    t--;
    io.emit("countdown",t);

    if(t<=0){
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

    let n;
    do{
      n=Math.floor(Math.random()*75)+1;
    }while(game.called.includes(n));

    game.called.push(n);

    io.emit("number",n);
    io.emit("called",game.called);

    checkWinner();

    if(game.called.length>=75){
      clearInterval(game.interval);
      endGame();
    }

  },2500);
}

/* ================= WINNER FIXED ================= */
function checkWinner(){

  for(let phone in game.selected){

    const card = game.selected[phone];
    if(!card) continue;

    const win = card.flat().every(n =>
      n==="FREE" || game.called.includes(n)
    );

    if(win){

      io.emit("winner",{
        phone,
        msg:"GOOD BINGO 🎉"
      });

      clearInterval(game.interval);
      endGame();
      return;
    }
  }
}

/* ================= END + AUTO RESTART ================= */
function endGame(){

  game.phase="ended";

  io.emit("game_end","GOOD BINGO 🎉");

  setTimeout(()=>{

    game.players={};
    game.selected={};
    game.called=[];

    startCountdown(); // 🔥 AUTO LOOP

  },5000);
}

/* ================= START SYSTEM ================= */
setTimeout(startCountdown,2000);

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🔥 STABLE 30s BINGO RUNNING");
});