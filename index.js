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
const URL = process.env.RENDER_EXTERNAL_URL;

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

// ===== ROOT FIX (NO MORE ERROR) =====
app.get('/', (req, res) => {
  res.send("✅ Bingo server is running");
});

// ===== MODEL =====
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

// ===== VOICES =====
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

async function startGame() {
  if (gameRunning) return;

  calledNumbers = [];
  gameRunning = true;

  console.log("GAME STARTED");

  await bot.sendMessage(CHANNEL, "🎲 ጨዋታው ተጀምሯል");
  await bot.sendAudio(CHANNEL, getStartVoice());

  interval = setInterval(callNumber, 3000);
}

function stopGame() {
  clearInterval(interval);
  gameRunning = false;
  bot.sendMessage(CHANNEL, "🎉 Good Bingo");
}

async function callNumber() {
  if (!gameRunning) return;

  let num;
  do {
    num = Math.floor(Math.random() * 75) + 1;
  } while (calledNumbers.includes(num));

  calledNumbers.push(num);

  console.log("CALL:", num);

  await bot.sendMessage(CHANNEL, `🎯 ${num}`);
  await bot.sendAudio(CHANNEL, getVoice(num));

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

// ===== TELEGRAM COMMANDS =====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🤖 Bot is working!");
});

bot.onText(/\/startgame/, () => {
  startGame();
});

// ===== SERVER =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Running on " + PORT));