const { Server } = require("socket.io");

let io;
let gameInterval;
let startTimeout;

let numbersPool = [];
let calledNumbers = [];
let cards = [];
let gameRunning = false;

const CARD_COUNT = 600;
const SIZE = 25; // 5x5 bingo card

/* ================= INIT CARDS ================= */
function generateCards() {
  cards = [];

  for (let i = 0; i < CARD_COUNT; i++) {
    let nums = [];

    while (nums.length < SIZE) {
      let n = Math.floor(Math.random() * 75) + 1;
      if (!nums.includes(n)) nums.push(n);
    }

    cards.push({
      id: i,
      numbers: nums,
      marked: []
    });
  }
}

/* ================= START GAME ================= */
function startGame() {
  gameRunning = true;
  numbersPool = Array.from({ length: 75 }, (_, i) => i + 1);
  calledNumbers = [];

  generateCards();

  io.emit("gameStart", { cards });

  gameInterval = setInterval(drawNumber, 3000);
}

/* ================= DRAW NUMBER ================= */
function drawNumber() {
  if (numbersPool.length === 0) return endGame();

  const index = Math.floor(Math.random() * numbersPool.length);
  const number = numbersPool.splice(index, 1)[0];

  calledNumbers.push(number);

  io.emit("number", { number, calledNumbers });

  checkWinners(number);
}

/* ================= CHECK WINNER ================= */
function checkWinners(number) {
  for (let card of cards) {
    if (card.numbers.includes(number)) {
      card.marked.push(number);
    }

    if (card.marked.length >= 25) {
      io.emit("winner", { card });
      return endGame();
    }
  }
}

/* ================= END GAME ================= */
function endGame() {
  clearInterval(gameInterval);
  gameRunning = false;

  io.emit("gameEnd", { calledNumbers });

  // RESET AFTER 10 SEC
  setTimeout(() => {
    resetGame();
  }, 10000);
}

/* ================= RESET ================= */
function resetGame() {
  calledNumbers = [];
  cards = [];

  io.emit("reset");

  // AUTO START AFTER 30 SEC
  startTimeout = setTimeout(() => {
    startGame();
  }, 30000);
}

/* ================= INIT SOCKET ================= */
function init(server) {
  io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    socket.emit("gameState", {
      cards,
      calledNumbers,
      gameRunning
    });
  });

  // FIRST START AFTER 5 SEC
  setTimeout(startGame, 5000);
}

module.exports = { init };