const socket = io();

const countdownEl = document.getElementById("countdown");
const cardEl = document.getElementById("card");
const lastEl = document.getElementById("last");

let userId = Math.floor(Math.random() * 999999);

/* ================= COUNTDOWN ================= */
socket.on("countdown", (data) => {
  countdownEl.innerText = "Starts in: " + data.countdown;
});

/* ================= GAME START ================= */
socket.on("gameStart", () => {
  countdownEl.innerText = "🎮 GAME STARTED";
});

/* ================= CARD ================= */
socket.emit("chooseCard", { userId });

socket.on("cardSelected", (card) => {
  cardEl.innerHTML = card.numbers
    .map(n => `<span class="num">${n}</span>`)
    .join("");
});

/* ================= NUMBER ================= */
socket.on("number", (data) => {
  lastEl.innerText = data.number;
});

/* ================= WINNER ================= */
socket.on("winner", (data) => {
  alert("🏆 WINNER: " + data.userId);
});