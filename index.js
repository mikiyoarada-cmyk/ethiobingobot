const express = require("express");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// =============================
// ENV
// =============================
const TOKEN = process.env.TOKEN;
const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 10000;

// =============================
// CHECK ENV
// =============================
if (!TOKEN) {
  console.log("❌ TOKEN missing");
  process.exit(1);
}

if (!MONGO_URL) {
  console.log("❌ MONGO_URL missing");
  process.exit(1);
}

// =============================
// MONGODB
// =============================
mongoose.connect(MONGO_URL)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("Mongo Error:", err.message));

// =============================
// USER MODEL
// =============================
const User = mongoose.model("User", {
  telegramId: String,
  balance: { type: Number, default: 0 }
});

// =============================
// DELETE OLD WEBHOOK
// FIX 409 CONFLICT ERROR
// =============================
const bot = new TelegramBot(TOKEN, { polling: false });

async function startBot() {
  try {
    await bot.deleteWebHook();
    console.log("✅ Old webhook removed");

    await bot.startPolling({
      restart: true,
      interval: 3000
    });

    console.log("✅ Telegram Bot Running");
  } catch (error) {
    console.log("Bot Start Error:", error.message);
  }
}

startBot();

// =============================
// TELEGRAM START COMMAND
// =============================
bot.onText(/\/start/, async (msg) => {
  const id = msg.chat.id.toString();

  let user = await User.findOne({ telegramId: id });

  if (!user) {
    user = await User.create({
      telegramId: id
    });
  }

  bot.sendMessage(
    id,
    `🎰 Beteseb Bingo\n\nOpen Game:\nhttps://YOUR-APP.onrender.com/?id=${id}`
  );
});

// =============================
// POLLING ERROR HANDLER
// =============================
bot.on("polling_error", async (error) => {
  console.log("Polling Error:", error.message);

  if (error.response && error.response.statusCode === 409) {
    console.log("⚠️ Conflict detected. Restarting bot in 3 seconds...");

    setTimeout(async () => {
      try {
        await bot.stopPolling();
        await bot.deleteWebHook();
        await bot.startPolling({
          restart: true,
          interval: 3000
        });
        console.log("✅ Bot restarted successfully");
      } catch (err) {
        console.log("Restart Error:", err.message);
      }
    }, 3000);
  }
});

// =============================
// ROOT
// =============================
app.get("/", (req, res) => {
  res.send("🚀 Bingo Server Running");
});

// =============================
// BALANCE API
// =============================
app.get("/balance", async (req, res) => {
  try {
    const user = await User.findOne({
      telegramId: req.query.id
    });

    res.json({
      balance: user ? user.balance : 0
    });
  } catch {
    res.json({
      balance: 0
    });
  }
});

// =============================
// ADMIN PANEL
// =============================
app.get("/admin", (req, res) => {
  res.send(`
    <h2>Admin Panel</h2>
    <form action="/add" method="POST">
      <input name="id" placeholder="User ID"/><br/><br/>
      <input name="amount" placeholder="Amount"/><br/><br/>
      <button type="submit">Add Balance</button>
    </form>
  `);
});

app.post("/add", async (req, res) => {
  const { id, amount } = req.body;

  let user = await User.findOne({
    telegramId: id
  });

  if (!user) {
    return res.send("User not found");
  }

  user.balance += Number(amount);
  await user.save();

  res.send("✅ Balance Added");
});

// =============================
// START SERVER
// =============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});