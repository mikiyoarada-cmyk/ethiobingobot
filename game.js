const { Server } = require("socket.io");

let io;

let cards=[];
let calledNumbers=[];
let pool=[];

let timer=30;

let countInterval;
let gameInterval;

let gameRunning=false;



function createCard(id){


let B=[];
let I=[];
let N=[];
let G=[];
let O=[];


function make(min,max,array){

while(array.length<5){

let n=Math.floor(Math.random()*(max-min+1))+min;

if(!array.includes(n)){

array.push(n);

}

}

}



make(1,15,B);
make(16,30,I);
make(31,45,N);
make(46,60,G);
make(61,75,O);


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


io.emit("clearGame");


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




let index=Math.floor(
Math.random()*pool.length
);



let number=pool.splice(index,1)[0];



calledNumbers.push(number);



io.emit("number",{

number:number,

called:calledNumbers

});



},3000);



}









function endGame(){


clearInterval(gameInterval);


gameRunning=false;


io.emit("gameEnd");


setTimeout(()=>{


calledNumbers=[];


create600Cards();


io.emit("newCards",cards);



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



if(card){

socket.emit("cardSelected",card);

}


});



});



startCountdown();



}





module.exports={init};