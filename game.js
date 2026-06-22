const { Server } = require("socket.io");

let io;

let cards = [];

let calledNumbers = [];

let pool = [];

let timer = 30;

let countInterval;
let gameInterval;



function createCard(id){

let B=[];
let I=[];
let N=[];
let G=[];
let O=[];



while(B.length<5){

let n=Math.floor(Math.random()*15)+1;

if(!B.includes(n)) B.push(n);

}



while(I.length<5){

let n=Math.floor(Math.random()*15)+16;

if(!I.includes(n)) I.push(n);

}



while(N.length<5){

let n=Math.floor(Math.random()*15)+31;

if(!N.includes(n)) N.push(n);

}



while(G.length<5){

let n=Math.floor(Math.random()*15)+46;

if(!G.includes(n)) G.push(n);

}



while(O.length<5){

let n=Math.floor(Math.random()*15)+61;

if(!O.includes(n)) O.push(n);

}



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



let index=Math.floor(
Math.random()*pool.length
);



let number=pool.splice(index,1)[0];



calledNumbers.push(number);



io.emit("number",{

number:number,

called:calledNumbers

});



},2000);



}








function endGame(){


clearInterval(gameInterval);


io.emit("gameEnd");



setTimeout(()=>{


create600Cards();

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



socket.emit("cardSelected",card);



});



});



startCountdown();


}



module.exports={init};