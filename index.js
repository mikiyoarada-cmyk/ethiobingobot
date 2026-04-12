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

/* =======================
   DB
======================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(()=>console.log("Mongo connected"))
  .catch(err=>console.log(err));

/* =======================
   TELEGRAM BOT
======================= */
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

app.post(`/bot${process.env.BOT_TOKEN}`, (req,res)=>{
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* =======================
   USER MODEL
======================= */
const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  status:{ type:String, default:"pending"},
  txid:String,
  cartela:Array,
  room:String
}));

/* =======================
   REGISTER
======================= */
app.post("/register", async(req,res)=>{
  const {phone} = req.body;
  await User.findOneAndUpdate({phone},{},{upsert:true});
  res.json({ok:true});
});

/* =======================
   PAYMENT (TXID)
======================= */
app.post("/pay", async(req,res)=>{
  const {phone,txid} = req.body;

  await User.findOneAndUpdate({phone},{txid,status:"pending"});

  // send to telegram admin
  bot.sendMessage(process.env.ADMIN_ID,
    `💰 Payment Request\nPhone: ${phone}\nTXID: ${txid}`,
    {
      reply_markup:{
        inline_keyboard:[
          [
            {text:"✅ Approve",callback_data:`approve_${phone}`},
            {text:"❌ Reject",callback_data:`reject_${phone}`}
          ]
        ]
      }
    }
  );

  res.json({ok:true});
});

/* =======================
   TELEGRAM APPROVE BUTTON
======================= */
bot.on("callback_query", async(q)=>{
  const data = q.data;
  const phone = data.split("_")[1];

  if(data.startsWith("approve")){
    await User.findOneAndUpdate({phone},{status:"approved"});
    bot.sendMessage(q.message.chat.id,`✅ Approved: ${phone}`);
  }

  if(data.startsWith("reject")){
    await User.findOneAndUpdate({phone},{status:"rejected"});
    bot.sendMessage(q.message.chat.id,`❌ Rejected: ${phone}`);
  }
});

/* =======================
   BINGO CARD (FIXED)
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
   PRIVATE ROOMS
======================= */
let rooms={};

app.post("/join", async(req,res)=>{
  const {phone,room} = req.body;

  const user = await User.findOne({phone});

  if(!user || user.status!=="approved"){
    return res.json({ok:false});
  }

  user.cartela = generateCard();
  user.room = room;
  await user.save();

  if(!rooms[room]) rooms[room]=[];

  if(!rooms[room].includes(phone)){
    rooms[room].push(phone);
  }

  res.json({ok:true,cartela:user.cartela});
});

/* =======================
   GAME ENGINE
======================= */
let called=[];
let interval;

function startGame(room){

  called=[];
  io.to(room).emit("start");

  interval=setInterval(async()=>{

    let num;
    do{
      num=Math.floor(Math.random()*75)+1;
    }while(called.includes(num));

    called.push(num);

    io.to(room).emit("number",num);
    io.to(room).emit("called",called);

  },3000);
}

io.on("connection",(socket)=>{

  socket.on("joinRoom",(room)=>{
    socket.join(room);
  });

  socket.on("start",(room)=>{
    let t=40;

    let cd=setInterval(()=>{
      socket.to(room).emit("countdown",t);
      t--;

      if(t<=0){
        clearInterval(cd);
        startGame(room);
      }
    },1000);
  });

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
  console.log("🚀 FINAL PRO SYSTEM RUNNING");
});