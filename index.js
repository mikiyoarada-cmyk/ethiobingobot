require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json());

/* ================= USERS ================= */
let users = {};

/* ================= GAME ================= */
let game = {
  phase:"waiting",
  players:{},
  selected:{},
  called:[],
  takenCards:[],
  interval:null,
  gameId:0
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

/* ================= WIN CHECK ================= */
function isWinner(card){

  for(let r=0;r<5;r++){
    if(card[r].every(n=>n==="FREE" || game.called.includes(n)))
      return true;
  }

  for(let c=0;c<5;c++){
    let ok=true;
    for(let r=0;r<5;r++){
      let n=card[r][c];
      if(n!=="FREE" && !game.called.includes(n)) ok=false;
    }
    if(ok) return true;
  }

  let d1=true,d2=true;

  for(let i=0;i<5;i++){
    let a=card[i][i];
    let b=card[i][4-i];

    if(a!=="FREE" && !game.called.includes(a)) d1=false;
    if(b!=="FREE" && !game.called.includes(b)) d2=false;
  }

  return d1 || d2;
}

/* ================= SOCKET ================= */
io.on("connection",(socket)=>{

  socket.on("join",(data)=>{

    if(!users[data.phone]){
      users[data.phone]={
        phone:data.phone,
        telegramName:data.telegramName,
        paid:false,
        approved:false,
        txid:null
      };
    }

    let u = users[data.phone];

    socket.emit("payment_status",u);

    if(u.approved){
      game.players[data.phone]={
        socketId:socket.id,
        telegramName:data.telegramName,
        cards:globalCards
      };

      socket.emit("cards",globalCards);
    }

    socket.emit("phase",game.phase);
    socket.emit("called",{list:game.called,gameId:game.gameId});
  });

  /* ===== PAYMENT SUBMIT ===== */
  socket.on("pay",(data)=>{

    users[data.phone]={
      phone:data.phone,
      telegramName:data.telegramName,
      txid:data.txid,
      paid:true,
      approved:false
    };

    io.emit("admin_request",users[data.phone]);
    socket.emit("payment_status",users[data.phone]);
  });

  /* ===== ADMIN APPROVE ===== */
  socket.on("approve",(phone)=>{
    if(users[phone]){
      users[phone].approved=true;
      io.emit("payment_update",users[phone]);
    }
  });

  /* ===== ADMIN REJECT ===== */
  socket.on("reject",(phone)=>{
    if(users[phone]){
      users[phone].paid=false;
      users[phone].approved=false;
      users[phone].txid=null;
      io.emit("payment_update",users[phone]);
    }
  });

  /* ===== SELECT CARDS ===== */
  socket.on("select_cartelas",(data)=>{

    let u = users[data.phone];
    if(!u || !u.approved) return;

    if(game.phase!=="picking") return;

    let chosen=[];

    for(let card of data.cards){
      let str=JSON.stringify(card);

      if(game.takenCards.includes(str)) continue;

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

  let approvedUsers = Object.values(users).filter(u=>u.approved);

  if(approvedUsers.length < 2){
    game.phase="waiting";
    io.emit("phase","waiting");
    setTimeout(startPickPhase,3000);
    return;
  }

  game.phase="picking";
  game.called=[];
  game.selected={};
  game.takenCards=[];
  game.gameId++;

  io.emit("phase","picking");
  io.emit("called",{list:[],gameId:game.gameId});
  io.emit("taken",[]);

  let t=30;

  let timer=setInterval(()=>{

    io.emit("countdown",t);
    t--;

    if(t<0){
      clearInterval(timer);

      if(Object.keys(game.selected).length===0){
        return startPickPhase();
      }

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

    io.emit("number",{value:n,gameId:game.gameId});
    io.emit("called",{list:game.called,gameId:game.gameId});

    checkWinner();

  },3000);
}

/* ================= WINNER ================= */
function checkWinner(){

  for(let phone in game.selected){

    let p=game.selected[phone];

    for(let card of p.chosen){

      if(isWinner(card)){

        clearInterval(game.interval);

        io.emit("winner",{
          telegramName:p.telegramName,
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
  io.emit("game_end","🏆 GAME OVER");

  game.gameId++;

  setTimeout(()=>{

    game.called=[];
    game.takenCards=[];
    game.selected={};

    io.emit("called",{list:[],gameId:game.gameId});
    io.emit("taken",[]);
    io.emit("reset_board");

  },1000);

  setTimeout(startPickPhase,30000);
}

/* ================= START ================= */
setTimeout(startPickPhase,2000);

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 TELEBIRR BINGO READY");
});