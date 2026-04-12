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
.catch(err=>console.log(err));

/* ================= MODEL ================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  balance:{type:Number,default:0},
  status:{type:String,default:"pending"},
  cartela:Array
}));

/* ================= REGISTER ================= */
app.post("/register", async(req,res)=>{
  const {phone}=req.body;
  await User.findOneAndUpdate({phone},{},{upsert:true});
  res.json({ok:true});
});

/* ================= PAYMENT APPROVE ================= */
app.post("/admin/approve/:phone", async(req,res)=>{
  await User.findOneAndUpdate(
    {phone:req.params.phone},
    {status:"approved",balance:100} // give balance
  );
  res.json({ok:true});
});

/* ================= BALANCE ================= */
app.get("/balance/:phone", async(req,res)=>{
  const user=await User.findOne({phone:req.params.phone});
  res.json({balance:user?user.balance:0});
});

/* ================= REAL BINGO CARD (NO DUPLICATE) ================= */
function columnNumbers(min,max){
  let nums=[];
  while(nums.length<5){
    let n=Math.floor(Math.random()*(max-min+1))+min;
    if(!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a,b)=>a-b);
}

function generateCard(){
  const B=columnNumbers(1,15);
  const I=columnNumbers(16,30);
  const N=columnNumbers(31,45);
  const G=columnNumbers(46,60);
  const O=columnNumbers(61,75);

  let card=[];

  for(let i=0;i<5;i++){
    card.push([B[i],I[i],N[i],G[i],O[i]]);
  }

  card[2][2]="FREE";
  return card;
}

/* ================= JOIN GAME ================= */
let players=[];

app.post("/join", async(req,res)=>{
  const {phone}=req.body;

  const user=await User.findOne({phone});

  if(!user || user.status!=="approved"){
    return res.json({ok:false,msg:"Not approved"});
  }

  if(user.balance < 10){
    return res.json({ok:false,msg:"Insufficient balance"});
  }

  user.balance -= 10;
  user.cartela = generateCard();
  await user.save();

  if(!players.includes(phone)) players.push(phone);

  io.emit("players",players);

  res.json({ok:true,cartela:user.cartela,balance:user.balance});
});

/* ================= GAME ================= */
let called=[];
let interval;

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

  interval=setInterval(()=>{
    let num;

    do{
      num=Math.floor(Math.random()*75)+1;
    }while(called.includes(num));

    called.push(num);

    io.emit("number",num);
    io.emit("called",called);

  },3000);
}

io.on("connection",(socket)=>{
  socket.on("start",startCountdown);
});

/* ================= SERVER ================= */
server.listen(process.env.PORT||10000,()=>{
  console.log("🚀 FIXED BINGO RUNNING");
});