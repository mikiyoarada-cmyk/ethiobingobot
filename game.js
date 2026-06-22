const { Server } = require("socket.io");

let io;

let cards = [];
let calledNumbers = [];
let pool = [];

let countInterval;
let gameInterval;

let pickedCards = new Map();

let timer = 30;
let gameRunning = false;


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


gameRunning=true;


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

number:number,

called:calledNumbers

});



checkWinner();



},2000);



}





function checkWinner(){


for(let [socketId,cardIds] of pickedCards){


for(let id of cardIds){


let card=cards.find(c=>c.id===id);


if(!card) continue;



let win=checkCard(card);



if(win){


io.to(socketId).emit("winner",{

cartela:id

});


io.emit("gameEnd");


endGame();


return;

}


}


}


}





function checkCard(card){


let nums=card.numbers;


let mark=[];


for(let n of nums){

mark.push(
n==="FREE" || calledNumbers.includes(n)
);

}


// rows

for(let r=0;r<5;r++){

let ok=true;

for(let c=0;c<5;c++){

if(!mark[r*5+c]) ok=false;

}

if(ok)return true;

}



// columns

for(let c=0;c<5;c++){

let ok=true;

for(let r=0;r<5;r++){

if(!mark[r*5+c]) ok=false;

}

if(ok)return true;

}



// diagonal

let ok=true;

for(let i=0;i<5;i++){

if(!mark[i*5+i])ok=false;

}

if(ok)return true;


ok=true;

for(let i=0;i<5;i++){

if(!mark[i*5+(4-i)])ok=false;

}

if(ok)return true;



return false;

}





function endGame(){


clearInterval(gameInterval);


gameRunning=false;


io.emit("gameEnd");


setTimeout(()=>{


io.emit("newGame");


create600Cards();


pickedCards.clear();


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


let card=cards.find(
c=>c.id===data.cardId
);



if(!card)return;



if(!pickedCards.has(socket.id)){

pickedCards.set(socket.id,[]);

}



let list=pickedCards.get(socket.id);



if(!list.includes(card.id)){

list.push(card.id);

}



socket.emit("cardSelected",card);


});





socket.on("disconnect",()=>{

pickedCards.delete(socket.id);

});


});



startCountdown();


}



module.exports={init};