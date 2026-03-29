const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// WEBHOOK (FIXED)
app.post("/", async (req, res) => {
  const msg = req.body.message;

  if (msg) {
    const chatId = msg.chat.id;
    const text = msg.text || "";

    if (text === "/start") {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "✅ Bot working!",
      });
    }

    if (text.includes("play")) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "🎲 Game started!",
      });
    }
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running"));