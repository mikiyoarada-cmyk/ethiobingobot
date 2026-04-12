require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

// ================= DB =================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ================= MODELS =================
const userSchema = new mongoose.Schema({
  telegramId: { type: String, unique: true },
  balance: { type: Number, default: 0 }
});

const cartelaSchema = new mongoose.Schema({
  number: { type: Number, unique: true },
  owner: String,
  paid: { type: Boolean, default: false }
});

const gameSchema = new mongoose.Schema({
  calledNumbers: [Number]
});

const User = mongoose.model("User", userSchema);
const Cartela = mongoose.model("Cartela", cartelaSchema);
const Game = mongoose.model("Game", gameSchema);

// ================= TELEGRAM BOT =================
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN = process.env.ADMIN_CHAT_ID;

// ================= INIT GAME =================
let game;
async function initGame() {
  game = await Game.findOne();
  if (!game) game = await Game.create({ calledNumbers: [] });
}
initGame();

// ================= GENERATE 600 CARTELAS (NO DUPLICATES) =================
async function generateCartelas() {
  const count = await Cartela.countDocuments();
  if (count > 0) return;

  let used = new Set();

  let bulk = [];
  for (let i = 1; i <= 600; i++) {
    let num;
    do {
      num = Math.floor(Math.random() * 100000);
    } while (used.has(num));

    used.add(num);

    bulk.push({
      number: num,
      owner: null,
      paid: false
    });
  }

  await Cartela.insertMany(bulk);
  console.log("600 cartelas created");
}
generateCartelas();

// ================= SOCKET =================
io.on("connection", (socket) => {
  socket.emit("gameUpdate", game);
});

// ================= TELEGRAM COMMANDS =================

// request cartela
bot.onText(/\/buy/, async (msg) => {
  const chatId = msg.chat.id;

  const free = await Cartela.findOne({ owner: null });

  if (!free) return bot.sendMessage(chatId, "No cartelas available");

  bot.sendMessage(ADMIN, `APPROVE CARTELA REQUEST
User: ${chatId}
Cartela: ${free.number}`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "APPROVE", callback_data: `approve_${chatId}_${free.number}` }],
        [{ text: "REJECT", callback_data: `reject_${chatId}_${free.number}` }]
      ]
    }
  });

  bot.sendMessage(chatId, "Request sent for approval");
});

// approve/reject
bot.on("callback_query", async (q) => {
  const data = q.data;

  if (data.startsWith("approve")) {
    const [, userId, number] = data.split("_");

    await Cartela.updateOne(
      { number: Number(number) },
      { owner: userId, paid: true }
    );

    await User.updateOne(
      { telegramId: userId },
      { $inc: { balance: -10 } },
      { upsert: true }
    );

    bot.sendMessage(userId, `Approved ✔ Your cartela: ${number}`);
    bot.sendMessage(ADMIN, "Approved successfully");

  }

  if (data.startsWith("reject")) {
    const [, userId] = data.split("_");
    bot.sendMessage(userId, "Request rejected ❌");
    bot.sendMessage(ADMIN, "Rejected");
  }

  bot.answerCallbackQuery(q.id);
});

// ================= CALL NUMBER =================
app.post("/call", async (req, res) => {
  const { number } = req.body;

  if (!game.calledNumbers.includes(number)) {
    game.calledNumbers.push(number);
    await game.save();
  }

  io.emit("gameUpdate", game);

  res.json(game);
});

// ================= CHECK WINNER =================
app.get("/check/:userId", async (req, res) => {
  const cards = await Cartela.find({ owner: req.params.userId, paid: true });

  const called = game.calledNumbers;

  let winner = null;

  for (let c of cards) {
    if (called.includes(c.number)) {
      winner = c.number;
      break;
    }
  }

  res.json({ winner });
});

// ================= SERVER =================
server.listen(process.env.PORT, () => {
  console.log("Running on", process.env.PORT);
});