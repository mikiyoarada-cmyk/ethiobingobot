const { Server } = require("socket.io");

let io;

let cards = [];
let calledNumbers = [];
let pool = [];

let selectedCards = new Map();

let countdownTimer;
let gameTimer;

let waitingStarted = false;
let gameStarted = false;



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







function totalPicked(){


let total=0;


selectedCards.forEach(list=>{

total += list.length;

});


return total;

}







function start30Countdown(){


if(waitingStarted || gameStarted)return;


waitingStarted=true;


let time=30;


countdownTimer=setInterval(()=>{


io.emit("countdown",{
countdown:time
});


time--;



if(time<0){


clearInterval(countdownTimer);


if(totalPicked()>=2){

startGame();

}else{

waitingStarted=false;

start30Countdown();

}


}



},1000);



}









function startGame(){


if(gameStarted)return;


gameStarted=true;


waitingStarted=false;



pool=[];


for(let i=1;i<=75;i++){

pool.push(i);

}



calledNumbers=[];



io.emit("gameStart");



gameTimer=setInterval(()=>{


let index=Math.floor(
Math.random()*pool.length
);



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


gameStarted=false;


io.emit("gameEnd");


setTimeout(()=>{


create600Cards();


selectedCards.clear();


io.emit("cardsList",cards);


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



if(!card)return;



if(!selectedCards.has(socket.id)){

selectedCards.set(socket.id,[]);

}



let userCards=selectedCards.get(socket.id);



if(!userCards.includes(card.id)){

userCards.push(card.id);

}



socket.emit("cardSelected",card);



console.log(
"Total picked:",
totalPicked()
);




if(totalPicked()>=2 && !gameStarted){

start30Countdown();

}



});





socket.on("disconnect",()=>{


selectedCards.delete(socket.id);


});




});



}



module.exports={init};