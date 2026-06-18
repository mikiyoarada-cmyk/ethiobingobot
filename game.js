const { Server } = require("socket.io");

let io;

let cards = [];
let calledNumbers = [];

let gameInterval;
let countdown = 30;


/* CREATE 600 CARTELAS */
function createCards(){

  cards = [];

  for(let i = 1; i <= 600; i++){

    let numbers = [];

    while(numbers.length < 25){

      let n = Math.floor(Math.random()*75)+1;

      if(!numbers.includes(n)){
        numbers.push(n);
      }

    }

    cards.push({
      id:i,
      numbers:numbers
    });

  }

}


/* COUNTDOWN */
function startCountdown(){

  countdown = 30;

  let timer = setInterval(()=>{

    io.emit("countdown", {
      countdown: countdown
    });


    countdown--;


    if(countdown < 0){

      clearInterval(timer);

      startGame();

    }


  },1000);

}



/* START GAME */
function startGame(){

  calledNumbers=[];

  io.emit("gameStart");


  gameInterval=setInterval(()=>{

    callNumber();

  },3000);


}



/* CALL NUMBER */
function callNumber(){

  if(calledNumbers.length>=75){

    endGame();

    return;

  }


  let n;


  do{

    n=Math.floor(Math.random()*75)+1;

  }while(calledNumbers.includes(n));


  calledNumbers.push(n);


  io.emit("number",{
    number:n
  });


}



/* END */
function endGame(){

 clearInterval(gameInterval);


 io.emit("gameEnd");


 setTimeout(()=>{

   startCountdown();

 },5000);


}



/* SERVER */
function init(server){


 io = new Server(server,{
   cors:{
    origin:"*"
   }
 });


 createCards();


 io.on("connection",(socket)=>{


   socket.emit(
    "cardsList",
    cards
   );


   socket.on("chooseCard",(data)=>{


      let card = cards.find(
        c=>c.id == data.cardId
      );


      if(card){

        socket.emit(
          "cardSelected",
          card
        );

      }


   });



 });


 startCountdown();


}



module.exports={
 init
};