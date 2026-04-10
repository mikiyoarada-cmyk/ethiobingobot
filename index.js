const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + "/public"));

let numbers = [];
let interval = null;

io.on("connection", (socket) => {

  socket.on("start", () => {
    numbers = [];

    io.emit("start");

    if (interval) clearInterval(interval);

    interval = setInterval(() => {
      let num = Math.floor(Math.random() * 75) + 1;

      numbers.push(num);

      io.emit("number", num);

      // stop if all numbers used
      if (numbers.length >= 75) {
        clearInterval(interval);
      }

    }, 4000); // ⚡ FAST GLOBAL TIMER
  });

  socket.on("winner", (cardId) => {
    io.emit("winner", cardId);
    clearInterval(interval); // stop game when winner found
  });

});

server.listen(10000, () => {
  console.log("Bingo server running on 10000");
});