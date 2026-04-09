const express = require("express");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ===============================
   ENV
================================= */
const TOKEN = process.env.TOKEN;
const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 10000;

if (!TOKEN || !MONGO_URL) {
  console.log("❌ TOKEN or MONGO_URL missing in Render env");
  process.exit(1);
}

/* ===============================
   MONGODB
================================= */
mongoose.connect(MONGO_URL)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("Mongo Error:", err.message));

/* ===============================
   MODELS
================================= */
const User = mongoose.model("User", {
  telegramId: String,
  balance: { type: Number, default: 0 }
});

const Card = mongoose.model("Card", {
  cardNumber: Number,
  grid: Array
});

/* ===============================
   TELEGRAM BOT
================================= */
const bot = new TelegramBot(TOKEN, { polling: false });

async function startBot() {
  try {
    await bot.deleteWebHook();
    await bot.startPolling({
      restart: true,
      interval: 3000
    });
    console.log("✅ EthiobingoBot Started");
  } catch (error) {
    console.log("Bot Error:", error.message);
  }
}

startBot();

/* ===============================
   /START
================================= */
bot.onText(/\/start/, async (msg) => {
  const id = msg.chat.id.toString();

  let user = await User.findOne({ telegramId: id });
  if (!user) {
    user = await User.create({ telegramId: id });
  }

  bot.sendMessage(
    id,
    `🎰 EthiobingoBot\n\nWelcome!\nOpen Game:\nhttps://YOUR-APP.onrender.com/?id=${id}`
  );
});

/* ===============================
   POLLING ERROR FIX
================================= */
bot.on("polling_error", async (error) => {
  console.log("Polling Error:", error.message);

  if (error.response && error.response.statusCode === 409) {
    console.log("⚠️ Conflict detected. Restarting in 3 sec...");

    setTimeout(async () => {
      try {
        await bot.stopPolling();
        await bot.deleteWebHook();
        await bot.startPolling({
          restart: true,
          interval: 3000
        });
        console.log("✅ Bot Restarted");
      } catch (err) {
        console.log("Restart Error:", err.message);
      }
    }, 3000);
  }
});

/* ===============================
   BINGO NUMBERS
================================= */
const letters = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75]
};

function randomNumbers(min, max, count) {
  let nums = [];
  while (nums.length < count) {
    let n = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums;
}

function generateCard() {
  return [
    randomNumbers(1, 15, 5),
    randomNumbers(16, 30, 5),
    randomNumbers(31, 45, 5),
    randomNumbers(46, 60, 5),
    randomNumbers(61, 75, 5)
  ];
}

/* ===============================
   GENERATE 600 CARTELAS
================================= */
async function create600Cards() {
  const count = await Card.countDocuments();

  if (count >= 600) {
    console.log("✅ 600 Cartelas Already Exist");
    return;
  }

  await Card.deleteMany({});

  let allCards = [];
  for (let i = 1; i <= 600; i++) {
    allCards.push({
      cardNumber: i,
      grid: generateCard()
    });
  }

  await Card.insertMany(allCards);
  console.log("✅ 600 Cartelas Created");
}

create600Cards();

/* ===============================
   NUMBER CALL SYSTEM
================================= */
let calledNumbers = [];

function getLetter(number) {
  if (number <= 15) return "B";
  if (number <= 30) return "I";
  if (number <= 45) return "N";
  if (number <= 60) return "G";
  return "O";
}

function callNextNumber() {
  if (calledNumbers.length >= 75) return null;

  let num;
  do {
    num = Math.floor(Math.random() * 75) + 1;
  } while (calledNumbers.includes(num));

  calledNumbers.push(num);

  const letter = getLetter(num);
  return {
    label: `${letter}${num}`,
    audio: `/sounds/${letter}${num}.mp3`
  };
}

/* ===============================
   ROUTES
================================= */
app.get("/", (req, res) => {
  res.send("🎰 EthiobingoBot Running");
});

/* Balance */
app.get("/balance", async (req, res) => {
  try {
    const user = await User.findOne({
      telegramId: req.query.id
    });

    res.json({
      balance: user ? user.balance : 0
    });
  } catch {
    res.json({ balance: 0 });
  }
});

/* Get all cards */
app.get("/cards", async (req, res) => {
  const cards = await Card.find().limit(600);
  res.json(cards);
});

/* Call next number every request */
app.get("/call-number", (req, res) => {
  const next = callNextNumber();

  if (!next) {
    return res.json({
      finished: true,
      message: "Game Finished"
    });
  }

  res.json(next);
});

/* Reset game */
app.get("/reset-game", (req, res) => {
  calledNumbers = [];
  res.json({
    message: "Game Reset Successful"
  });
});

/* ===============================
   ADMIN PANEL
================================= */
app.get("/admin", (req, res) => {
  res.send(`
    <h2>Ethiobingo Admin</h2>
    <form action="/add" method="POST">
      <input name="id" placeholder="User ID"/><br/><br/>
      <input name="amount" placeholder="Amount"/><br/><br/>
      <button type="submit">Add Balance</button>
    </form>
  `);
});

app.post("/add", async (req, res) => {
  const { id, amount } = req.body;

  let user = await User.findOne({
    telegramId: id
  });

  if (!user) return res.send("User not found");

  user.balance += Number(amount);
  await user.save();

  res.send("✅ Balance Added");
});

/* ===============================
   START SERVER
================================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});