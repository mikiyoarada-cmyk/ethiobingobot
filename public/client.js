const socket = io();

const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");


let userId = Math.floor(Math.random() * 999999);

let selectedCard = null;

let calledNumbers = [];



socket.on("countdown",(data)=>{

countdown.innerHTML =
"Game starts in: " + data.countdown + " seconds";

});



function drawCard(card, element){


let html = `

<table>

<tr>
<th>B</th>
<th>I</th>
<th>N</th>
<th>G</th>
<th>O</th>
</tr>

`;



for(let row=0; row<5; row++){


html += "<tr>";



for(let col=0; col<5; col++){


let number = card.numbers[row*5+col];


let style="";


if(calledNumbers.includes(number)){
style="marked";
}



if(number==="FREE"){
style="free";
}



html += `

<td class="${style}">
${number}
</td>

`;


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



let area=document.createElement("div");


drawCard(card,area);


box.appendChild(area);




box.onclick=()=>{


selectedCard=card;



socket.emit(
"chooseCard",
{
userId:userId,
cardId:card.id
}
);



showMyCard();


};



cartelas.appendChild(box);



});


});









socket.on("cardSelected",(card)=>{


selectedCard=card;


showMyCard();



});







function showMyCard(){


if(!selectedCard)return;



mycard.innerHTML="";


let title=document.createElement("h2");


title.innerHTML=
"Your Cartela "+selectedCard.id;



mycard.appendChild(title);



let area=document.createElement("div");


drawCard(selectedCard,area);


mycard.appendChild(area);



}









socket.on("number",(data)=>{


let number=data.number;



calledNumbers.push(number);



last.innerHTML=number;





// PLAY VOICE FILE

let audio = document.createElement("audio");


audio.src =
"/voices/"+number+".mp3";


audio.autoplay=true;


audio.volume=1;


document.body.appendChild(audio);



audio.play().catch(()=>{

console.log("Click page once to allow sound");

});





// refresh selected cartela marks

showMyCard();



});









socket.on("gameStart",()=>{


calledNumbers=[];


showMyCard();



});