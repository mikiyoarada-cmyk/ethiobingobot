const { Server } = require("socket.io");

let io;

let numbersPool = [];
let calledNumbers = [];
let userCards = {}; // each user gets ONE card

let countdown = 30;
let interval;
let countdownInterval;

const SIZE = 25;

/* ================= CARD GENERATOR ================= */
function generateCard() {
  let nums = [];

  while (nums.length < SIZE) {
    let n = Math.floor(Math.random() * 75) + 1;
    if (!nums.includes(n)) nums.push(n);
  }

  return nums;
}

/* ================= START COUNTDOWN ================= */
function startCountdown() {
  countdown = 30;

  countdownInterval = setInterval(() => {
    io.emit("countdown", { countdown });

    countdown--;

    if (countdown < 0) {
      clearInterval(countdownInterval);
      startGame();
    }
  }, 1000);
}

/* ================= START GAME ================= */
function startGame() {
  numbersPool = Array.from({ length: 75 }, (_, i) => i + 1);
  calledNumbers = [];

  io.emit("gameStart");

  interval = setInterval(drawNumber, 3000);
}

/* ================= DRAW NUMBER ================= */
function drawNumber() {
  if (numbersPool.length === 0) return endGame();

  const index = Math.floor(Math.random() * numbersPool.length);
  const number = numbersPool.splice(index, 1)[0];

  calledNumbers.push(number);

  io.emit("number", { number });

  checkWinner(number);
}

/* ================= ASSIGN USER CARD ================= */
function getUserCard(userId) {
  if (!userCards[userId]) {
    userCards[userId] = {
      numbers: generateCard(),
      marked: []
    };
  }

  return userCards[userId];
}

/* ================= WIN CHECK ================= */
function checkWinner(number) {
  for (let userId in userCards) {
    let card = userCards[userId];

    if (card.numbers.includes(number)) {
      card.marked.push(number);
    }

    if (card.marked.length === SIZE) {
      io.emit("winner", { userId });
      return endGame();
    }
  }
}

/* ================= END GAME ================= */
function endGame() {
  clearInterval(interval);

  io.emit("gameEnd");

  setTimeout(resetGame, 5000);
}

/* ================= RESET ================= */
function resetGame() {
  calledNumbers = [];
  userCards = {};

  io.emit("reset");

  startCountdown();
}

/* ================= INIT SOCKET ================= */
function init(server) {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {

    socket.on("getCard", (userId) => {
      const card = getUserCard(userId);
      socket.emit("yourCard", card);
    });

    socket.emit("gameState", {
      calledNumbers
    });
  });

  startCountdown();
}

module.exports = { init };