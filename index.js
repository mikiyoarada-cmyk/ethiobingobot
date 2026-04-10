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
   USER MODEL
======================= */
const userSchema = new mongoose.Schema({
  phone: String,
  transactionId: String,
  status: { type: String, default: "pending" },
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

/* =======================
   ADMIN PAGE (FIX CAN GET ERROR)
======================= */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* =======================
   PAY
======================= */
app.post("/pay", async (req, res) => {
  const { phone, transactionId } = req.body;

  const exists = await User.findOne({ transactionId });
  if (exists) return res.json({ ok: false });

  await User.create({ phone, transactionId, status: "pending" });

  res.json({ ok: true });
});

/* =======================
   ADMIN LIST
======================= */
app.get("/admin/list", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

/* =======================
   APPROVE / REJECT
======================= */
app.post("/admin/approve/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, {
    status: "approved",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  res.json({ ok: true });
});

app.post("/admin/reject/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, {
    status: "rejected"
  });

  res.json({ ok: true });
});

/* =======================
   ACCESS CHECK
======================= */
app.post("/check", async (req, res) => {
  const user = await User.findOne({ phone: req.body.phone });

  if (!user) return res.json({ ok: false });
  if (user.status !== "approved") return res.json({ ok: false });
  if (new Date() > user.expiresAt) return res.json({ ok: false });

  res.json({ ok: true });
});

/* =======================
   GAME CONTROL STATE
======================= */
let interval;
let countdownTimer;
let numbers = [];
let gameStarted = false;

/* =======================
   SOCKET GAME
======================= */
io.on("connection", (socket) => {

  console.log("User connected");

  /* ADMIN START GAME */
  socket.on("startGame", () => {

    if (gameStarted) return;

    gameStarted = true;
    numbers = [];

    io.emit("countdown", 40);

    let time = 40;

    countdownTimer = setInterval(() => {
      time--;

      io.emit("countdown", time);

      if (time <= 0) {
        clearInterval(countdownTimer);
        startBingo();
      }

    }, 1000);
  });

  function startBingo() {

    io.emit("start");

    interval = setInterval(() => {

      const num = Math.floor(Math.random() * 75) + 1;

      numbers.push(num);

      io.emit("number", num);

      if (numbers.length >= 75) {
        clearInterval(interval);
        gameStarted = false;
      }

    }, 4000);
  }

  socket.on("winner", (id) => {
    io.emit("winner", id);
    clearInterval(interval);
  });

});

/* =======================
   SERVER
======================= */
server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 Server running");
});