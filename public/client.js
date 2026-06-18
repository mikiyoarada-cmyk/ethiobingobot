const socket = io();

const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");

let selectedCard = null;
let called = [];

let audioUnlocked = false;



// Create invisible audio unlock button
let btn = document.createElement("button");

btn.innerHTML = "🔊 ENABLE SOUND";

btn.style.position="fixed";
btn.style.top="10px";
btn.style.right="10px";
btn.style.zIndex="9999";

document.body.appendChild(btn);



btn.onclick = function(){

let test = new Audio();

test.src="/voices/1.mp3";

test.volume=0;

test.play()
.then(()=>{

audioUnlocked=true;

btn.innerHTML="🔊 SOUND ON";

btn.style.background="green";

})
.catch(()=>{

console.log("audio blocked");

});


};








function playVoice(number){


if(!audioUnlocked){

return;

}


let voice = new Audio(
"/voices/"+number+".mp3"
);


voice.volume=1;


voice.play()
.catch(e=>{

console.log(e);

});


}








function drawCard(card,element){


let html=`

<table>

<tr>
<th>B</th>
<th>I</th>
<th>N</th>
<th>G</th>
<th>O</th>
</tr>

`;



for(let i=0;i<25;i+=5){


html+="<tr>";



for(let j=0;j<5;j++){


let n=card.numbers[i+j];


let color="";


if(called.includes(n)){

color="green";

}


if(n==="FREE"){

color="yellow";

}



html+=`

<td style="background:${color}">
${n}
</td>

`;



}


html+="</tr>";

}


html+="</table>";


element.innerHTML=html;


}









socket.on("cardsList",(cards)=>{


cartelas.innerHTML="";


cards.forEach(card=>{


let box=document.createElement("div");


box.className="cartela";


box.innerHTML="<h3>Cartela "+card.id+"</h3>";



let area=document.createElement("div");


drawCard(card,area);


box.appendChild(area);



box.onclick=()=>{


selectedCard=card;



socket.emit(
"chooseCard",
{
cardId:card.id
}
);


showMyCard();


};



cartelas.appendChild(box);



});


});









socket.on("selected",(data)=>{


selectedCard=data.card;


called=data.called || [];


showMyCard();


});









function showMyCard(){


if(!selectedCard)return;


mycard.innerHTML="";


let title=document.createElement("h2");

title.innerHTML=
"YOUR CARTELA "+selectedCard.id;


mycard.appendChild(title);



let area=document.createElement("div");


drawCard(selectedCard,area);


mycard.appendChild(area);


}









socket.on("number",(data)=>{


called=data.called;


last.innerHTML=data.number;



// update only selected cartela

showMyCard();



// call voice

playVoice(data.number);



});








socket.on("gameStart",()=>{


called=[];


showMyCard();


});