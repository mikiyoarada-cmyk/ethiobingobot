require("dotenv").config(); // MUST be first

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* =========================
   ENV CHECK
========================= */
console.log("MONGODB_URI =", process.env.MONGODB_URI);

if (!process.env.MONGODB_URI) {
  console.log("❌ ERROR: MONGODB_URI not found in .env");
  process.exit(1);
}

/* =========================
   MONGODB CONNECT
========================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("Mongo error:", err));

/* =========================
   USER SCHEMA
========================= */
const userSchema = new mongoose.Schema({
  phone: String,
  transactionId: String,
  status: { type: String, default: "pending" }, // pending / approved / rejected
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

/* =========================
   PAYMENT SUBMIT (TELEBIRR)
========================= */
app.post("/pay", async (req, res) => {
  try {
    const { phone, transactionId } = req.body;

    const exists = await User.findOne({ transactionId });
    if (exists) {
      return res.json({ ok: false, msg: "Transaction already used" });
    }

    await User.create({
      phone,
      transactionId,
      status: "pending"
    });

    res.json({ ok: true, msg: "Payment submitted successfully" });

  } catch (err) {
    res.json({ ok: false, msg: "Server error" });
  }
});

/* =========================
   ADMIN - LIST USERS
========================= */
app.get("/admin/list", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

/* =========================
   ADMIN - APPROVE USER
========================= */
app.post("/admin/approve/:id", async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) return res.json({ ok: false, msg: "User not found" });

  user.status = "approved";
  user.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await user.save();

  res.json({ ok: true, msg: "User approved" });
});

/* =========================
   ADMIN - REJECT USER
========================= */
app.post("/admin/reject/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, {
    status: "rejected"
  });

  res.json({ ok: true, msg: "User rejected" });
});

/* =========================
   CHECK ACCESS BEFORE GAME
========================= */
app.post("/check", async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });

  if (!user) return res.json({ ok: false });
  if (user.status !== "approved") return res.json({ ok: false });
  if (!user.expiresAt) return res.json({ ok: false });
  if (new Date() > user.expiresAt) return res.json({ ok: false });

  res.json({ ok: true });
});

/* =========================
   BINGO GAME (SOCKET.IO)
========================= */
let interval;
let numbers = [];

io.on("connection", (socket) => {

  socket.on("start", () => {

    numbers = [];
    io.emit("start");

    if (interval) clearInterval(interval);

    interval = setInterval(() => {

      let num = Math.floor(Math.random() * 75) + 1;
      numbers.push(num);

      io.emit("number", num);

      if (numbers.length >= 75) {
        clearInterval(interval);
      }

    }, 4000); // safe + stable (audio friendly)

  });

  socket.on("winner", (id) => {
    io.emit("winner", id);
    clearInterval(interval);
  });

});

server.listen(process.env.PORT || 10000, () => {
  console.log("🚀 Bingo server running");
});