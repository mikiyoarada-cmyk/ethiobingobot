const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO = process.env.MONGO_URI;

// DB
mongoose.connect(MONGO)
.then(()=>console.log("Mongo connected"))
.catch(err=>console.log(err));

// ===== MODELS =====
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  txId: String,
  approved: Boolean,
  expireAt: Date
}));

const Card = mongoose.model('Card', new mongoose.Schema({
  cardId: Number,
  numbers: [[Number]]
}));

// ===== CREATE 600 CARDS =====
async function createCards() {
  if (await Card.countDocuments() > 0) return;

  let cards = [];
  for (let i = 1; i <= 600; i++) {
    let card = [];
    for (let r = 0; r < 5; r++) {
      let row = [];
      for (let c = 0; c < 5; c++) {
        row.push(Math.floor(Math.random()*75)+1);
      }
      card.push(row);
    }
    cards.push({ cardId: i, numbers: card });
  }
  await Card.insertMany(cards);
  console.log("600 cards ready");
}
createCards();

// ===== API =====

// join game
app.post('/join', async (req,res)=>{
  const { name } = req.body;
  const user = await User.create({ name, approved:false });
  res.json(user);
});

// submit payment
app.post('/pay', async (req,res)=>{
  const { userId, txId } = req.body;
  await User.findByIdAndUpdate(userId,{ txId });
  res.json({msg:"Submitted"});
});

// approve (ADMIN)
app.post('/approve/:id', async (req,res)=>{
  const expire = new Date();
  expire.setDate(expire.getDate()+30);

  await User.findByIdAndUpdate(req.params.id,{
    approved:true,
    expireAt: expire
  });

  res.json({msg:"Approved 30 days"});
});

// get cards
app.get('/cards', async (req,res)=>{
  const cards = await Card.find();
  res.json(cards);
});

// ===== SERVER =====
app.listen(10000, ()=>console.log("Running"));