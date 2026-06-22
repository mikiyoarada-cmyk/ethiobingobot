const { Server } = require("socket.io");

let io;

let cards=[];
let calledNumbers=[];
let pool=[];

let players=new Map();

let countdownTimer;
let gameTimer;

let started=false;



function makeNumbers(min,max){

let a=[];

while(a.length<5){

let n=Math.floor(Math.random()*(max-min+1))+min;

if(!a.includes(n)) a.push(n);

}

return a;

}



function createCard(id){

let B=makeNumbers(1,15);
let I=makeNumbers(16,30);
let N=makeNumbers(31,45);
let G=makeNumbers(46,60);
let O=makeNumbers(61,75);


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



function createCards(){

cards=[];

for(let i=1;i<=600;i++){

cards.push(createCard(i));

}

}




function startWaiting(){


clearInterval(countdownTimer);


let t=30;


countdownTimer=setInterval(()=>{


io.emit("countdown",{countdown:t});


t--;


if(t<0){

clearInterval(countdownTimer);


if(totalPicked()>=2){

startGame();

}else{

startWaiting();

}


}


},1000);



}




function totalPicked(){

let total=0;


players.forEach(x=>{

total+=x.length;

});


return total;

}





function startGame(){


if(started)return;


started=true;


pool=[];


for(let i=1;i<=75;i++){

pool.push(i);

}


calledNumbers=[];


io.emit("gameStart");



gameTimer=setInterval(()=>{


let index=Math.floor(Math.random()*pool.length);


let number=pool.splice(index,1)[0];


calledNumbers.push(number);



io.emit("number",{

number:number,

called:calledNumbers

});



if(pool.length===0){

endGame();

}


},2000);



}





function endGame(){


clearInterval(gameTimer);


started=false;


io.emit("gameEnd");


setTimeout(()=>{

createCards();

players.clear();

startWaiting();


},5000);


}







function init(server){


io=new Server(server);


createCards();



io.on("connection",(socket)=>{



socket.emit("cardsList",cards);



socket.on("chooseCard",(data)=>{


let card=cards.find(
c=>c.id===data.cardId
);


if(!players.has(socket.id)){

players.set(socket.id,[]);

}


let list=players.get(socket.id);


if(!list.includes(card.id)){

list.push(card.id);

}


socket.emit("cardSelected",card);



});



socket.on("disconnect",()=>{

players.delete(socket.id);

});



});



startWaiting();



}



module.exports={init};