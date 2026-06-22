const { Server } = require("socket.io");

let io;

let cards = [];

let calledNumbers = [];

let pool = [];

let pickedCards = {};

let gameStarted = false;

let countInterval = null;

let gameInterval = null;

let timer = 30;





function randomNumbers(min,max){

let arr=[];


while(arr.length<5){

let n=Math.floor(Math.random()*(max-min+1))+min;


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


if(number==="FREE"){

return true;

}



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





// ROW

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






// COLUMN

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



if(countInterval){

clearInterval(countInterval);

}



timer=30;



io.emit("clearGame");



countInterval=setInterval(()=>{


io.emit("countdown",{

countdown:timer

});



timer--;



if(timer<0){


clearInterval(countInterval);

countInterval=null;


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







for(let id in pickedCards){


let card=cards.find(

c=>c.id==id

);



if(card && checkWinner(card)){



io.emit("winner",{


message:"GOOD BINGO",

cartela:card.id


});



endGame();


return;


}



}



},3000);



}








function endGame(){


if(gameInterval){

clearInterval(gameInterval);

}


if(countInterval){

clearInterval(countInterval);

}



gameInterval=null;

countInterval=null;



gameStarted=false;



io.emit("gameEnd");



setTimeout(()=>{



// clear all old game

calledNumbers=[];


pickedCards={};



create600Cards();



io.emit("clearGame");



io.emit("cardsList",cards);



// new game countdown

startCountdown();



},5000);



}
function init(server){


io=new Server(server);



create600Cards();




io.on("connection",(socket)=>{



socket.emit("cardsList",cards);



socket.emit("calledNumbers",{

called:calledNumbers

});





socket.on("chooseCard",(data)=>{



// block picking during game

if(gameStarted){


socket.emit("cardTaken",{

message:"WAITING FOR NEXT GAME"

});


return;


}





let card=cards.find(

c=>c.id==data.cardId

);



if(!card){

return;

}





// stop duplicate cartela

if(
pickedCards[data.cardId] &&
pickedCards[data.cardId]!==socket.id
){


socket.emit("cardTaken",{

message:"CARTELA ALREADY PICKED"

});


return;


}





pickedCards[data.cardId]=socket.id;



socket.emit("cardSelected",card);





io.emit("pickedCount",{


count:Object.keys(pickedCards).length


});







if(
Object.keys(pickedCards).length>=2 &&
!gameStarted &&
!countInterval
){


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