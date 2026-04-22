require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
.then(()=>console.log("MongoDB connected"))
.catch(console.log);

/* ================= GAME ================= */
let game = {
  phase:"waiting",
  players:{},
  selected:{},
  called:[],
  interval:null
};

/* ================= CARD ================= */
function generateCard(){
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

/* ================= ONE LINE WIN ================= */
function isWinner(card){

  // rows
  for(let r=0;r<5;r++){
    if(card[r].every(n=>n==="FREE" || game.called.includes(n))) return true;
  }

  // columns
  for(let c=0;c<5;c++){
    let win=true;
    for(let r=0;r<5;r++){
      let n=card[r][c];
      if(n!=="FREE" && !game.called.includes(n)) win=false;
    }
    if(win) return true;
  }

  // diagonals
  if([0,1,2,3,4].every(i=>{
    let n=card[i][i];
    return n==="FREE" || game.called.includes(n);
  })) return true;

  if([0,1,2,3,4].every(i=>{
    let n=card[i][4-i];
    return n==="FREE" || game.called.includes(n);
  })) return true;

  return false;
}

/* ================= SOCKET ================= */
io.on("connection",(socket)=>{

  socket.on("join",(data)=>{

    game.players[data.phone]={
      socketId:socket.id,
      telegramName:data.telegramName,
      cards:[...Array(600)].map(()=>generateCard())
    };

    socket.emit("cards",game.players[data.phone].cards);
    socket.emit("phase",game.phase);
  });

  socket.on("select_cartelas",(data)=>{

    if(game.phase!=="picking"){
      return socket.emit("msg","WAIT FOR NEXT GAME");
    }

    game.selected[data.phone]={
      ...game.players[data.phone],
      chosen:data.cards
    };
  });
});

/* ================= PICK ================= */
function startPickPhase(){

  game.phase="picking";
  game.called=[];
  game.selected={};

  io.emit("phase","picking");
  io.emit("called",[]);

  let t=30;

  let timer=setInterval(()=>{
    io.emit("countdown",t);
    t--;

    if(t < 0){
      clearInterval(timer);
      startGame();
    }
  },1000);
}

/* ================= GAME ================= */
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

  },3000);
}

/* ================= WINNER ================= */
function checkWinner(){

  for(let phone in game.selected){

    const player=game.selected[phone];

    for(let card of player.chosen){

      if(isWinner(card)){

        clearInterval(game.interval);

        io.emit("winner",{
          telegramName:player.telegramName,
          card
        });

        endGame();
        return;
      }
    }
  }
}

/* ================= END ================= */
function endGame(){

  game.phase="waiting";

  io.emit("game_end","🏆 GOOD BINGO");

  setTimeout(startPickPhase,30000); // auto next game
}

/* ================= AUTO START ================= */
setTimeout(startPickPhase,3000);

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 FINAL AUTO BINGO READY");
});