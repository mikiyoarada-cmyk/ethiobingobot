const { Server } = require("socket.io");


let io;

let cards = [];

let calledNumbers = [];

let gameTimer;



function random(min,max){

return Math.floor(Math.random()*(max-min+1))+min;

}




function makeColumn(min,max){

let arr=[];


while(arr.length<5){

let n=random(min,max);

if(!arr.includes(n)){

arr.push(n);

}

}

return arr;

}




function createCard(id){


let B=makeColumn(1,15);

let I=makeColumn(16,30);

let N=makeColumn(31,45);

let G=makeColumn(46,60);

let O=makeColumn(61,75);



return {

id:id,

numbers:[

B[0],I[0],N[0],G[0],O[0],
B[1],I[1],N[1],G[1],O[1],
B[2],I[2],"FREE",G[2],O[2],
B[3],I[3],N[3],G[3],O[3],
B[4],I[4],N[4],G[4],O[4]

]

};


}





function create600Cards(){


cards=[];


for(let i=1;i<=600;i++){

cards.push(createCard(i));

}


}






function startGame(){


calledNumbers=[];


io.emit(
"gameStart"
);



gameTimer=setInterval(()=>{


if(calledNumbers.length>=75){

clearInterval(gameTimer);

return;

}



let number;


do{

number=random(1,75);

}
while(calledNumbers.includes(number));



calledNumbers.push(number);



io.emit(
"number",
{
number:number,
called:calledNumbers
}
);



},2000);



}








function startCountdown(){


let count=30;



let timer=setInterval(()=>{


io.emit(
"countdown",
{
countdown:count
}
);



count--;



if(count<0){

clearInterval(timer);

startGame();

}



},1000);


}






function init(server){


io=new Server(server,{
cors:{
origin:"*"
}
});



create600Cards();



io.on("connection",(socket)=>{



socket.emit(
"cardsList",
cards
);





socket.on("chooseCard",(data)=>{



let card=cards.find(
x=>x.id==data.cardId
);



if(card){


socket.emit(
"cardSelected",
{
...card,
called:calledNumbers
}
);



}



});





});



startCountdown();



}





module.exports={init};