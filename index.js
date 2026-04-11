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
  cartela: Array,
  txid: String,
  status: { type: String, default: "pending" } // pending / approved
});

const User = mongoose.model("User", userSchema);

/* =======================
   TELEGRAM WEBHOOK
======================= */
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  console.log("Telegram:", req.body);
  res.json({ ok: true });
});

/* =======================
   REGISTER
======================= */
app.post("/register", async (req, res) => {
  const { phone } = req.body;

  let user = await User.findOne({ phone });

  if (!user) {
    user = await User.create({ phone });
  }

  res.json({ ok: true });
});

/* =======================
   SEND TXID
======================= */
app.post("/pay", async (req, res) => {
  const { phone, txid } = req.body;

  await User.findOneAndUpdate(
    { phone },
    { txid, status: "pending" }
  );

  res.json({ ok: true, msg: "Waiting approval" });
});

/* =======================
   ADMIN APPROVE
======================= */
app.post("/admin/approve/:phone", async (req, res) => {
  await User.findOneAndUpdate(
    { phone: req.params.phone },
    { status: "approved", balance: 100 }
  );

  res.json({ ok: true });
});

/* =======================
   CHECK ACCESS
======================= */
app.get("/check/:phone", async (req, res) => {
  const user = await User.findOne({ phone });

  if (!user || user.status !== "approved") {
    return res.json({ ok: false });
  }

  res.json({ ok: true });
});

/* =======================
   FIXED CARTELA (REAL BINGO)
======================= */
function getRandomUnique(min, max, count) {
  let nums = [];
  while (nums.length < count) {
    let n = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums;
}

function generateCartela() {
  const B = getRandomUnique(1, 15, 5);
  const I = getRandomUnique(16, 30, 5);
  const N = getRandomUnique(31, 45, 5);
  const G = getRandomUnique(46, 60, 5);
  const O = getRandomUnique(61, 75, 5);

  let card = [];

  for (let i = 0; i < 5; i++) {
    card.push([B[i], I[i], N[i], G[i], O[i]]);
  }

  // FREE center
  card[2][2] = "FREE";

  return card;
}

/* =======================
   JOIN GAME
======================= */
app.post("/join", async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });

  if (!user || user.status !== "approved") {
    return res.json({ ok: false, msg: "Not approved" });
  }

  user.cartela = generateCartela();
  await user.save();

  res.json({ ok: true, cartela: user.cartela });
});

/* =======================
   SOCKET GAME
======================= */
let interval;

io.on("connection", (socket) => {

  socket.on("start", () => {

    io.emit("countdown", 40);

    let t = 40;

    let timer = setInterval(() => {
      t--;
      io.emit("countdown", t);

      if (t <= 0) {
        clearInterval(timer);
        startGame();
      }
    }, 1000);

  });

  function startGame() {

    io.emit("start");

    let numbers = [];

    interval = setInterval(() => {

      let num = Math.floor(Math.random() * 75) + 1;

      if (!numbers.includes(num)) {
        numbers.push(num);
        io.emit("number", num);
      }

      if (numbers.length >= 75) clearInterval(interval);

    }, 4000);

  }

  socket.on("winner", (phone) => {
    io.emit("winner", phone);
    io.emit("gameEnd", "🎉 GOOD BINGO");
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
  console.log("🚀 Bingo Fixed Running");
});