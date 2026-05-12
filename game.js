const { Server } = require("socket.io");

let io;

let numbersPool = [];
let calledNumbers = [];
let cards = [];

let gameRunning = false;
let countdown = 30;
let interval;
let countdownInterval;

const CARD_COUNT = 600;
const SIZE = 25;

/* ================= CARDS ================= */
function generateCards() {
  cards = [];

  for (let i = 0; i < CARD_COUNT; i++) {
    let nums = [];

    while (nums.length < SIZE) {
      let n = Math.floor(Math.random() * 75) + 1;
      if (!nums.includes(n)) nums.push(n);
    }

    cards.push({ id: i, numbers: nums, marked: [] });
  }
}

/* ================= COUNTDOWN ================= */
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
  gameRunning = true;

  numbersPool = Array.from({ length: 75 }, (_, i) => i + 1);
  calledNumbers = [];

  generateCards();

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

/* ================= WIN CHECK ================= */
function checkWinner(number) {
  for (let card of cards) {
    if (card.numbers.includes(number)) {
      card.marked.push(number);
    }

    if (card.marked.length === SIZE) {
      io.emit("winner", { card });
      return endGame();
    }
  }
}

/* ================= END GAME ================= */
function endGame() {
  clearInterval(interval);
  gameRunning = false;

  io.emit("gameEnd");

  setTimeout(() => {
    resetGame();
  }, 5000);
}

/* ================= RESET ================= */
function resetGame() {
  cards = [];
  calledNumbers = [];

  io.emit("reset");

  startCountdown(); // restart cycle
}

/* ================= INIT ================= */
function init(server) {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.emit("gameState", {
      calledNumbers,
      gameRunning
    });
  });

  startCountdown();
}

module.exports = { init };