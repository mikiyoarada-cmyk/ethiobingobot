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

// Telegram webhook
app.post(`/${TOKEN}`, async (req, res) => {
  console.log("UPDATE:", req.body);

  if (req.body.message) {
    const chatId = req.body.message.chat.id;
    const text = req.body.message.text;

    await axios.post(`${URL}/sendMessage`, {
      chat_id: chatId,
      text: "You said: " + text,
    });
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));