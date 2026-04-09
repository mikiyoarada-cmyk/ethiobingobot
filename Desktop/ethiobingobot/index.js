require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ================== EXPRESS SERVER (FIX RENDER) ==================
app.get("/", (req, res) => {
    res.send("Bingo Bot is running 🚀");
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

// ================== TELEGRAM BOT ==================
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// ================== DATABASE ==================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// ================== MODELS ==================
const userSchema = new mongoose.Schema({
    userId: String,
    cartela: Number
});
const User = mongoose.model("User", userSchema);

const paymentSchema = new mongoose.Schema({
    userId: String,
    transactionId: String,
    status: { type: String, default: "pending" }
});
const Payment = mongoose.model("Payment", paymentSchema);

// ================== CARTELAS ==================
let cartelas = [];

for (let i = 1; i <= 600; i++) {
    cartelas.push({
        number: i,
        taken: false,
        userId: null
    });
}

function assignCartela(userId) {
    const available = cartelas.find(c => !c.taken);
    if (!available) return null;

    available.taken = true;
    available.userId = userId;
    return available.number;
}

// ================== COMMANDS ==================
bot.onText(/\/start/, async (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome to Bingo Bot 🎉");
});

bot.onText(/\/buy/, async (msg) => {
    const userId = msg.from.id.toString();

    const existing = await User.findOne({ userId });
    if (existing) {
        return bot.sendMessage(msg.chat.id, `You already have cartela #${existing.cartela}`);
    }

    const number = assignCartela(userId);

    if (!number) {
        return bot.sendMessage(msg.chat.id, "No cartelas left ❌");
    }

    await User.create({ userId, cartela: number });

    bot.sendMessage(msg.chat.id, `Your cartela is #${number} 🎟️`);
});

// ================== PAYMENT SUBMIT ==================
bot.onText(/\/pay (.+)/, async (msg, match) => {
    const txId = match[1];
    const userId = msg.from.id.toString();

    await Payment.create({
        userId,
        transactionId: txId
    });

    bot.sendMessage(msg.chat.id, "Payment submitted ⏳ waiting for approval");

    // notify admin
    bot.sendMessage(process.env.ADMIN_ID,
        `New Payment\nUser: ${userId}\nTX: ${txId}\n\n/approve ${txId}\n/reject ${txId}`
    );
});

// ================== APPROVE ==================
bot.onText(/\/approve (.+)/, async (msg, match) => {
    if (msg.from.id.toString() !== process.env.ADMIN_ID) return;

    const txId = match[1];

    const payment = await Payment.findOneAndUpdate(
        { transactionId: txId },
        { status: "approved" }
    );

    if (!payment) return bot.sendMessage(msg.chat.id, "Payment not found ❌");

    bot.sendMessage(msg.chat.id, "Approved ✅");

    bot.sendMessage(payment.userId, "Your payment approved ✅");

    // SEND AUDIO
    bot.sendAudio(payment.userId, {
        source: path.join(__dirname, "public/voices/B1-O75.mp3")
    });
});

// ================== REJECT ==================
bot.onText(/\/reject (.+)/, async (msg, match) => {
    if (msg.from.id.toString() !== process.env.ADMIN_ID) return;

    const txId = match[1];

    const payment = await Payment.findOneAndUpdate(
        { transactionId: txId },
        { status: "rejected" }
    );

    if (!payment) return bot.sendMessage(msg.chat.id, "Payment not found ❌");

    bot.sendMessage(msg.chat.id, "Rejected ❌");

    bot.sendMessage(payment.userId, "Your payment rejected ❌");
});

// ================== TEST AUDIO ==================
bot.onText(/\/voice/, (msg) => {
    bot.sendAudio(msg.chat.id, {
        source: path.join(__dirname, "public/voices/B1-O75.mp3")
    });
});