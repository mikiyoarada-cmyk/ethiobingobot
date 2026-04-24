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

/* ================= GAME STATE ================= */
let game = {
  phase:"waiting",
  players:{},
  selected:{},
  called:[],
  takenCards:[],
  interval:null,
  gameId:0   // 🔥 IMPORTANT: prevents old audio reuse
};

/* ================= CARDS ================= */
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

const globalCards = [...Array(600)].map(()=>generateCard());

/* ================= WIN ================= */
function isWinner(card){

  for(let r=0;r<5;r++){
    if(card[r].every(n=>n==="FREE" || game.called.includes(n))) return true;
  }

  for(let c=0;c<5;c++){
    let win=true;
    for(let r=0;r<5;r++){
      let n=card[r][c];
      if(n!=="FREE" && !game.called.includes(n)) win=false;
    }
    if(win) return true;
  }

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
      cards:globalCards
    };

    socket.emit("game_id",game.gameId); // 🔥 sync audio session
    socket.emit("cards",globalCards);
    socket.emit("phase",game.phase);
    socket.emit("called",game.called);
    socket.emit("taken",game.takenCards);
  });

  socket.on("select_cartelas",(data)=>{

    if(game.phase!=="picking") return socket.emit("msg","WAIT");

    let chosen=[];

    for(let card of data.cards){
      let str=JSON.stringify(card);

      if(game.takenCards.includes(str)){
        socket.emit("msg","ALREADY TAKEN");
        continue;
      }

      game.takenCards.push(str);
      chosen.push(card);
    }

    game.selected[data.phone]={
      ...game.players[data.phone],
      chosen
    };

    io.emit("taken",game.takenCards);
  });
});

/* ================= PICK ================= */
function startPickPhase(){

  if(Object.keys(game.players).length < 2){
    game.phase="waiting";
    io.emit("phase","waiting");
    setTimeout(startPickPhase,5000);
    return;
  }

  game.phase="picking";
  game.called=[];
  game.selected={};
  game.takenCards=[];
  game.gameId++; // 🔥 NEW GAME SESSION

  io.emit("phase","picking");
  io.emit("called",[]);
  io.emit("taken",[]);
  io.emit("game_id",game.gameId);

  let t=30;

  let timer=setInterval(()=>{

    io.emit("countdown",t);
    t--;

    if(t<0){
      clearInterval(timer);
      startGame();
    }

  },1000);
}

/* ================= GAME (SYNC FIXED AUDIO) ================= */
function startGame(){

  game.phase="playing";
  io.emit("phase","playing");

  game.interval=setInterval(()=>{

    let n;
    do{
      n=Math.floor(Math.random()*75)+1;
    }while(game.called.includes(n));

    game.called.push(n);

    // 🔥 STEP 1: send number ONLY (audio trigger)
    io.emit("number",{
      value:n,
      gameId:game.gameId,
      ts:Date.now()
    });

    // 🔥 STEP 2: update UI AFTER EXACT SAME FRAME
    setTimeout(()=>{
      io.emit("called",{
        list:game.called,
        gameId:game.gameId
      });
    },900);

    checkWinner();

  },3200);
}

/* ================= WIN ================= */
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

/* ================= END (FULL AUDIO RESET FIX) ================= */
function endGame(){

  game.phase="waiting";
  io.emit("game_end","🏆 GAME OVER");

  game.gameId++; // 🔥 KILL ALL OLD AUDIO SESSIONS

  setTimeout(()=>{

    game.called=[];
    game.takenCards=[];
    game.selected={};

    io.emit("called",{list:[],gameId:game.gameId});
    io.emit("taken",[]);
    io.emit("stop_audio",game.gameId); // 🔥 STOP ALL SOUND CLIENT SIDE

  },1200);

  setTimeout(startPickPhase,30000);
}

/* ================= AUTO START ================= */
setTimeout(startPickPhase,3000);

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 PERFECT SYNC BINGO AUDIO FIXED");
});