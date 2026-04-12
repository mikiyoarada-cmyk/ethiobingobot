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

/* =======================
   DB
======================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(()=>console.log("MongoDB connected"))
  .catch(err=>console.log(err));

/* =======================
   USER MODEL
======================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  balance:{type:Number,default:0},
  status:{type:String,default:"pending"},
  cartela:Array
}));

/* =======================
   REGISTER
======================= */
app.post("/register", async(req,res)=>{
  const {phone}=req.body;
  let user=await User.findOne({phone});
  if(!user) user=await User.create({phone});
  res.json({ok:true});
});

/* =======================
   DEPOSIT (TXID SIM)
======================= */
app.post("/deposit", async(req,res)=>{
  const {phone,amount}=req.body;

  await User.findOneAndUpdate(
    {phone},
    { $inc:{balance:Number(amount)} },
    {upsert:true}
  );

  res.json({ok:true});
});

/* =======================
   ADMIN APPROVE
======================= */
app.post("/admin/approve/:phone", async(req,res)=>{
  await User.findOneAndUpdate(
    {phone:req.params.phone},
    {status:"approved"}
  );
  res.json({ok:true});
});

/* =======================
   CHECK BALANCE
======================= */
app.get("/balance/:phone", async(req,res)=>{
  const user=await User.findOne({phone:req.params.phone});
  res.json({balance:user?user.balance:0});
});

/* =======================
   BINGO CARD (REAL)
======================= */
function unique(min,max){
  let arr=[];
  while(arr.length<5){
    let n=Math.floor(Math.random()*(max-min+1))+min;
    if(!arr.includes(n)) arr.push(n);
  }
  return arr;
}

function generateCard(){
  const B=unique(1,15);
  const I=unique(16,30);
  const N=unique(31,45);
  const G=unique(46,60);
  const O=unique(61,75);

  let card=[];

  for(let i=0;i<5;i++){
    card.push([B[i],I[i],N[i],G[i],O[i]]);
  }

  card[2][2]="FREE";

  return card;
}

/* =======================
   JOIN GAME
======================= */
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

/* =======================
   GAME ENGINE
======================= */
let called=[];
let interval;

function checkWin(card){
  const marks=card.map(r=>r.map(n=>n==="FREE"||called.includes(n)));

  for(let r of marks) if(r.every(v=>v)) return true;

  for(let c=0;c<5;c++)
    if(marks.every(r=>r[c])) return true;

  if(marks.every((r,i)=>r[i])) return true;
  if(marks.every((r,i)=>r[4-i])) return true;

  return false;
}

async function detectWinner(){
  const users=await User.find({status:"approved"});

  for(let u of users){
    if(u.cartela && checkWin(u.cartela)){
      return u.phone;
    }
  }
  return null;
}

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

  interval=setInterval(async()=>{

    let num;
    do{
      num=Math.floor(Math.random()*75)+1;
    }while(called.includes(num));

    called.push(num);

    io.emit("number",num);
    io.emit("called",called);

    const winner=await detectWinner();

    if(winner){
      io.emit("winner",winner);
      io.emit("gameEnd","🎉 GOOD BINGO");

      clearInterval(interval);

      setTimeout(startCountdown,40000);
    }

  },3000);
}

io.on("connection",(socket)=>{
  socket.on("start",startCountdown);
});

/* =======================
   ADMIN PAGE
======================= */
app.get("/admin",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/admin.html"));
});

/* =======================
   SERVER
======================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 ULTIMATE BINGO RUNNING");
});