const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.static("public"));

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===================== GAME STATE =====================
let calledNumbers = [];
let interval = null;

let users = {}; 
// { telegramId: { paid: true, card: [], socketId } }

let cards = []; // 600 cards pool

// ===================== GENERATE BINGO CARDS =====================
function generateCard() {
  const card = [];
  const used = new Set();

  while (card.length < 25) {
    const num = Math.floor(Math.random() * 75) + 1;
    if (!used.has(num)) {
      used.add(num);
      card.push(num);
    }
  }
  return card;
}

function generate600Cards() {
  cards = [];
  for (let i = 0; i < 600; i++) {
    cards.push(generateCard());
  }
}

generate600Cards();

// ===================== NUMBER CALLER =====================
function startCaller() {
  if (interval) return;

  interval = setInterval(() => {
    let num;
    do {
      num = Math.floor(Math.random() * 75) + 1;
    } while (calledNumbers.includes(num));

    calledNumbers.push(num);

    io.emit("numberCalled", {
      number: num,
      calledNumbers
    });

    checkWinners();
  }, 3000); // 🔊 every 3 seconds
}

// ===================== WIN CHECK =====================
function checkWin(card) {
  const grid = [
    card.slice(0, 5),
    card.slice(5, 10),
    card.slice(10, 15),
    card.slice(15, 20),
    card.slice(20, 25),
  ];

  // row win
  for (let row of grid) {
    if (row.every(n => calledNumbers.includes(n))) return true;
  }

  // column win
  for (let c = 0; c < 5; c++) {
    let col = [];
    for (let r = 0; r < 5; r++) {
      col.push(grid[r][c]);
    }
    if (col.every(n => calledNumbers.includes(n))) return true;
  }

  return false;
}

function checkWinners() {
  for (let id in users) {
    const user = users[id];
    if (user.paid && user.card && checkWin(user.card)) {
      io.emit("winner", {
        userId: id,
        card: user.card
      });

      bot.sendMessage(id, "🏆 YOU WIN THE BINGO!");
      clearInterval(interval);
      interval = null;
    }
  }
}

// ===================== SOCKET =====================
io.on("connection", (socket) => {
  socket.emit("init", { calledNumbers });

  socket.on("register", ({ telegramId }) => {
    if (!users[telegramId]) {
      const card = cards.pop();
      users[telegramId] = {
        paid: false,
        card,
        socketId: socket.id
      };
    }

    socket.emit("card", users[telegramId].card);
  });
});

// ===================== TELEGRAM BOT =====================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 
`🎱 Bingo Game Started!

💰 Pay to join:
Once approved you can play.

Use /pay to request approval`);
});

bot.onText(/\/pay/, (msg) => {
  const id = msg.chat.id;

  bot.sendMessage(ADMIN_ID,
    `💰 PAYMENT REQUEST\nUser: ${id}\nApprove: /approve ${id}`
  );

  bot.sendMessage(id, "⏳ Waiting for approval...");
});

bot.onText(/\/approve (.+)/, (msg, match) => {
  if (msg.chat.id != ADMIN_ID) return;

  const id = match[1];
  if (!users[id]) users[id] = {};

  users[id].paid = true;

  bot.sendMessage(id, "✅ Payment approved! You can now play.");
});

// ===================== START =====================
server.listen(process.env.PORT, () => {
  console.log("🚀 Server running on port", process.env.PORT);
  startCaller();
});