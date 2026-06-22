const socket = io();

const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");

let selectedCard = null;
let called = [];

let voiceReady = false;


// ENABLE VOICE BUTTON
let soundButton = document.createElement("button");

soundButton.innerHTML = "🔊 ENABLE VOICE";

soundButton.style.position="fixed";
soundButton.style.top="10px";
soundButton.style.right="10px";
soundButton.style.zIndex="9999";

document.body.appendChild(soundButton);



soundButton.onclick=function(){

voiceReady=true;

soundButton.innerHTML="✅ VOICE ON";

let test=new Audio("/voices/B1.mp3");

test.volume=0.01;

test.play()
.catch(e=>console.log(e));


};





// GET BINGO VOICE NAME

function getVoiceFile(number){


if(number>=1 && number<=15){

return "B"+number+".mp3";

}


if(number>=16 && number<=30){

return "I"+number+".mp3";

}


if(number>=31 && number<=45){

return "N"+number+".mp3";

}


if(number>=46 && number<=60){

return "G"+number+".mp3";

}


if(number>=61 && number<=75){

return "O"+number+".mp3";

}


}






function playVoice(number){


if(!voiceReady){

return;

}


let file=getVoiceFile(number);


let audio=new Audio(
"/voices/"+file
);


audio.volume=1;


audio.play()
.then(()=>{

console.log("Playing",file);

})
.catch(err=>{

console.log("voice error",err);

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


let number=card.numbers[i+j];


let style="";


if(called.includes(number)){

style="background:green;color:white;font-weight:bold;";

}



html+=`

<td style="${style}">
${number}
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


socket.emit("chooseCard",{

cardId:card.id

});


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
"SELECTED CARTELA "+selectedCard.id;


mycard.appendChild(title);



let area=document.createElement("div");


drawCard(selectedCard,area);


mycard.appendChild(area);


}








socket.on("number",(data)=>{


called.push(data.number);


last.innerHTML=data.number;


// mark selected cartela

showMyCard();


// play matching BINGO voice

playVoice(data.number);



});








socket.on("gameStart",()=>{


called=[];


showMyCard();


});