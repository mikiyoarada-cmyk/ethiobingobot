const { Server } = require("socket.io");

let io;

let cards = [];
let calledNumbers = [];
let pool = [];

let playersCards = {};
let takenCards = {};

let gameStarted = false;
let countdownRunning = false;

let countTimer;
let gameTimer;



function randomNumbers(min,max,total){

let arr=[];

while(arr.length<total){

let n=Math.floor(Math.random()*(max-min+1))+min;

if(!arr.includes(n)){

arr.push(n);

}

}

return arr;

}




function createCard(id){

let B=randomNumbers(1,15,5);
let I=randomNumbers(16,30,5);
let N=randomNumbers(31,45,5);
let G=randomNumbers(46,60,5);
let O=randomNumbers(61,75,5);


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




function startCountdown(){

if(countdownRunning)return;


countdownRunning=true;


let t=30;


countTimer=setInterval(()=>{


io.emit("countdown",{
countdown:t
});


t--;


if(t<0){

clearInterval(countTimer);

countdownRunning=false;

startGame();

}


},1000);


}






function checkWinner(card){


let mark=[];


card.numbers.forEach((n)=>{


if(n==="FREE"){

mark.push(true);

}

else{

mark.push(
calledNumbers.includes(n)
);

}


});



// rows

for(let r=0;r<5;r++){

let win=true;

for(let c=0;c<5;c++){

if(!mark[r*5+c])
win=false;

}

if(win)return true;

}



// columns

for(let c=0;c<5;c++){

let win=true;

for(let r=0;r<5;r++){

if(!mark[r*5+c])
win=false;

}

if(win)return true;

}



// diagonal

let a=true;

let b=true;


for(let i=0;i<5;i++){

if(!mark[i*5+i])
a=false;


if(!mark[i*5+(4-i)])
b=false;

}


return a||b;


}





function startGame(){


if(Object.keys(takenCards).length<2){

return;

}


gameStarted=true;


calledNumbers=[];


pool=[];


for(let i=1;i<=75;i++){

pool.push(i);

}



io.emit("gameStart");



gameTimer=setInterval(()=>{


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




// check only selected cards

for(let id in takenCards){


let card=cards.find(
c=>c.id==id
);


if(checkWinner(card)){


io.emit("winner",{

cartela:id

});


endGame();

return;


}


}



},2000);


}







function endGame(){


clearInterval(gameTimer);


gameStarted=false;


io.emit("gameEnd");


setTimeout(()=>{


playersCards={};

takenCards={};


create600Cards();


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



socket.on("chooseCard",(data)=>{


let id=data.cardId;



if(takenCards[id] && takenCards[id]!==socket.id){

socket.emit(
"cardTaken"
);

return;

}



takenCards[id]=socket.id;


playersCards[socket.id] =
playersCards[socket.id] || [];


if(!playersCards[socket.id].includes(id)){

playersCards[socket.id].push(id);

}



let card=cards.find(
c=>c.id==id
);



socket.emit(
"cardSelected",
card
);



io.emit(
"pickedCount",
Object.keys(takenCards).length
);



if(Object.keys(takenCards).length>=2){

startCountdown();

}



});






socket.on("disconnect",()=>{


for(let id in takenCards){

if(takenCards[id]===socket.id){

delete takenCards[id];

}

}


});



});



}



module.exports={init};