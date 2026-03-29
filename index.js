const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const ADMIN_ID = process.env.ADMIN_ID; // put your telegram ID in Render
const URL = `https://api.telegram.org/bot${TOKEN}`;

// ===== GAME DATA =====
let players = {};
let balances = {};
let numbersCalled = [];
let gameRunning = false;

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("Bingo + Balance Running!");
});

app.post(`/${TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = (message.text || "").trim();

    // create balance if not exist
    if (!balances[chatId]) balances[chatId] = 0;

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
        text: `💰 Your balance: ${balances[chatId]}`,
      });
    }

    // JOIN
    else if (text === "/join") {
      if (players[chatId]) {
        return await axios.post(`${URL}/sendMessage`, {
          chat_id: chatId,
          text: "✅ Already joined!",
        });
      }

      // 🎟 OPTIONAL: cost to join
      if (balances[chatId] < 5) {
        return await axios.post(`${URL}/sendMessage`, {
          chat_id: chatId,
          text: "❌ Need 5 birr to join",
        });
      }

      balances[chatId] -= 5;

      let card = [];
      while (card.length < 5) {
        let num = Math.floor(Math.random() * 20) + 1;
        if (!card.includes(num)) card.push(num);
      }

      players[chatId] = { card, matched: [] };

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: `🎟 Your card:\n${card.join(", ")}`,
      });
    }

    // START GAME
    else if (text === "/startgame") {
      if (Object.keys(players).length < 2) {
        return await axios.post(`${URL}/sendMessage`, {
          chat_id: chatId,
          text: "❌ Need at least 2 players!",
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

      if (!balances[userId]) balances[userId] = 0;
      balances[userId] += amount;

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "✅ Money added",
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
    console.error(err);
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

        // 💰 GIVE REWARD
        balances[p] += 20;

        for (let all in players) {
          await axios.post(`${URL}/sendMessage`, {
            chat_id: all,
            text: `🏆 WINNER: ${p}\n💰 Won 20 birr!`,
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