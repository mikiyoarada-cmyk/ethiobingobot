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
   CONNECT MONGO
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
   ADMIN PAGE ROUTE
======================= */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* =======================
   AUTO TELEBIRR PAYMENT REQUEST
======================= */
app.post("/pay", async (req, res) => {
  try {
    const { phone, transactionId } = req.body;

    if (!phone || !transactionId) {
      return res.json({ ok: false, msg: "Missing data" });
    }

    // duplicate check
    const exists = await User.findOne({ transactionId });
    if (exists) {
      return res.json({ ok: false, msg: "Transaction already used" });
    }

    // SMART VALIDATION (fake verification logic)
    const validFormat =
      transactionId.length >= 6 &&
      transactionId.length <= 30;

    if (!validFormat) {
      return res.json({ ok: false, msg: "Invalid transaction ID" });
    }

    await User.create({
      phone,
      transactionId,
      status: "pending_auto"
    });

    res.json({
      ok: true,
      msg: "Payment received, verifying automatically..."
    });

  } catch (err) {
    res.json({ ok: false, msg: "Server error" });
  }
});

/* =======================
   ADMIN LIST
======================= */
app.get("/admin/list", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

/* =======================
   MANUAL APPROVE / REJECT
======================= */
app.post("/admin/approve/:id", async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) return res.json({ ok: false });

  user.status = "approved";
  user.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await user.save();

  res.json({ ok: true });
});

app.post("/admin/reject/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, {
    status: "rejected"
  });

  res.json({ ok: true });
});

/* =======================
   AUTO VERIFICATION ENGINE
======================= */
async function autoVerifyEngine() {

  const pending = await User.find({ status: "pending_auto" });

  for (let user of pending) {

    // SIMPLE AUTO RULES (you can improve later)
    const looksReal =
      user.transactionId.length >= 8 &&
      /[a-zA-Z0-9]/.test(user.transactionId);

    if (looksReal) {
      user.status = "approved";
      user.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await user.save();
    }
  }
}

// run every 15 seconds
setInterval(autoVerifyEngine, 15000);

/* =======================
   CHECK ACCESS
======================= */
app.post("/check", async (req, res) => {
  const user = await User.findOne({ phone: req.body.phone });

  if (!user) return res.json({ ok: false });
  if (user.status !== "approved") return res.json({ ok: false });
  if (!user.expiresAt) return res.json({ ok: false });
  if (new Date() > user.expiresAt) return res.json({ ok: false });

  res.json({ ok: true });
});

/* =======================
   BINGO GAME
======================= */
let interval;
let numbers = [];

io.on("connection", (socket) => {

  socket.on("start", () => {

    numbers = [];
    io.emit("start");

    if (interval) clearInterval(interval);

    interval = setInterval(() => {

      const num = Math.floor(Math.random() * 75) + 1;

      numbers.push(num);
      io.emit("number", num);

      if (numbers.length >= 75) {
        clearInterval(interval);
      }

    }, 4000);

  });

  socket.on("winner", (id) => {
    io.emit("winner", id);
    clearInterval(interval);
  });

});

/* =======================
   SERVER START
======================= */
const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("🚀 Bingo Server Running on port", PORT);
});