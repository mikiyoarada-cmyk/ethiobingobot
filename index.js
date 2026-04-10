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
   DB
======================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* =======================
   USER MODEL
======================= */
const userSchema = new mongoose.Schema({
  phone: String,
  balance: { type: Number, default: 0 },
  cartela: Array
});

const User = mongoose.model("User", userSchema);

/* =======================
   REGISTER
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
   BALANCE
======================= */
app.get("/balance/:phone", async (req, res) => {
  const user = await User.findOne({ phone: req.params.phone });

  res.json({ balance: user ? user.balance : 0 });
});

/* =======================
   DEPOSIT (SIMULATION)
======================= */
app.post("/deposit", async (req, res) => {
  const { phone, amount } = req.body;

  const user = await User.findOne({ phone });
  if (!user) return res.json({ ok: false });

  user.balance += Number(amount);
  await user.save();

  res.json({ ok: true, balance: user.balance });
});

/* =======================
   BUY / JOIN GAME
======================= */
function generateCartela() {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => Math.floor(Math.random() * 75) + 1)
  );
}

app.post("/join", async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });
  if (!user) return res.json({ ok: false });

  if (user.balance < 10) {
    return res.json({ ok: false, msg: "Insufficient balance" });
  }

  user.balance -= 10;
  user.cartela = generateCartela();
  await user.save();

  res.json({ ok: true, cartela: user.cartela, balance: user.balance });
});

/* =======================
   SOCKET GAME
======================= */
let interval;
let countdown;

io.on("connection", (socket) => {

  socket.on("start", () => {

    let t = 40;
    io.emit("countdown", t);

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

    io.emit("gameStart");

    let numbers = [];

    interval = setInterval(() => {
      const num = Math.floor(Math.random() * 75) + 1;

      numbers.push(num);
      io.emit("number", num);

      if (numbers.length >= 75) {
        clearInterval(interval);
      }

    }, 4000);
  }

  socket.on("winner", (phone) => {
    io.emit("winner", phone);
    clearInterval(interval);
  });

});

server.listen(10000, () => console.log("Server running"));