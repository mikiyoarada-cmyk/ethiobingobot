const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===== SETTINGS =====
const TOKEN = process.env.BOT_TOKEN; // put in Render env
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// serve web app
app.use(express.static("public"));

// ===== WEBHOOK =====
app.post(`/${TOKEN}`, async (req, res) => {
  const message = req.body.message;

  if (message) {
    const chatId = message.chat.id;
    const text = message.text;

    // START
    if (text === "/start") {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "🎮 Welcome to Ethiopian Bingo!\nClick Play to start.",
      });
    }

    // PLAY
    if (text && text.includes("play")) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "🎲 Game started!\nNumbers coming soon...",
      });
    }
  }

  res.sendStatus(200);
});

// test
app.get("/", (req, res) => {
  res.send("Bingo + Bot Running!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running"));