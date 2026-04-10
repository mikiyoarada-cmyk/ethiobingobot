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
   DATABASE
======================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* =======================
   USER MODEL (VIRTUAL ECONOMY)
======================= */
const userSchema = new mongoose.Schema({
  phone: String,
  balance: { type: Number, default: 0 },
  inviteCode: String,
  invitedBy: String,
  cartela: Array,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

/* =======================
   REGISTER + INVITE REWARD (POINTS ONLY)
======================= */
app.post("/register", async (req, res) => {
  const { phone, inviteCode } = req.body;

  let user = await User.findOne({ phone });

  if (!user) {
    const myCode = "INV" + Math.floor(Math.random() * 99999);

    user = await User.create({
      phone,
      inviteCode: myCode,
      balance: 0,
      invitedBy: inviteCode || null
    });

    // VIRTUAL reward (NOT CASH)
    if (inviteCode) {
      await User.updateOne(
        { inviteCode },
        { $inc: { balance: 5 } } // points only
      );
    }
  }

  res.json({ ok: true, user });
});

/* =======================
   DEPOSIT / WITHDRAW (SIMULATION ONLY)
======================= */
app.post("/deposit", async (req, res) => {
  const { phone, amount } = req.body;

  const user = await User.findOne({ phone });
  if (!user) return res.json({ ok: false });

  user.balance += amount;
  await user.save();

  res.json({ ok: true, balance: user.balance });
});

app.post("/withdraw", async (req, res) => {
  const { phone, amount } = req.body;

  const user = await User.findOne({ phone });

  if (!user || user.balance < amount) {
    return res.json({ ok: false, msg: "Insufficient balance" });
  }

  user.balance -= amount;
  await user.save();

  res.json({ ok: true, balance: user.balance });
});

/* =======================
   CARTELA
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
   JOIN GAME / BUY CARTELA
======================= */
app.post("/buy", async (req, res) => {
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
   USERS
======================= */
app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

/* =======================
   GAME ENGINE
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

    io.emit("gameEnd", {
      msg: "🎉 GOOD BINGO",
      winner: phone
    });

    clearInterval(interval);
  });

});

/* =======================
   ADMIN PAGE
======================= */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* =======================
   SERVER
======================= */
server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 Bingo Safe System Running");
});