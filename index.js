require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* =======================
   MONGO
======================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* =======================
   USER MODEL (WALLET SYSTEM)
======================= */
const userSchema = new mongoose.Schema({
  phone: String,
  balance: { type: Number, default: 0 },
  cartela: Array,
  room: { type: String, default: "global" },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

/* =======================
   ADMIN ADD BALANCE (MANUAL TOPUP)
======================= */
app.post("/admin/add-balance", async (req, res) => {
  const { phone, amount } = req.body;

  const user = await User.findOne({ phone });

  if (!user) return res.json({ ok: false, msg: "User not found" });

  user.balance += amount;
  await user.save();

  res.json({ ok: true, balance: user.balance });
});

/* =======================
   REGISTER USER
======================= */
app.post("/register", async (req, res) => {
  const { phone } = req.body;

  let user = await User.findOne({ phone });

  if (!user) {
    user = await User.create({ phone, balance: 0 });
  }

  res.json({ ok: true, user });
});

/* =======================
   BUY CARTELA (BALANCE CHECK)
======================= */
app.post("/buy-cartela", async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });

  if (!user) return res.json({ ok: false });

  const price = 10;

  if (user.balance < price) {
    return res.json({ ok: false, msg: "Insufficient balance" });
  }

  user.balance -= price;
  user.cartela = generateCartela();

  await user.save();

  res.json({ ok: true, cartela: user.cartela, balance: user.balance });
});

/* =======================
   CARTELA GENERATOR
======================= */
function generateCartela() {
  let card = [];
  for (let i = 0; i < 5; i++) {
    let row = [];
    for (let j = 0; j < 5; j++) {
      row.push(Math.floor(Math.random() * 75) + 1);
    }
    card.push(row);
  }
  return card;
}

/* =======================
   GAME SYSTEM (40 SEC START)
======================= */
let interval;
let countdown;

io.on("connection", (socket) => {

  socket.on("startGame", () => {

    io.emit("countdown", 40);

    let t = 40;

    countdown = setInterval(() => {
      t--;
      io.emit("countdown", t);

      if (t <= 0) {
        clearInterval(countdown);
        startGame();
      }

    }, 1000);

  });

  function startGame() {

    io.emit("start");

    interval = setInterval(() => {

      const num = Math.floor(Math.random() * 75) + 1;

      io.emit("number", num);

    }, 4000);

  }

});

/* =======================
   WINNER SYSTEM
======================= */
app.post("/winner", async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });

  if (!user) return res.json({ ok: false });

  const prize = 100;

  user.balance += prize;

  await user.save();

  io.emit("winner", phone);

  res.json({ ok: true, prize });
});

/* =======================
   ADMIN DASHBOARD API
======================= */
app.get("/admin/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

/* =======================
   SERVER
======================= */
server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 Safe Bingo System Running");
});