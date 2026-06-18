const socket = io();

const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");

let selectedCard = null;
let called = [];

let soundReady = false;


// unlock browser audio
document.addEventListener("click", function(){

    soundReady = true;

}, {once:true});




// create audio folder path
function playVoice(number){

    if(!soundReady) return;


    let audio = new Audio();

    audio.src = "/voices/" + number + ".mp3";

    audio.volume = 1;

    audio.load();


    audio.play()
    .then(()=>{

        console.log("Playing voice:",number);

    })
    .catch(err=>{

        console.log("Voice blocked:",err);

    });

}





function drawCard(card,element){


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



for(let i=0;i<25;i+=5){


html += "<tr>";



for(let j=0;j<5;j++){


let number = card.numbers[i+j];


let cls="";


if(called.includes(number)){

cls="marked";

}


if(number==="FREE"){

cls="free";

}



html += `

<td class="${cls}">
${number}
</td>

`;



}


html += "</tr>";

}



html += "</table>";



element.innerHTML = html;



}









socket.on("countdown",(data)=>{


countdown.innerHTML =
"GAME STARTS IN "+data.countdown+" SECONDS";


});








socket.on("cardsList",(cards)=>{


cartelas.innerHTML="";



cards.forEach(card=>{


let box=document.createElement("div");


box.className="cartela";



let title=document.createElement("h3");

title.innerHTML="Cartela "+card.id;


box.appendChild(title);



let area=document.createElement("div");


drawCard(card,area);


box.appendChild(area);




box.onclick=function(){


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


if(!selectedCard) return;



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



// mark selected cartela
showMyCard();



// play matching voice
playVoice(data.number);



});








socket.on("gameStart",()=>{


called=[];


showMyCard();


});