<<<<<<< HEAD
const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(bodyParser.json());

// ENV
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// BOT
const bot = new TelegramBot(TOKEN);

// MEMORY DB
let users = {};
let players = [];

// WEBHOOK
app.post(`/${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ROOT
app.get("/", (req, res) => {
    res.send("Bingo + Balance Running!");
});

// ADD MONEY
bot.onText(/\/add (\d+) (\d+)/, (msg, match) => {
    if (msg.from.id != ADMIN_ID) return;

    const userId = match[1];
    const amount = parseInt(match[2]);

    if (!users[userId]) users[userId] = { balance: 0 };

    users[userId].balance += amount;

    bot.sendMessage(msg.chat.id, `✅ Added ${amount} birr`);
});

// BALANCE
bot.onText(/\/balance/, (msg) => {
    const id = msg.from.id;

    if (!users[id]) users[id] = { balance: 0 };

    bot.sendMessage(msg.chat.id, `💰 Balance: ${users[id].balance} birr`);
});

// JOIN
bot.onText(/\/join/, (msg) => {
    const id = msg.from.id;

    if (!users[id]) users[id] = { balance: 0 };

    if (users[id].balance < 5) {
        return bot.sendMessage(msg.chat.id, "❌ Need 5 birr");
    }

    users[id].balance -= 5;
    players.push(id);

    bot.sendMessage(msg.chat.id, "✅ Joined!");

    if (players.length >= 2) {
        const winner = players[Math.floor(Math.random() * players.length)];
        users[winner].balance += 20;

        bot.sendMessage(msg.chat.id, `🏆 Winner: ${winner} gets 20 birr`);

        players = [];
    }
});

// PORT FIX (VERY IMPORTANT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
=======
const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(bodyParser.json());

// ENV
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// BOT
const bot = new TelegramBot(TOKEN);

// MEMORY DB
let users = {};
let players = [];

// WEBHOOK
app.post(`/${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ROOT
app.get("/", (req, res) => {
    res.send("Bingo + Balance Running!");
});

// ADD MONEY
bot.onText(/\/add (\d+) (\d+)/, (msg, match) => {
    if (msg.from.id != ADMIN_ID) return;

    const userId = match[1];
    const amount = parseInt(match[2]);

    if (!users[userId]) users[userId] = { balance: 0 };

    users[userId].balance += amount;

    bot.sendMessage(msg.chat.id, `✅ Added ${amount} birr`);
});

// BALANCE
bot.onText(/\/balance/, (msg) => {
    const id = msg.from.id;

    if (!users[id]) users[id] = { balance: 0 };

    bot.sendMessage(msg.chat.id, `💰 Balance: ${users[id].balance} birr`);
});

// JOIN
bot.onText(/\/join/, (msg) => {
    const id = msg.from.id;

    if (!users[id]) users[id] = { balance: 0 };

    if (users[id].balance < 5) {
        return bot.sendMessage(msg.chat.id, "❌ Need 5 birr");
    }

    users[id].balance -= 5;
    players.push(id);

    bot.sendMessage(msg.chat.id, "✅ Joined!");

    if (players.length >= 2) {
        const winner = players[Math.floor(Math.random() * players.length)];
        users[winner].balance += 20;

        bot.sendMessage(msg.chat.id, `🏆 Winner: ${winner} gets 20 birr`);

        players = [];
    }
});

// PORT FIX (VERY IMPORTANT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
>>>>>>> 6f85db93c82741ce9ca2ac4cf6c44769a6bb3696
});