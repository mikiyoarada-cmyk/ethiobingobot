const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.BOT_TOKEN;
const URL = `https://api.telegram.org/bot${TOKEN}`;

let users = {};
let game = {
  players: [],
  numbers: [],
  current: null,
  started: false
};

// 🔹 Generate bingo card (1–75 random)
function generateCard() {
  let nums = [];
  while (nums.length < 25) {
    let n = Math.floor(Math.random() * 75) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums;
}

// 🔹 Send message
async function send(chatId, text) {
  await axios.post(`${URL}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

// 🔹 Start game every 40 seconds
setInterval(() => {
  if (game.players.length > 0 && !game.started) {
    game.started = true;
    game.numbers = [];
    sendAll("🚀 Game started!");

    let interval = setInterval(() => {
      let num = Math.floor(Math.random() * 75) + 1;

      if (!game.numbers.includes(num)) {
        game.numbers.push(num);
        sendAll(`📢 Number: ${num}`);

        checkWinner(num);

        if (game.numbers.length > 75) {
          clearInterval(interval);
          game.started = false;
          game.players = [];
        }
      }
    }, 3000); // every 3 sec number
  }
}, 40000);

// 🔹 Send to all players
function sendAll(text) {
  game.players.forEach(id => send(id, text));
}

// 🔹 Check winner
function checkWinner(num) {
  game.players.forEach(id => {
    let card = users[id].card;
    let hits = card.filter(n => game.numbers.includes(n));

    if (hits.length >= 5) {
      sendAll(`🏆 Winner: ${id}`);
      game.started = false;
      game.players = [];
    }
  });
}

// 🔹 Telegram webhook
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!users[chatId]) {
    users[chatId] = { balance: 100, card: [] };
  }

  // 🔹 Commands
  if (text === "/start") {
    send(chatId, "🎉 Welcome to Ethiopian Bingo!\nUse /play to join game");
  }

  else if (text === "/balance") {
    send(chatId, `💰 Balance: ${users[chatId].balance}`);
  }

  else if (text === "/play") {
    if (users[chatId].balance < 10) {
      send(chatId, "❌ Not enough balance");
      return;
    }

    users[chatId].balance -= 10;
    users[chatId].card = generateCard();

    if (!game.players.includes(chatId)) {
      game.players.push(chatId);
    }

    send(chatId, "🎮 Joined game!\nWait for start...");
  }

  else if (text === "/deposit") {
    send(chatId, "📲 Send Telebirr to: 09XXXXXXXX\nThen send screenshot");
  }

  res.sendStatus(200);
});

// 🔹 Home
app.get("/", (req, res) => {
  res.send("Bot running...");
});

// 🔹 Start server
app.listen(3000, () => {
  console.log("Server running...");
});