const socket = io();

const countdownEl = document.getElementById("countdown");
const cardEl = document.getElementById("card");
const lastEl = document.getElementById("last");

let userId = Math.floor(Math.random() * 999999);

/* ================= SHOW 600 CARTELAS ================= */

socket.on("cardsList", (cards) => {

cardEl.innerHTML = "";

cards.forEach(card => {

```
const btn = document.createElement("button");

btn.innerText = "Cartela #" + card.id;

btn.style.margin = "4px";

btn.onclick = () => {

  socket.emit("chooseCard", {
    userId,
    cardId: card.id
  });

};

cardEl.appendChild(btn);
```

});

});

/* ================= SELECTED CARD ================= */

socket.on("cardSelected", (card) => {

cardEl.innerHTML =
"<h3>Selected Cartela #" + card.id + "</h3>" +
card.numbers.map(n =>
`<span class="num">${n}</span>`
).join("");

});

/* ================= COUNTDOWN ================= */

socket.on("countdown", (seconds) => {
countdownEl.innerText = "Starts In: " + seconds;
});

/* ================= GAME START ================= */

socket.on("gameStart", () => {
countdownEl.innerText = "GAME STARTED";
});

/* ================= CALLED NUMBER ================= */

socket.on("number", (number) => {
lastEl.innerText = number;
});

/* ================= WINNER ================= */

socket.on("winner", (data) => {

alert(
"WINNER USER: " +
data.userId +
" | CARTELA: " +
data.cardId
);

});

/* ================= RESET ================= */

socket.on("reset", () => {

location.reload();

});
