require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== FIX RENDER ERROR =====
app.get("/", (req, res) => {
    res.send("Bingo Bot running ✅");
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

// ===== TELEGRAM BOT =====
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// ===== MONGODB =====
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// ===== MODELS =====
const User = mongoose.model("User", {
    userId: String,
    cartela: Number
});

const Payment = mongoose.model("Payment", {
    userId: String,
    transactionId: String,
    status: { type: String, default: "pending" }
});

// ===== CARTELAS =====
let cartelas = [];
for (let i = 1; i <= 600; i++) {
    cartelas.push({ number: i, taken: false });
}

function getCartela(userId) {
    const free = cartelas.find(c => !c.taken);
    if (!free) return null;

    free.taken = true;
    return free.number;
}

// ===== BOT COMMANDS =====
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome 🎉 Use /buy");
});

bot.onText(/\/buy/, async (msg) => {
    const userId = msg.from.id.toString();

    const exist = await User.findOne({ userId });
    if (exist) {
        return bot.sendMessage(msg.chat.id, `Your cartela: ${exist.cartela}`);
    }

    const num = getCartela(userId);
    if (!num) return bot.sendMessage(msg.chat.id, "Sold out ❌");

    await User.create({ userId, cartela: num });

    bot.sendMessage(msg.chat.id, `Your cartela #: ${num}`);
});

// ===== PAYMENT =====
bot.onText(/\/pay (.+)/, async (msg, match) => {
    const tx = match[1];
    const userId = msg.from.id.toString();

    await Payment.create({ userId, transactionId: tx });

    bot.sendMessage(msg.chat.id, "Payment sent ⏳");

    bot.sendMessage(process.env.ADMIN_ID,
        `NEW PAYMENT\nUser: ${userId}\nTX: ${tx}\n\n/approve ${tx}\n/reject ${tx}`
    );
});

// ===== APPROVE =====
bot.onText(/\/approve (.+)/, async (msg, match) => {
    if (msg.from.id.toString() !== process.env.ADMIN_ID) return;

    const tx = match[1];

    const pay = await Payment.findOneAndUpdate(
        { transactionId: tx },
        { status: "approved" }
    );

    if (!pay) return bot.sendMessage(msg.chat.id, "Not found");

    bot.sendMessage(pay.userId, "Approved ✅");

    bot.sendAudio(pay.userId, {
        source: path.join(__dirname, "public/voices/B1-O75.mp3")
    });
});

// ===== REJECT =====
bot.onText(/\/reject (.+)/, async (msg, match) => {
    if (msg.from.id.toString() !== process.env.ADMIN_ID) return;

    const tx = match[1];

    const pay = await Payment.findOneAndUpdate(
        { transactionId: tx },
        { status: "rejected" }
    );

    if (!pay) return bot.sendMessage(msg.chat.id, "Not found");

    bot.sendMessage(pay.userId, "Rejected ❌");
});

// ===== TEST AUDIO =====
bot.onText(/\/voice/, (msg) => {
    bot.sendAudio(msg.chat.id, {
        source: path.join(__dirname, "public/voices/B1-O75.mp3")
    });
});