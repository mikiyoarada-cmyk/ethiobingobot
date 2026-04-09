const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== ENV =====
const TOKEN = process.env.BOT_TOKEN;
const CHANNEL = process.env.CHANNEL;
const MONGO_URI = process.env.MONGO_URI;

// ===== DB =====
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ===== MODELS =====
const Card = mongoose.model('Card', new mongoose.Schema({
  cardId: Number,
  numbers: [[Number]],
  isWinner: { type: Boolean, default: false }
}));

const Payment = mongoose.model('Payment', new mongoose.Schema({
  user: String,
  txId: String,
  amount: Number,
  status: String
}));

// ===== TELEGRAM =====
const bot = new TelegramBot(TOKEN, { polling: true });

// ===== UTILS =====
function getVoice(num) {
  return path.join(__dirname, `public/voices/B${num}.mp3`);
}
function getStartVoice() {
  return path.join(__dirname, `public/voices/start.mp3`);
}

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

// ===== CREATE 600 CARDS =====
async function createCards() {
  await Card.deleteMany({});
  let cards = [];
  for (let i = 1; i <= 600; i++) {
    cards.push({ cardId: i, numbers: generateCard() });
  }
  await Card.insertMany(cards);
  console.log("600 cards ready");
}
createCards();

// ===== GAME =====
let calledNumbers = [];
let gameRunning = false;
let interval;

// start game
async function startGame() {
  if (gameRunning) return;

  calledNumbers = [];
  gameRunning = true;

  bot.sendMessage(CHANNEL, "🎲 ጨዋታው ተጀምሯል");
  bot.sendAudio(CHANNEL, getStartVoice());

  interval = setInterval(callNumber, 3000);
}

// stop game
function stopGame() {
  gameRunning = false;
  clearInterval(interval);
  bot.sendMessage(CHANNEL, "🎉 Good Bingo");
}

// call number
async function callNumber() {
  if (!gameRunning) return;

  let num;
  do {
    num = Math.floor(Math.random() * 75) + 1;
  } while (calledNumbers.includes(num));

  calledNumbers.push(num);

  bot.sendMessage(CHANNEL, `🎯 ${num}`);
  bot.sendAudio(CHANNEL, getVoice(num));

  // check winners
  const cards = await Card.find({ isWinner: false });

  for (let c of cards) {
    for (let row of c.numbers) {
      if (row.every(n => calledNumbers.includes(n))) {
        c.isWinner = true;
        await c.save();

        bot.sendMessage(CHANNEL, `🏆 Winner Card: ${c.cardId}`);
        stopGame();
        break;
      }
    }
  }
}

// ===== API =====
app.get('/start', async (req, res) => {
  await startGame();
  res.json({ msg: "Game started" });
});

app.get('/cards', async (req, res) => {
  const cards = await Card.find();
  res.json(cards);
});

app.post('/payment', async (req, res) => {
  const { user, txId, amount } = req.body;
  await Payment.create({ user, txId, amount, status: "pending" });
  res.json({ msg: "Payment submitted" });
});

app.post('/approve/:txId', async (req, res) => {
  const p = await Payment.findOne({ txId: req.params.txId });
  if (!p) return res.json({ msg: "Not found" });
  p.status = "approved";
  await p.save();
  res.json({ msg: "Approved" });
});

// dashboard fix
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// ===== TELEGRAM COMMANDS =====
bot.onText(/\/startgame/, () => startGame());
bot.onText(/\/call/, () => callNumber());

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on " + PORT));