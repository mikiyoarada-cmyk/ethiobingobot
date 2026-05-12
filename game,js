const { Server } = require("socket.io");

let io;

let numbersPool = [];
let calledNumbers = [];

let userCards = {};

let countdown = 30;
let interval;
let countdownInterval;

const SIZE = 25;

/* ================= CREATE CARD ================= */
function createCard() {
  let nums = [];

  while (nums.length < SIZE) {
    let n = Math.floor(Math.random() * 75) + 1;
    if (!nums.includes(n)) nums.push(n);
  }

  return nums;
}

/* ================= GET USER CARD ================= */
function getCard(userId, cardId) {
  if (!userCards[userId]) {
    userCards[userId] = {
      numbers: createCard(),
      marked: []
    };
  }

  return userCards[userId];
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

/* ================= WIN CHECK ================= */
function checkWinner(number) {
  for (let userId in userCards) {
    let u = userCards[userId];

    if (u.numbers.includes(number)) {
      u.marked.push(number);
    }

    if (u.marked.length === SIZE) {
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
  userCards = [];
  calledNumbers = [];

  io.emit("reset");

  startCountdown();
}

/* ================= INIT ================= */
function init(server) {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {

    socket.emit("cardsList", []);

    socket.on("chooseCard", ({ userId }) => {
      socket.emit("cardSelected", getCard(userId));
    });
  });

  startCountdown();
}

module.exports = { init };