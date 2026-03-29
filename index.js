const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const URL = `https://api.telegram.org/bot${TOKEN}`;

// ===== GAME DATA =====
let players = {};
let numbersCalled = [];
let gameRunning = false;

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("Bingo Winner System Running!");
});

app.post(`/${TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = (message.text || "").trim();

    // START
    if (text === "/start") {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "🎰 Bingo Game!\n/join\n/startgame\n/mycard\n/help",
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

      // generate 5 random numbers
      let card = [];
      while (card.length < 5) {
        let num = Math.floor(Math.random() * 20) + 1;
        if (!card.includes(num)) card.push(num);
      }

      players[chatId] = {
        card: card,
        matched: []
      };

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: `🎟 Your card:\n${card.join(", ")}`,
      });
    }

    // SHOW CARD
    else if (text === "/mycard") {
      if (!players[chatId]) {
        return await axios.post(`${URL}/sendMessage`, {
          chat_id: chatId,
          text: "❌ Join first with /join",
        });
      }

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: `🎟 Your card:\n${players[chatId].card.join(", ")}\n✅ Matched: ${players[chatId].matched.join(", ")}`,
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

    // HELP
    else if (text === "/help") {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "/join\n/startgame\n/mycard\n/help",
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

// ===== NUMBER CALLING =====
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

      // 🎉 CHECK WIN
      if (player.matched.length === player.card.length) {
        gameRunning = false;

        // announce winner
        for (let all in players) {
          await axios.post(`${URL}/sendMessage`, {
            chat_id: all,
            text: `🏆 WINNER: ${p}`,
          });
        }

        players = {}; // reset game
        return;
      }
    }
  }, 5000);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));