const { Server } = require("socket.io");

let io;

let calledNumbers = [];
let numbersPool = [];

let timer = 30;
let countdownTimer;
let gameTimer;


let cards = [];



function createCard(id){

let nums=[];


while(nums.length<24){

let n=Math.floor(Math.random()*75)+1;

if(!nums.includes(n)){

nums.push(n);

}

}



nums.splice(12,0,"FREE");

return {

id:id,

numbers:nums

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


countdownTimer=setInterval(()=>{


io.emit("countdown",{

countdown:timer

});


timer--;



if(timer<0){


clearInterval(countdownTimer);


startGame();


}


},1000);



}





function startGame(){


numbersPool=[];


for(let i=1;i<=75;i++){

numbersPool.push(i);

}



calledNumbers=[];



io.emit("gameStart");



gameTimer=setInterval(()=>{


if(numbersPool.length===0){

endGame();

return;

}



let index=Math.floor(
Math.random()*numbersPool.length
);



let number=numbersPool.splice(index,1)[0];


calledNumbers.push(number);



io.emit("number",{

number:number,

called:calledNumbers

});



},2000);



}






function endGame(){


clearInterval(gameTimer);


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