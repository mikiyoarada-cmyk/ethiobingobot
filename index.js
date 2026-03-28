const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const URL = `https://api.telegram.org/bot${TOKEN}`;

// Test route
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Webhook test
app.get(`/${TOKEN}`, (req, res) => {
  res.send("Webhook is working!");
});

// Telegram webhook
app.post(`/${TOKEN}`, async (req, res) => {
  try {
    console.log("UPDATE:", req.body);

    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = (message.text || "").trim();

    // ✅ COMMANDS
    if (text.startsWith("/start")) {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome to Ethiopian Bingo Bot!",
      });
    }

    else if (text.startsWith("/balance")) {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "💰 Your balance is 0 birr",
      });
    }

    else if (text.startsWith("/invite")) {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "📨 Invite friends and earn rewards!",
      });
    }

    else if (text.startsWith("/help")) {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "📖 Commands:\n/start\n/balance\n/invite\n/help",
      });
    }

    else {
      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "❓ Unknown command. Type /help",
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));