const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const URL = `https://api.telegram.org/bot${TOKEN}`;

// ===== DATA =====
let users = {};
let players = {};
let cards = {};
let calledNumbers = [];

function loadUsers() {
  if (fs.existsSync("users.json")) {
    users = JSON.parse(fs.readFileSync("users.json"));
  }
}
function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}
loadUsers();

// ===== MENU =====
function mainMenu(chatId) {
  return axios.post(`${URL}/sendMessage`, {
    chat_id: chatId,
    text: "🏠 Main Menu",
    reply_markup: {
      keyboard: [
        ["🎮 Join Game", "💰 Balance"],
        ["🏆 Leaderboard", "❓ Help"]
      ],
      resize_keyboard: true
    }
  });
}

// ===== CREATE CARD =====
function generateCard() {
  let nums = [];
  while (nums.length < 25) {
    let n = Math.floor(Math.random() * 75) + 1;
    if (!nums.includes(n)) nums.push(n);
  }

  let grid = [];
  for (let i = 0; i < 5; i++) {
    grid.push(nums.slice(i * 5, i * 5 + 5));
  }

  return grid;
}

// ===== FORMAT CARD =====
function formatCard(card, called) {
  let text = "🎯 Your Bingo Card:\n\n";

  for (let row of card) {
    let line = row.map(n => (called.includes(n) ? "✅" : n)).join("  ");
    text += line + "\n";
  }

  return text;
}

// ===== CHECK WIN =====
function checkWin(card, called) {
  // rows
  for (let row of card) {
    if (row.every(n => called.includes(n))) return true;
  }

  // columns
  for (let i = 0; i < 5; i++) {
    let col = card.map(r => r[i]);
    if (col.every(n => called.includes(n))) return true;
  }

  return false;
}

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// ===== WEBHOOK =====
app.post(`/${TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    let text = (message.text || "").trim();

    const username = message.from.username;
    const firstName = message.from.first_name;

    if (!users[chatId]) {
      users[chatId] = {
        balance: 0,
        name: firstName,
        username: username
      };
    }

    // ===== START =====
    if (text.startsWith("/start")) {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome to REAL Bingo!",
      });

      await mainMenu(chatId);
    }

    // ===== JOIN =====
    else if (text === "/join" || text === "🎮 Join Game") {
      players[chatId] = true;
      cards[chatId] = generateCard();

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: formatCard(cards[chatId], []),
      });

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "✅ Joined! Game will start soon...",
      });
    }

    res.sendStatus(200);
  } catch (e) {
    console.log(e);
    res.sendStatus(200);
  }
});

// ===== GAME ENGINE =====
async function runGame() {
  if (Object.keys(players).length < 2) return;

  calledNumbers = [];

  let numbers = [];
  while (numbers.length < 75) {
    let n = Math.floor(Math.random() * 75) + 1;
    if (!numbers.includes(n)) numbers.push(n);
  }

  for (let num of numbers) {
    calledNumbers.push(num);

    for (let p in players) {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: p,
        text: `🎱 Number: ${num}`,
      });

      // update card view
      await axios.post(`${URL}/sendMessage`, {
        chat_id: p,
        text: formatCard(cards[p], calledNumbers),
      });

      // check win
      if (checkWin(cards[p], calledNumbers)) {
        users[p].balance += 50;
        saveUsers();

        const user = users[p];
        const name = user.username ? "@" + user.username : user.name;

        for (let all in players) {
          await axios.post(`${URL}/sendMessage`, {
            chat_id: all,
            text: `🏆 BINGO WINNER: ${name}\n💰 +50 birr`,
          });
        }

        players = {};
        cards = {};
        return;
      }
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  players = {};
  cards = {};
}

// AUTO GAME LOOP
setInterval(runGame, 5 * 60 * 1000);

// ===== SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));