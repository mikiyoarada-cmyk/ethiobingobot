const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== ENV =====
const TOKEN = process.env.BOT_TOKEN;
const CHANNEL = process.env.CHANNEL; // MUST BE @channelname
const MONGO_URI = process.env.MONGO_URI;
const URL = process.env.RENDER_EXTERNAL_URL;

// ===== DB =====
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ===== BOT (WEBHOOK) =====
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${URL}/bot${TOKEN}`);

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ===== ROOT =====
app.get('/', (req, res) => {
  res.send("✅ Server running");
});

// ===== MODEL =====
const Card = mongoose.model('Card', new mongoose.Schema({
  cardId: Number,
  numbers: [[Number]],
  isWinner: { type: Boolean, default: false }
}));

// ===== CREATE 600 CARDS =====
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
let called = [];
let running = false;
let interval;

// START GAME
async function startGame(chatId = null) {
  if (running) return;

  called = [];
  running = true;

  console.log("GAME START");

  // SEND TO USER (TEST)
  if (chatId) {
    bot.sendMessage(chatId, "🎮 Game started!");
  }

  // SEND TO CHANNEL
  try {
    await bot.sendMessage(CHANNEL, "🎲 ጨዋታው ተጀምሯል");
    await bot.sendAudio(CHANNEL, getStartVoice());
  } catch (e) {
    console.log("CHANNEL ERROR:", e.message);
  }

  interval = setInterval(callNumber, 3000);
}

// STOP
function stopGame() {
  clearInterval(interval);
  running = false;
  bot.sendMessage(CHANNEL, "🎉 Good Bingo");
}

// CALL NUMBER
async function callNumber() {
  if (!running) return;

  let num;
  do {
    num = Math.floor(Math.random() * 75) + 1;
  } while (called.includes(num));

  called.push(num);

  console.log("CALL:", num);

  try {
    await bot.sendMessage(CHANNEL, `🎯 ${num}`);
    await bot.sendAudio(CHANNEL, getVoice(num));
  } catch (e) {
    console.log("SEND ERROR:", e.message);
  }

  // CHECK WINNER
  const cards = await Card.find({ isWinner: false });

  for (let c of cards) {
    for (let row of c.numbers) {
      if (row.every(n => called.includes(n))) {
        c.isWinner = true;
        await c.save();

        await bot.sendMessage(CHANNEL, `🏆 Winner Card: ${c.cardId}`);
        stopGame();
        return;
      }
    }
  }
}

// ===== TELEGRAM =====

// START BOT
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🤖 Bot is working!");
});

// START GAME FROM BOT
bot.onText(/\/startgame/, (msg) => {
  startGame(msg.chat.id);
});

// DEBUG MESSAGE
bot.on('message', (msg) => {
  console.log("MSG:", msg.text);
});

// ===== API =====
app.get('/start', async (req, res) => {
  await startGame();
  res.json({ msg: "Game started" });
});

// ===== SERVER =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Running on " + PORT));