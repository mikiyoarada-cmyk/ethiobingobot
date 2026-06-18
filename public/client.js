const socket = io();

const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");


let userId = Math.floor(Math.random()*999999);


socket.on("countdown",(data)=>{
countdown.innerHTML="Game starts in "+data.countdown+" seconds";
});


socket.on("cardsList",(cards)=>{

cartelas.innerHTML="";

cards.forEach(card=>{

let div=document.createElement("div");

div.className="cartela";

div.innerHTML="Cartela "+card.id;

div.onclick=()=>{

socket.emit("chooseCard",{
userId:userId,
cardId:card.id
});

};

cartelas.appendChild(div);

});

});


socket.on("cardSelected",(card)=>{

mycard.innerHTML="";

card.numbers.forEach(n=>{

let span=document.createElement("span");

span.className="num";

span.innerHTML=n;

mycard.appendChild(span);

});

});


socket.on("number",(data)=>{

last.innerHTML=data.number;

});