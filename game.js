const { Server } = require("socket.io");

let io;

let cards = [];
let calledNumbers = [];
let pool = [];

let timer = 30;

let countInterval;
let gameInterval;

let pickedCards = {};

let gameStarted = false;



function randomNumbers(min,max){

let arr=[];

while(arr.length < 5){

let n = Math.floor(Math.random()*(max-min+1))+min;

if(!arr.includes(n)){

arr.push(n);

}

}

return arr;

}





function createCard(id){


let B=randomNumbers(1,15);
let I=randomNumbers(16,30);
let N=randomNumbers(31,45);
let G=randomNumbers(46,60);
let O=randomNumbers(61,75);



N[2]="FREE";



let numbers=[];


for(let i=0;i<5;i++){

numbers.push(B[i]);
numbers.push(I[i]);
numbers.push(N[i]);
numbers.push(G[i]);
numbers.push(O[i]);

}



return {

id:id,
numbers:numbers

};


}






function create600Cards(){

cards=[];


for(let i=1;i<=600;i++){

cards.push(createCard(i));

}


}
function isMarked(number){

if(number==="FREE") return true;

return calledNumbers.includes(number);

}




function checkWinner(card){


let board=[];


for(let r=0;r<5;r++){

board[r]=[];

for(let c=0;c<5;c++){

board[r][c]=card.numbers[r*5+c];

}

}




// ROW CHECK

for(let r=0;r<5;r++){

let win=true;


for(let c=0;c<5;c++){

if(!isMarked(board[r][c])){

win=false;

}

}


if(win){

return true;

}

}




// COLUMN CHECK

for(let c=0;c<5;c++){

let win=true;


for(let r=0;r<5;r++){

if(!isMarked(board[r][c])){

win=false;

}

}


if(win){

return true;

}

}





// DIAGONAL 1

let win=true;


for(let i=0;i<5;i++){

if(!isMarked(board[i][i])){

win=false;

}

}


if(win){

return true;

}







// DIAGONAL 2

win=true;


for(let i=0;i<5;i++){

if(!isMarked(board[i][4-i])){

win=false;

}

}


if(win){

return true;

}



return false;


}







function startCountdown(){


timer=30;


countInterval=setInterval(()=>{


io.emit("countdown",{

countdown:timer

});



timer--;



if(timer<0){


clearInterval(countInterval);


startGame();


}



},1000);



}
function startGame(){


if(Object.keys(pickedCards).length < 2){

return;

}



gameStarted=true;


calledNumbers=[];


pool=[];


for(let i=1;i<=75;i++){

pool.push(i);

}



io.emit("gameStart");



gameInterval=setInterval(()=>{


if(pool.length===0){

endGame();

return;

}




let index=Math.floor(
Math.random()*pool.length
);



let number=pool.splice(index,1)[0];



calledNumbers.push(number);



io.emit("number",{

number:number,

called:calledNumbers

});





// WINNER CHECK

for(let cardId in pickedCards){



let card=cards.find(
c=>c.id==cardId
);



if(card && checkWinner(card)){



io.emit("winner",{

cartela:card.id

});



endGame();


return;


}



}




},3000);



}








function endGame(){


clearInterval(gameInterval);


gameStarted=false;



io.emit("gameEnd");



setTimeout(()=>{



calledNumbers=[];


pickedCards={};


create600Cards();



io.emit("clearGame");


io.emit("cardsList",cards);



startCountdown();



},5000);



}
function init(server){


io=new Server(server);



create600Cards();



io.on("connection",(socket)=>{



socket.emit(
"cardsList",
cards
);



socket.emit(
"calledNumbers",
{
called:calledNumbers
}
);






socket.on("chooseCard",(data)=>{



let id=data.cardId;



let card=cards.find(
c=>c.id==id
);



if(!card){

return;

}




// prevent another user taking same cartela

if(pickedCards[id] && pickedCards[id]!==socket.id){


socket.emit("cardTaken");


return;


}





pickedCards[id]=socket.id;



socket.emit(
"cardSelected",
card
);





io.emit(
"pickedCount",
Object.keys(pickedCards).length
);




// start only after 2 or more cartelas

if(Object.keys(pickedCards).length>=2 && !gameStarted){


startCountdown();


}



});





socket.on("disconnect",()=>{


for(let id in pickedCards){


if(pickedCards[id]===socket.id){


delete pickedCards[id];


}


}



});




});




}




module.exports={init};