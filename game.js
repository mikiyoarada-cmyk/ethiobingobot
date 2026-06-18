const { Server } = require("socket.io");

let io;

let cards = [];
let calledNumbers = [];

let gameInterval;
let countdown = 30;



/* CREATE REAL BINGO 5x5 CARD */
function createCard(id){

    let B = [];
    let I = [];
    let N = [];
    let G = [];
    let O = [];


    while(B.length < 5){
        let n = random(1,15);
        if(!B.includes(n)) B.push(n);
    }


    while(I.length < 5){
        let n = random(16,30);
        if(!I.includes(n)) I.push(n);
    }


    while(N.length < 5){
        let n = random(31,45);
        if(!N.includes(n)) N.push(n);
    }


    while(G.length < 5){
        let n = random(46,60);
        if(!G.includes(n)) G.push(n);
    }


    while(O.length < 5){
        let n = random(61,75);
        if(!O.includes(n)) O.push(n);
    }


    return {

        id:id,

        numbers:[

            B[0],I[0],N[0],G[0],O[0],
            B[1],I[1],N[1],G[1],O[1],
            B[2],I[2],"FREE",G[2],O[2],
            B[3],I[3],N[3],G[3],O[3],
            B[4],I[4],N[4],G[4],O[4]

        ]

    };

}



function random(min,max){

 return Math.floor(Math.random()*(max-min+1))+min;

}



/* CREATE 600 UNIQUE CARDS */
function createCards(){

 cards=[];

 let saved=[];


 while(cards.length < 600){

    let card=createCard(cards.length+1);


    let key=JSON.stringify(card.numbers);


    if(!saved.includes(key)){

        saved.push(key);

        cards.push(card);

    }

 }

}



/* COUNTDOWN */
function startCountdown(){

 countdown=30;


 let timer=setInterval(()=>{


    io.emit(
        "countdown",
        {
            countdown:countdown
        }
    );


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



/* CALL NUMBERS */
function callNumber(){


 if(calledNumbers.length>=75){

    endGame();

    return;

 }


 let n;


 do{

    n=random(1,75);


 }while(calledNumbers.includes(n));



 calledNumbers.push(n);



 io.emit(
    "number",
    {
        number:n
    }
 );


}



/* END */
function endGame(){

 clearInterval(gameInterval);


 io.emit("gameEnd");


 setTimeout(()=>{

    createCards();

    startCountdown();

 },5000);


}



/* SERVER */
function init(server){


 io=new Server(server,{
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


        let card=cards.find(
            c=>c.id==data.cardId
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