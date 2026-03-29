const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// ✅ VERY IMPORTANT: ROOT PATH "/"
app.post("/", async (req, res) => {
  try {
    console.log("Incoming:", req.body);

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

      if (text.toLowerCase().includes("play")) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: "🎲 Game started!",
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.log("Error:", err.message);
    res.sendStatus(200);
  }
});

app.get("/", (req, res) => {
  res.send("Bot running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on", PORT));