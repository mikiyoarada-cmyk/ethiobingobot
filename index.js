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
const URL = process.env.RENDER_EXTERNAL_URL; // Render gives this

// ===== MONGODB =====
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ===== TELEGRAM WEBHOOK =====
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${URL}/bot${TOKEN}`);

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ===== MODELS =====
const Card = mongoose.model('Card', new mongoose.Schema({
  cardId: Number,
  numbers: [[Number]],
  isWinner: { type: Boolean, default: false }
}));

// ===== CREATE CARDS =====
async function createCards() {
  await Card.deleteMany({});
  let cards = [];
  for (let i = 1; i <= 600; i++) {
    let card = [];
    for (let r = 0; r < 5; r++) {
      let row = [];
      for (let c = 0; c < 5; c++) {
        row.push(Math.floor(Math.random() * 75) + 1);
      }
      card.push(row);
    }
    cards.push({ cardId: i, numbers: card });
  }
  await Card.insertMany(cards);
  console.log("600 cards ready");
}
createCards();

// ===== VOICE =====
function getVoice(num) {
  return path.join(__dirname, `public/voices/B${num}.mp3`);
}
function getStartVoice() {
  return path.join(__dirname, `public/voices/start.mp3`);
}

// ===== GAME =====
let calledNumbers = [];
let gameRunning = false;
let interval;

// START GAME
async function startGame() {
  if (gameRunning) return;

  calledNumbers = [];
  gameRunning = true;

  console.log("Game started");

  // TELEGRAM START
  await bot.sendMessage(CHANNEL, "🎲 ጨዋታው ተጀምሯል");
  await bot.sendAudio(CHANNEL, getStartVoice());

  // START CALL LOOP
  interval = setInterval(callNumber, 3000);
}

// STOP GAME
function stopGame() {
  clearInterval(interval);
  gameRunning = false;
  bot.sendMessage(CHANNEL, "🎉 Good Bingo");
}

// CALL NUMBER
async function callNumber() {
  if (!gameRunning) return;

  let num;
  do {
    num = Math.floor(Math.random() * 75) + 1;
  } while (calledNumbers.includes(num));

  calledNumbers.push(num);

  console.log("Calling:", num);

  // SEND TELEGRAM
  await bot.sendMessage(CHANNEL, `🎯 ${num}`);
  await bot.sendAudio(CHANNEL, getVoice(num));

  // CHECK WINNER
  const cards = await Card.find({ isWinner: false });

  for (let c of cards) {
    for (let row of c.numbers) {
      if (row.every(n => calledNumbers.includes(n))) {
        c.isWinner = true;
        await c.save();

        await bot.sendMessage(CHANNEL, `🏆 Winner Card: ${c.cardId}`);
        stopGame();
        return;
      }
    }
  }
}

// ===== API =====
app.get('/start', async (req, res) => {
  await startGame();
  res.json({ msg: "Game started" });
});

// FIX DASHBOARD ROUTE
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// ===== SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on " + PORT));