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
  .catch(err => console.log("Mongo error:", err));

/* =======================
   USER MODEL (FREE SYSTEM)
======================= */
const userSchema = new mongoose.Schema({
  phone: String,
  cartela: Array,
  status: { type: String, default: "active" },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

/* =======================
   ADMIN PAGE FIX (CRITICAL)
======================= */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* =======================
   CREATE USER (NO BALANCE SYSTEM)
======================= */
app.post("/register", async (req, res) => {
  const { phone } = req.body;

  const exists = await User.findOne({ phone });
  if (exists) return res.json({ ok: true, user: exists });

  const cartela = generateCartela();

  const user = await User.create({
    phone,
    cartela,
    status: "active"
  });

  res.json({ ok: true, user });
});

/* =======================
   GET USERS (ADMIN)
======================= */
app.get("/admin/list", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
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
let numbers = [];
let interval;
let countdown;

/* =======================
   SOCKET
======================= */
io.on("connection", (socket) => {

  console.log("User connected");

  /* ADMIN START GAME */
  socket.on("startGame", () => {

    numbers = [];

    io.emit("countdown", 40);

    let time = 40;

    countdown = setInterval(() => {

      time--;
      io.emit("countdown", time);

      if (time <= 0) {
        clearInterval(countdown);
        startGame();
      }

    }, 1000);

  });

  function startGame() {

    io.emit("start");

    interval = setInterval(() => {

      const num = Math.floor(Math.random() * 75) + 1;

      numbers.push(num);

      io.emit("number", num);

      if (numbers.length >= 75) {
        clearInterval(interval);
      }

    }, 4000);

  }

  socket.on("winner", (id) => {
    io.emit("winner", id);
  });

});

/* =======================
   SERVER
======================= */
const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("🚀 Bingo Free System Running on", PORT);
});