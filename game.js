const { Server } = require("socket.io");

let io;

let cards = [];
let calledNumbers = [];
let timer;


function random(min,max){
    return Math.floor(Math.random()*(max-min+1))+min;
}


function makeNumbers(min,max){

    let a=[];

    while(a.length < 5){

        let n=random(min,max);

        if(!a.includes(n)){
            a.push(n);
        }

    }

    return a;

}



function createCard(id){

let B=makeNumbers(1,15);
let I=makeNumbers(16,30);
let N=makeNumbers(31,45);
let G=makeNumbers(46,60);
let O=makeNumbers(61,75);


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



function createCards(){

cards=[];

for(let i=1;i<=600;i++){

cards.push(createCard(i));

}

}





function startCountdown(){

let c=30;


let x=setInterval(()=>{


io.emit("countdown",{countdown:c});


c--;


if(c<0){

clearInterval(x);

startGame();

}


},1000);


}







function startGame(){


calledNumbers=[];


io.emit("gameStart");



timer=setInterval(()=>{


let n;


do{

n=random(1,75);

}
while(calledNumbers.includes(n));



calledNumbers.push(n);



io.emit("number",{

number:n,

called:calledNumbers

});



},2000);



}








function init(server){


io=new Server(server,{
cors:{
origin:"*"
}
});


createCards();



io.on("connection",(socket)=>{


socket.emit(
"cardsList",
cards
);



socket.on("chooseCard",(data)=>{


let card=cards.find(
c=>c.id==data.cardId
);


if(card){


socket.emit(
"selected",
{
card:card,
called:calledNumbers
}
);


}


});




});



startCountdown();


}



module.exports={init};