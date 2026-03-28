const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const URL = `https://api.telegram.org/bot${TOKEN}`;

// ===== GAME DATA =====
let players = [];
let numbersCalled = [];
let gameRunning = false;

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("Multiplayer Bingo Running!");
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
        text: "🎰 Multiplayer Bingo!\nCommands:\n/join\n/startgame\n/help",
      });
    }

    // JOIN GAME
    else if (text === "/join") {
      if (players.includes(chatId)) {
        await axios.post(`${URL}/sendMessage`, {
          chat_id: chatId,
          text: "✅ You already joined!",
        });
      } else {
        players.push(chatId);
        await axios.post(`${URL}/sendMessage`, {
          chat_id: chatId,
          text: "🎟 You joined the bingo game!",
        });
      }
    }

    // START GAME (ADMIN = first player)
    else if (text === "/startgame") {
      if (players.length < 2) {
        return await axios.post(`${URL}/sendMessage`, {
          chat_id: chatId,
          text: "❌ Need at least 2 players!",
        });
      }

      gameRunning = true;
      numbersCalled = [];

      // send start message
      for (let p of players) {
        await axios.post(`${URL}/sendMessage`, {
          chat_id: p,
          text: "🚀 Game started! Numbers coming...",
        });
      }

      // start calling numbers
      callNumbers();
    }

    // HELP
    else if (text === "/help") {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "/join - join game\n/startgame - start\n/help",
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

// ===== NUMBER CALLING FUNCTION =====
async function callNumbers() {
  let interval = setInterval(async () => {
    if (!gameRunning) return clearInterval(interval);

    if (numbersCalled.length >= 20) {
      gameRunning = false;
      return;
    }

    let num;
    do {
      num = Math.floor(Math.random() * 20) + 1;
    } while (numbersCalled.includes(num));

    numbersCalled.push(num);

    for (let p of players) {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: p,
        text: `📢 Number: ${num}`,
      });
    }
  }, 5000); // every 5 sec
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));