const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = https://api.telegram.org/bot${TOKEN};

// ================= DATA (TEMP DATABASE) =================
let users = {};     // { userId: { balance: number } }
let players = [];   // current game players

// ================= HOME =================
app.get("/", (req, res) => {
  res.send("Bingo + Balance Running!");
});

// ================= BOT =================
app.post(/${TOKEN}, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || "";

    // create user if not exist
    if (!users[userId]) {
      users[userId] = { balance: 0 };
    }

    // ================= COMMANDS =================

    // START
    if (text === "/start") {
      await send(chatId, "🎉 Welcome to Beteseb Bingo!\nUse /join to play");
    }

    // BALANCE
    else if (text === "/balance") {
      await send(chatId, 💰 Balance: ${users[userId].balance} birr);
    }

    // ADMIN ADD MONEY
    else if (text.startsWith("/add")) {
      const parts = text.split(" ");
      const target = parts[1];
      const amount = parseInt(parts[2]);

      if (!users[target]) users[target] = { balance: 0 };
      users[target].balance += amount;

      await send(chatId, ✅ Added ${amount} birr);
    }

    // JOIN GAME
    else if (text === "/join") {
      if (players.includes(userId)) {
        return send(chatId, "⚠️ You already joined");
      }

      if (users[userId].balance < 5) {
        return send(chatId, "❌ Need 5 birr to join");
      }

      users[userId].balance -= 5;
      players.push(userId);

      await send(chatId, ✅ Joined game (${players.length} players));

      // START GAME IF 2+ PLAYERS
      if (players.length >= 2) {
        startGame();
      }
    }

    // DEFAULT
    else {
      await send(chatId, "Unknown command");
    }

    res.sendStatus(200);

  } catch (err) {
    console.log(err);
    res.sendStatus(200);
  }
});

// ================= GAME LOGIC =================
async function startGame() {
  console.log("Game started");

  // wait 40 seconds
  setTimeout(async () => {
    const winner = players[Math.floor(Math.random() * players.length)];

    users[winner].balance += 20;

    await send(winner, "🏆 You won 20 birr!");

    players = []; // reset game
  }, 40000);
}

// ================= SEND FUNCTION =================
async function send(chatId, text) {
  await axios.post(${TELEGRAM_API}/sendMessage, {
    chat_id: chatId,
    text: text,
  });
}

// ================= SERVER =================
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});