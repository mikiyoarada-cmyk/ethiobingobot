const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const URL = `https://api.telegram.org/bot${TOKEN}`;

// Home
app.get("/", (req, res) => {
  res.send("Bingo Bot Running!");
});

// Webhook check
app.get(`/${TOKEN}`, (req, res) => {
  res.send("Webhook OK");
});

// Telegram webhook
app.post(`/${TOKEN}`, async (req, res) => {
  try {
    console.log(req.body);

    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = (message.text || "").trim();

    // 🎮 START
    if (text === "/start") {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "🎰 Welcome to Bingo Bot!\nType /play to play.",
      });
    }

    // 🎰 PLAY GAME
    else if (text === "/play") {
      const userNumber = Math.floor(Math.random() * 10) + 1;
      const botNumber = Math.floor(Math.random() * 10) + 1;

      let result = `🎲 Your number: ${userNumber}\n🤖 Bot number: ${botNumber}\n\n`;

      if (userNumber === botNumber) {
        result += "🎉 YOU WIN!";
      } else {
        result += "❌ You lost. Try again!";
      }

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: result,
      });
    }

    // HELP
    else if (text === "/help") {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "Commands:\n/start\n/play\n/help",
      });
    }

    else {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "❓ Unknown command. Type /help",
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));