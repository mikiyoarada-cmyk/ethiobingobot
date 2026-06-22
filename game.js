const { Server } = require("socket.io");

let io;

let cards = [];
let calledNumbers = [];
let pool = [];

let selectedCards = {};
let takenCards = {};

let timer = 30;
let countInterval;
let gameInterval;

let gameStarted = false;



function randomNumbers(min,max,count){

let arr=[];

while(arr.length<count){

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
id,
numbers
};


}



function create600Cards(){

cards=[];

for(let i=1;i<=600;i++){

cards.push(createCard(i));

}

}




function checkBingo(card){


let n=card.numbers.map(x=>{

if(x==="FREE") return true;

return calledNumbers.includes(x);

});



// rows

for(let r=0;r<5;r++){

let ok=true;

for(let c=0;c<5;c++){

if(!n[r*5+c]) ok=false;

}

if(ok)return true;

}



// columns

for(let c=0;c<5;c++){

let ok=true;

for(let r=0;r<5;r++){

if(!n[r*5+c]) ok=false;

}

if(ok)return true;

}



// diagonal

let a=true;

let b=true;


for(let i=0;i<5;i++){

if(!n[i*5+i])a=false;

if(!n[i*5+(4-i)])b=false;

}


return a||b;

}




function startCountdown(){


timer=30;


countInterval=setInterval(()=>{


io.emit("countdown",{countdown:timer});


timer--;


if(timer<0){

clearInterval(countInterval);

startGame();

}


},1000);


}





function startGame(){


gameStarted=true;


pool=[];


for(let i=1;i<=75;i++){

pool.push(i);

}


calledNumbers=[];


io.emit("gameStart");


gameInterval=setInterval(()=>{


if(pool.length===0){

endGame();

return;

}


let index=Math.floor(Math.random()*pool.length);


let number=pool.splice(index,1)[0];


calledNumbers.push(number);



io.emit("number",{

number,

called:calledNumbers

});



for(let id in selectedCards){


let card=cards.find(c=>c.id==id);


if(checkBingo(card)){


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


clearInterval(gameInterval);


gameStarted=false;


io.emit("gameEnd");


setTimeout(()=>{


selectedCards={};

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



socket.emit("cardsList",cards);



socket.emit("calledNumbers",{

called:calledNumbers

});




socket.on("chooseCard",(data)=>{


let id=data.cardId;



if(takenCards[id] && takenCards[id]!==socket.id){

socket.emit("cardTaken");

return;

}



takenCards[id]=socket.id;



selectedCards[id]=true;



let card=cards.find(c=>c.id==id);



socket.emit("cardSelected",card);



let total=Object.keys(takenCards).length;



io.emit("pickedCount",total);



if(total>=2 && !gameStarted && !countInterval){

startCountdown();

}



});



socket.on("disconnect",()=>{



for(let id in takenCards){

if(takenCards[id]===socket.id){

delete takenCards[id];

delete selectedCards[id];

}

}



});



});



startCountdown();


}



module.exports={init};