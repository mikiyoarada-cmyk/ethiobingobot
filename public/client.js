const socket = io();

const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");
const calledBox = document.getElementById("calledNumbers");

let selectedCards = [];
let called = [];

let voiceReady = false;


// SOUND BUTTON

const soundButton=document.getElementById("enableSound");


soundButton.onclick=()=>{

voiceReady=true;

soundButton.innerHTML="✅ SOUND ENABLED";


let test=new Audio("/voices/B1.mp3");

test.volume=0.5;

test.play()
.catch(e=>console.log(e));

};




// GET VOICE NAME

function getVoiceFile(number){


if(number>=1 && number<=15)
return "B"+number+".mp3";


if(number>=16 && number<=30)
return "I"+number+".mp3";


if(number>=31 && number<=45)
return "N"+number+".mp3";


if(number>=46 && number<=60)
return "G"+number+".mp3";


if(number>=61 && number<=75)
return "O"+number+".mp3";


}




function playVoice(number){


if(!voiceReady)return;


let audio=new Audio(
"/voices/"+getVoiceFile(number)
);


audio.volume=1;


audio.play()
.catch(err=>console.log(err));


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



for(let r=0;r<5;r++){


html+="<tr>";


for(let c=0;c<5;c++){


let number=card.numbers[r*5+c];


let mark="";


if(number==="FREE"){

mark="free";

}

else if(called.includes(number)){

mark="marked";

}



html+=`

<td class="${mark}">
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


if(!selectedCards.includes(card.id)){


selectedCards.push(card.id);


socket.emit("chooseCard",{

cardId:card.id

});


}



};



cartelas.appendChild(box);



});



});







socket.on("cardSelected",(card)=>{


if(!selectedCards.find(c=>c.id===card.id)){

selectedCards.push(card);

}


showMyCards();


});







function showMyCards(){


mycard.innerHTML="";


selectedCards.forEach(card=>{


let title=document.createElement("h2");


title.innerHTML=
"SELECTED CARTELA "+card.id;



mycard.appendChild(title);



let area=document.createElement("div");


drawCard(card,area);


mycard.appendChild(area);



});


}







socket.on("number",(data)=>{


called=data.called;


last.innerHTML=data.number;


calledBox.innerHTML=
called.join(" , ");



playVoice(data.number);



showMyCards();



});






socket.on("calledNumbers",(data)=>{


called=data.called;


calledBox.innerHTML=
called.join(" , ");



});







socket.on("countdown",(data)=>{


countdown.innerHTML=
"Game starts in: "+data.countdown+" seconds";


});







socket.on("gameStart",()=>{


called=[];


last.innerHTML="-";


calledBox.innerHTML="";


showMyCards();


});







socket.on("winner",(data)=>{


alert(
"🎉 GOOD BINGO!\nCartela Number: "+data.cartela
);


document.body.innerHTML+=`

<h1 style="color:yellow">
🎉 GOOD BINGO!
<br>
WINNER CARTELA ${data.cartela}
</h1>

`;

});






socket.on("gameEnd",()=>{


document.body.innerHTML+=`

<h1 style="color:lime">
GAME END
<br>
NEW GAME STARTING SOON
</h1>

`;


});



socket.on("newGame",()=>{


location.reload();


});