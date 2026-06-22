const socket = io();

const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");

let selectedCard = null;
let called = [];

let audioContext;
let soundEnabled = false;


// ENABLE SOUND BUTTON
const soundBtn = document.createElement("button");

soundBtn.innerHTML = "🔊 ENABLE VOICE";

soundBtn.style.position = "fixed";
soundBtn.style.top = "10px";
soundBtn.style.right = "10px";
soundBtn.style.zIndex = "9999";

document.body.appendChild(soundBtn);



soundBtn.onclick = async () => {

    try {

        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        await audioContext.resume();

        soundEnabled = true;

        soundBtn.innerHTML = "✅ VOICE ON";

        soundBtn.style.background = "green";


    } catch(e){

        console.log(e);

    }

};




// PLAY MP3 VOICE
function playVoice(number){

    if(!soundEnabled){
        return;
    }


    let audio = new Audio();

    audio.src = "/voices/" + number + ".mp3";

    audio.preload = "auto";

    audio.volume = 1;


    audio.play()
    .then(()=>{

        console.log("VOICE PLAY:",number);

    })
    .catch(err=>{

        console.log("VOICE ERROR:",err);

    });

}







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



for(let i=0;i<25;i+=5){


html += "<tr>";



for(let j=0;j<5;j++){


let number = card.numbers[i+j];

let style="";


if(called.includes(number)){

style="background:green;color:white";

}



html += `

<td style="${style}">
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


cards.forEach(card=>{


let box=document.createElement("div");

box.className="cartela";


box.innerHTML =
"<h3>Cartela "+card.id+"</h3>";



let area=document.createElement("div");


drawCard(card,area);


box.appendChild(area);



box.onclick=()=>{


selectedCard=card;


socket.emit("chooseCard",{

userId:Math.floor(Math.random()*999999),

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


title.innerHTML="YOUR SELECTED CARTELA";


mycard.appendChild(title);



let area=document.createElement("div");


drawCard(selectedCard,area);


mycard.appendChild(area);


}







socket.on("number",(data)=>{


called.push(data.number);


last.innerHTML=data.number;



// mark only selected cartela

showMyCard();



// voice

playVoice(data.number);



});







socket.on("gameStart",()=>{


called=[];


showMyCard();


});