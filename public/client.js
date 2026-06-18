const socket = io();

const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");

let selectedCard = null;
let called = [];

let soundOn = false;


// sound enable button
let soundButton = document.createElement("button");

soundButton.innerHTML = "🔊 ENABLE SOUND";

soundButton.style.position="fixed";
soundButton.style.top="10px";
soundButton.style.right="10px";
soundButton.style.zIndex="99999";

document.body.appendChild(soundButton);



soundButton.onclick = async function(){

try{

let audio = new Audio("/voices/1.mp3");

audio.volume=0.1;

await audio.play();

audio.pause();

soundOn=true;

soundButton.innerHTML="🔊 SOUND ENABLED";

console.log("Sound enabled");


}catch(e){

console.log("Sound error:",e);

}


};






function playNumberVoice(number){


if(!soundOn){

console.log("Sound not enabled");

return;

}



let audio = new Audio();


audio.src =
window.location.origin +
"/voices/" +
number +
".mp3";


audio.volume=1;


audio.load();


audio.play()
.then(()=>{

console.log("Playing:",number);

})
.catch(err=>{

console.log("Play failed:",err);

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


let cls="";


if(called.includes(n)){

cls="marked";

}


if(n==="FREE"){

cls="free";

}



html+=`

<td class="${cls}">
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


box.innerHTML=
"<h3>Cartela "+card.id+"</h3>";



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


let h=document.createElement("h2");

h.innerHTML=
"YOUR CARTELA "+selectedCard.id;


mycard.appendChild(h);



let area=document.createElement("div");


drawCard(selectedCard,area);


mycard.appendChild(area);


}








socket.on("number",(data)=>{


called=data.called;


last.innerHTML=data.number;


// keep green marking

showMyCard();


// play voice

playNumberVoice(data.number);



});








socket.on("gameStart",()=>{


called=[];


showMyCard();


});