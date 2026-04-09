const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== ENV =====
const TOKEN = process.env.BOT_TOKEN;
const CHANNEL = process.env.CHANNEL;
const MONGO_URI = process.env.MONGO_URI;

// ===== MONGODB =====
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ===== SCHEMAS =====
const CardSchema = new mongoose.Schema({
  cardId: Number,
  numbers: [[Number]],
  owner: String,
  isWinner: { type: Boolean, default: false }
});
const Card = mongoose.model('Card', CardSchema);

const PaymentSchema = new mongoose.Schema({
  owner: String,
  transactionId: String,
  amount: Number,
  status: String // pending, approved
});
const Payment = mongoose.model('Payment', PaymentSchema);

// ===== TELEGRAM =====
const bot = new TelegramBot(TOKEN, { polling: true });

// ===== UTILITIES =====
function generateCard() {
  let card = [];
  for (let i = 0; i < 5; i++) {
    let row = [];
    for (let j = 0; j < 5; j++) {
      row.push(Math.floor(Math.random() * 75) + 1);
    }
    card.push(row);
  }
  return card;
}

function getVoice(num) {
  return path.join(__dirname, `public/voices/B${num}.mp3`);
}

// ===== CREATE 600 CARDS =====
async function createCards() {
  await Card.deleteMany({});
  let cards = [];
  for (let i = 1; i <= 600; i++) {
    cards.push(new Card({ cardId: i, numbers: generateCard(), owner: "" }));
  }
  await Card.insertMany(cards);
  console.log("600 cards created");
}
createCards();

// ===== BINGO =====
let calledNumbers = [];

async function callNumber() {
  let num;
  do {
    num = Math.floor(Math.random() * 75) + 1;
  } while (calledNumbers.includes(num));

  calledNumbers.push(num);

  // send to Telegram
  bot.sendMessage(CHANNEL, `🎯 Number: ${num}`);
  bot.sendAudio(CHANNEL, getVoice(num));

  // check winners
  const cards = await Card.find({ isWinner: false });
  for (let c of cards) {
    for (let row of c.numbers) {
      if (row.every(n => calledNumbers.includes(n))) {
        c.isWinner = true;
        await c.save();
        bot.sendMessage(CHANNEL, `🏆 Winner detected! Card ID: ${c.cardId}`);
      }
    }
  }

  return { num, calledNumbers };
}

// ===== API =====
app.get('/call', async (req, res) => {
  const data = await callNumber();
  res.json(data);
});

app.get('/cards', async (req, res) => {
  const cards = await Card.find();
  res.json(cards);
});

// ===== PAYMENT SIMULATION =====
app.post('/payment', async (req, res) => {
  const { owner, transactionId, amount } = req.body;
  const pay = new Payment({ owner, transactionId, amount, status: "pending" });
  await pay.save();
  res.json({ success: true, message: "Payment recorded, pending approval" });
});

app.post('/approve/:tx', async (req, res) => {
  const tx = req.params.tx;
  const payment = await Payment.findOne({ transactionId: tx });
  if (!payment) return res.status(404).json({ success: false });
  payment.status = "approved";
  await payment.save();
  res.json({ success: true, message: "Payment approved" });
});

// ===== DASHBOARD =====
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ===== TELEGRAM COMMANDS =====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🎲 Bingo Bot Ready!");
});

bot.onText(/\/call/, async (msg) => {
  const data = await callNumber();
  bot.sendMessage(msg.chat.id, `📢 Called: ${data.num}`);
});

// ===== SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on " + PORT));