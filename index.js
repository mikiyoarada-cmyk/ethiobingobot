const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const URL = `https://api.telegram.org/bot${TOKEN}`;

// ===== DATABASE =====
let users = {};
let players = {};
let withdrawRequests = {};
let depositRequests = {};

function loadUsers() {
  if (fs.existsSync("users.json")) {
    users = JSON.parse(fs.readFileSync("users.json"));
  }
}
function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}
loadUsers();

// ===== MENU =====
function mainMenu(chatId) {
  return axios.post(`${URL}/sendMessage`, {
    chat_id: chatId,
    text: "🏠 Main Menu",
    reply_markup: {
      keyboard: [
        ["🎮 Join Game", "💰 Balance"],
        ["💳 Deposit", "💸 Withdraw"],
        ["👥 Invite", "🏆 Leaderboard"],
        ["📢 Announcements", "❓ Help"]
      ],
      resize_keyboard: true
    }
  });
}

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// ===== WEBHOOK =====
app.post(`/${TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    let text = (message.text || "").trim();

    const username = message.from.username;
    const firstName = message.from.first_name;

    // BUTTONS
    if (text === "🎮 Join Game") text = "/join";
    else if (text === "💰 Balance") text = "/balance";
    else if (text === "💳 Deposit") text = "/deposit 10";
    else if (text === "💸 Withdraw") text = "/withdraw 10";
    else if (text === "👥 Invite") text = "/invite";
    else if (text === "🏆 Leaderboard") text = "/leaderboard";
    else if (text === "📢 Announcements") text = "/ann";
    else if (text === "❓ Help") text = "/help";

    // CREATE USER
    if (!users[chatId]) {
      users[chatId] = {
        balance: 0,
        name: firstName,
        username: username,
        invitedBy: null
      };
    } else {
      users[chatId].name = firstName;
      users[chatId].username = username;
    }
    saveUsers();

    // ===== COMMANDS =====

    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const referrerId = parts[1];

      if (referrerId && referrerId !== chatId.toString() && users[referrerId]) {
        if (!users[chatId].invitedBy) {
          users[referrerId].balance += 5;
          users[chatId].invitedBy = referrerId;

          await axios.post(`${URL}/sendMessage`, {
            chat_id: referrerId,
            text: "🎉 You earned 5 birr!",
          });
        }
      }

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome to Ethiopian Bingo Bot!",
      });

      await mainMenu(chatId);
    }

    // JOIN GAME
    else if (text === "/join") {
      players[chatId] = true;

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: "✅ Joined next bingo round!",
      });

      await mainMenu(chatId);
    }

    // BALANCE
    else if (text === "/balance") {
      const user = users[chatId];
      const name = user.username ? "@" + user.username : user.name;

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: `👤 ${name}\n💰 Balance: ${user.balance} birr`,
      });

      await mainMenu(chatId);
    }

    // LEADERBOARD
    else if (text === "/leaderboard") {
      const sorted = Object.entries(users)
        .sort((a, b) => b[1].balance - a[1].balance)
        .slice(0, 10);

      let msg = "🏆 Top Players:\n\n";

      sorted.forEach((u, i) => {
        const user = u[1];
        const name = user.username ? "@" + user.username : user.name;
        msg += `${i + 1}. ${name} — ${user.balance} birr\n`;
      });

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: msg,
      });

      await mainMenu(chatId);
    }

    // INVITE
    else if (text === "/invite") {
      const link = `https://t.me/ethiopianbingo_bot?start=${chatId}`;

      await axios.post(`${URL}/sendMessage`, {
        chat_id: chatId,
        text: `👥 Invite & earn 5 birr:\n${link}`,
      });

      await mainMenu(chatId);
    }

    // ===== BINGO GAME ENGINE =====
    let bingoNumbers = [];

    async function runBingoGame() {
      if (Object.keys(players).length < 2) return;

      bingoNumbers = [];

      // generate 20 random numbers
      while (bingoNumbers.length < 20) {
        const num = Math.floor(Math.random() * 75) + 1;
        if (!bingoNumbers.includes(num)) bingoNumbers.push(num);
      }

      // send numbers slowly
      for (let num of bingoNumbers) {
        for (let p in players) {
          await axios.post(`${URL}/sendMessage`, {
            chat_id: p,
            text: `🎱 Number: ${num}`,
          });
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      // pick winner
      const ids = Object.keys(players);
      const winnerId = ids[Math.floor(Math.random() * ids.length)];

      users[winnerId].balance += 30;
      saveUsers();

      const winner = users[winnerId];
      const name = winner.username ? "@" + winner.username : winner.name;

      for (let p of ids) {
        await axios.post(`${URL}/sendMessage`, {
          chat_id: p,
          text: `🏆 BINGO WINNER: ${name}\n💰 +30 birr`,
        });
      }

      players = {};
    }

    // AUTO START GAME
    setTimeout(runBingoGame, 10000);

    // ===== DEPOSIT / WITHDRAW / BROADCAST SAME AS BEFORE =====

    res.sendStatus(200);
  } catch (e) {
    console.log(e);
    res.sendStatus(200);
  }
});

// ===== SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));