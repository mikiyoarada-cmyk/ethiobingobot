const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO = process.env.MONGO_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

mongoose.connect(MONGO)
.then(()=>console.log("MongoDB connected"))
.catch(err=>console.log(err));

// ===== MODELS =====
const User = mongoose.model('User', new mongoose.Schema({
  name:String,
  txId:String,
  approved:Boolean,
  expireAt:Date
}));

// ===== TELEGRAM BOT =====
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// approve command
bot.onText(/\/approve (.+)/, async (msg, match)=>{
  const userId = match[1];

  const expire = new Date();
  expire.setDate(expire.getDate()+30);

  await User.findByIdAndUpdate(userId,{
    approved:true,
    expireAt:expire
  });

  bot.sendMessage(msg.chat.id,"✅ Approved 30 days");
});

// reject
bot.onText(/\/reject (.+)/, async (msg, match)=>{
  const userId = match[1];
  await User.findByIdAndDelete(userId);
  bot.sendMessage(msg.chat.id,"❌ Rejected");
});

// ===== GAME STATE =====
let called = [];
let running = false;

// ===== SOCKET =====
io.on('connection', (socket)=>{

  socket.emit('state', { called });

  socket.on('start', ()=>{
    if(running) return;

    running = true;
    called = [];

    io.emit('start');

    let interval = setInterval(()=>{
      let num;
      do{
        num = Math.floor(Math.random()*75)+1;
      }while(called.includes(num));

      called.push(num);

      io.emit('number', num);

      if(called.length > 75){
        clearInterval(interval);
        running=false;
      }

    },3000);
  });

});

// ===== JOIN =====
app.post('/join', async (req,res)=>{
  const user = await User.create({
    name:req.body.name,
    approved:false
  });
  res.json(user);
});

// ===== PAY =====
app.post('/pay', async (req,res)=>{
  const { userId, txId } = req.body;

  await User.findByIdAndUpdate(userId,{txId});

  // send to telegram admin
  bot.sendMessage(process.env.ADMIN_CHAT_ID,
    `💰 Payment:\nUser: ${userId}\nTX: ${txId}\n\n/approve ${userId}\n/reject ${userId}`
  );

  res.json({msg:"Sent for approval"});
});

server.listen(10000, ()=>console.log("Running"));