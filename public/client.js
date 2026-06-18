const socket = io();


const cartelas=document.getElementById("cartelas");
const mycard=document.getElementById("mycard");
const last=document.getElementById("last");
const countdown=document.getElementById("countdown");


let userId=Math.floor(Math.random()*999999);



socket.on("countdown",(data)=>{

countdown.innerHTML=
"Game starts in "+data.countdown+" seconds";

});



function showCard(card,element){


let html="";


html += "<div class='bingo'>";


["B","I","N","G","O"].forEach(x=>{

html+=
"<div class='cell letter'>"+x+"</div>";

});



card.numbers.forEach(n=>{

html+=
"<div class='cell'>"+n+"</div>";

});


html+="</div>";


element.innerHTML=html;

}




socket.on("cardsList",(cards)=>{


cartelas.innerHTML="";


cards.forEach(card=>{


let box=document.createElement("div");

box.className="cartela";


box.innerHTML=
"<div class='title'>Cartela "+card.id+"</div>";



let temp=document.createElement("div");

showCard(card,temp);


box.innerHTML+=temp.innerHTML;



box.onclick=()=>{


socket.emit(
"chooseCard",
{
userId:userId,
cardId:card.id
}
);


};



cartelas.appendChild(box);


});


});




socket.on("cardSelected",(card)=>{


mycard.innerHTML=
"<h3>Selected Cartela "+card.id+"</h3>";


showCard(card,mycard);


});




socket.on("number",(data)=>{

last.innerHTML=data.number;

});