const socket = io();


const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");


let userId = Math.floor(Math.random()*999999);



socket.on("countdown",(data)=>{

countdown.innerHTML =
"Game starts in: " + data.countdown + " seconds";

});



function drawCard(card, element){


let html = `

<table border="1" cellspacing="0" cellpadding="5">

<tr>
<th>B</th>
<th>I</th>
<th>N</th>
<th>G</th>
<th>O</th>
</tr>

`;



for(let i=0;i<25;i+=5){

html += "<tr>";

for(let j=0;j<5;j++){

let value = card.numbers[i+j];


if(value==="FREE"){

html += "<td>FREE</td>";

}else{

html += "<td>"+value+"</td>";

}

}

html += "</tr>";

}


html += "</table>";


element.innerHTML = html;


}





socket.on("cardsList",(cards)=>{


cartelas.innerHTML="";


cards.forEach((card)=>{


let box=document.createElement("div");


box.className="cartela";


let title=document.createElement("h3");

title.innerHTML="Cartela "+card.id;


box.appendChild(title);



let table=document.createElement("div");

drawCard(card,table);


box.appendChild(table);



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


mycard.innerHTML="";


let title=document.createElement("h2");

title.innerHTML="Your Cartela "+card.id;


mycard.appendChild(title);


drawCard(card,mycard);



});





socket.on("number",(data)=>{

last.innerHTML=data.number;

});