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
  phase:"waiting",
  countdown:30,
  players:{},
  selected:{},
  called:[],
  interval:null,
  round:1
};

/* ================= CARD ================= */
function generateCard(){
  function range(min,max){
    let arr=[];
    while(arr.length<5){
      let n=Math.floor(Math.random()*(max-min+1))+min;
      if(!arr.includes(n)) arr.push(n);
    }
    return arr.sort((a,b)=>a-b);
  }

  const B=range(1,15);
  const I=range(16,30);
  const N=range(31,45);
  const G=range(46,60);
  const O=range(61,75);

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

  console.log("User connected:",socket.id);

  /* JOIN */
  socket.on("join",({phone})=>{

    const card = generateCard();

    game.players[phone]={
      socketId:socket.id,
      card
    };

    socket.emit("card",card);
  });

  /* SELECT CARTELA */
  socket.on("select_cartela",(phone)=>{

    if(game.phase!=="waiting"){
      return socket.emit("msg","Game already started");
    }

    game.selected[phone]=game.players[phone]?.card;

    socket.emit("selected",true);
  });

  /* START GAME */
  socket.on("start",()=>{
    if(game.phase==="waiting"){
      startCountdown();
    }
  });

  socket.on("disconnect",()=>{
    console.log("Disconnected:",socket.id);
  });
});

/* ================= COUNTDOWN ================= */
function startCountdown(){

  game.phase="countdown";
  game.called=[];
  game.selected={};

  let t=30;

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

      console.log("WINNER:",phone);

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
    game.selected={};
    game.called=[];

    startCountdown();

  },5000);
}

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🔥 STABLE BINGO SYSTEM RUNNING");
});