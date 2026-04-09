const express = require("express");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* =================================
   DEBUG ENV CHECK
================================= */
console.log("========== ENV DEBUG ==========");
console.log("TOKEN =", process.env.TOKEN ? "FOUND ✅" : "MISSING ❌");
console.log("MONGO_URL =", process.env.MONGO_URL ? "FOUND ✅" : "MISSING ❌");
console.log("PORT =", process.env.PORT || 10000);
console.log("================================");

const TOKEN = process.env.TOKEN;
const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 10000;

/* =================================
   DO NOT STOP APP IF ENV MISSING
================================= */
if (!TOKEN) {
  console.log("❌ TOKEN missing in Render Environment");
}

if (!MONGO_URL) {
  console.log("❌ MONGO_URL missing in Render Environment");
}

/* =================================
   MONGODB CONNECT ONLY IF EXISTS
================================= */
if (MONGO_URL) {
  mongoose.connect(MONGO_URL)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("Mongo Error:", err.message));
}

/* =================================
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

/* =================================
   TELEGRAM BOT START ONLY IF TOKEN EXISTS
================================= */
let bot = null;

if (TOKEN) {
  bot = new TelegramBot(TOKEN, { polling: false });

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

  bot.on("polling_error", async (error) => {
    console.log("Polling Error:", error.message);
  });
}

/* =================================
   GENERATE BINGO CARD
================================= */
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

/* =================================
   CREATE 600 CARDS
================================= */
async function create600Cards() {
  if (!MONGO_URL) return;

  const count = await Card.countDocuments();

  if (count >= 600) {
    console.log("✅ 600 Cartelas Already Exist");
    return;
  }

  await Card.deleteMany({});

  let cards = [];
  for (let i = 1; i <= 600; i++) {
    cards.push({
      cardNumber: i,
      grid: generateCard()
    });
  }

  await Card.insertMany(cards);
  console.log("✅ 600 Cartelas Created");
}

setTimeout(() => {
  create600Cards();
}, 3000);

/* =================================
   BINGO CALL SYSTEM
================================= */
let calledNumbers = [];

function getLetter(num) {
  if (num <= 15) return "B";
  if (num <= 30) return "I";
  if (num <= 45) return "N";
  if (num <= 60) return "G";
  return "O";
}

function callNextNumber() {
  if (calledNumbers.length >= 75) {
    return null;
  }

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

/* =================================
   ROUTES
================================= */
app.get("/", (req, res) => {
  res.send("🎰 EthiobingoBot Running Successfully");
});

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

app.get("/cards", async (req, res) => {
  const cards = await Card.find().limit(600);
  res.json(cards);
});

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

app.get("/reset-game", (req, res) => {
  calledNumbers = [];
  res.json({
    message: "Game Reset Successful"
  });
});

/* =================================
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

/* =================================
   START SERVER
================================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});