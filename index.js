const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const URL = `https://api.telegram.org/bot${TOKEN}`;

// ===== LOAD DATABASE =====
let users = {};
if (fs.existsSync("users.json")) {
  users = JSON.parse(fs.readFileSync("users.json"));
}

// ===== SAVE FUNCTION =====
function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

// ===== GAME DATA =====
let players = {};
let numbersCalled = [];
let gameRunning = false;

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("Bingo DB Running!");
});

// ===== WEBHOOK =====
app.post(`/${TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = (message.text || "").trim();

    // create user if not exist
    if (!users[chatId]) {
      users[chatId] = { balance: 0 };
      saveUsers();
    }

    // START
    if (text === "/start") {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "🎰 Bingo Game!\n/join\n/startgame\n/balance\n/help",
      });
    }

    // BALANCE
    else if (text === "/balance") {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: `💰 Balance: ${users[chatId].balance}`,
      });
    }

    // JOIN GAME
    else if (text === "/join") {
      if (players[chatId]) {
        return await axios.post(`${URL}/sendMessage`, {
          chat_id: chatId,
          text: "✅ Already joined!",
        });
      }

      if (users[chatId].balance < 5) {
        return await axios.post(`${URL}/sendMessage`, {
          chat_id: chatId,
          text: "❌ Need 5 birr",
        });
      }

      users[chatId].balance -= 5;
      saveUsers();

      let card = [];
      while (card.length < 5) {
        let num = Math.floor(Math.random() * 20) + 1;
        if (!card.includes(num)) card.push(num);
      }

      players[chatId] = { card, matched: [] };

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: `🎟 Card:\n${card.join(", ")}`,
      });
    }

    // START GAME
    else if (text === "/startgame") {
      if (Object.keys(players).length < 2) {
        return await axios.post(`${URL}/sendMessage`, {
          chat_id: chatId,
          text: "❌ Need 2 players",
        });
      }

      gameRunning = true;
      numbersCalled = [];

      for (let p in players) {
        await axios.post(`${URL}/sendMessage`, {
          chat_id: p,
          text: "🚀 Game started!",
        });
      }

      callNumbers();
    }

    // ADMIN ADD MONEY
    else if (text.startsWith("/add") && chatId == ADMIN_ID) {
      const parts = text.split(" ");
      const userId = parts[1];
      const amount = parseInt(parts[2]);

      if (!users[userId]) users[userId] = { balance: 0 };

      users[userId].balance += amount;
      saveUsers();

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "✅ Added",
      });
    }

    else if (text === "/help") {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "/join\n/startgame\n/balance\n/help",
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(200);
  }
});

// ===== GAME LOGIC =====
async function callNumbers() {
  let interval = setInterval(async () => {
    if (!gameRunning) return clearInterval(interval);

    let num;
    do {
      num = Math.floor(Math.random() * 20) + 1;
    } while (numbersCalled.includes(num));

    numbersCalled.push(num);

    for (let p in players) {
      let player = players[p];

      if (player.card.includes(num)) {
        player.matched.push(num);
      }

      await axios.post(`${URL}/sendMessage`, {
        chat_id: p,
        text: `📢 Number: ${num}`,
      });

      // WINNER
      if (player.matched.length === player.card.length) {
        gameRunning = false;

        users[p].balance += 20;
        saveUsers();

        for (let all in players) {
          await axios.post(`${URL}/sendMessage`, {
            chat_id: all,
            text: `🏆 Winner: ${p}\n💰 +20 birr`,
          });
        }

        players = {};
        return;
      }
    }
  }, 5000);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));